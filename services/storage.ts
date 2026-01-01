import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, SavedRotationData } from '../types';

export const STORAGE_KEYS = {
    ROSTER: 'academyvb_roster_v2',
    ROTATIONS: 'academyvb_rotations_v2',
    TEAMS: 'academyvb_teams_v1',
    LINEUPS: 'academyvb_lineups_v1',
    SETTINGS: 'academyvb_settings_v1',
    // New Collection Names
    COLLECTION_TEAMS: 'teams',
    COLLECTION_LINEUPS: 'lineups'
};

/**
 * Saves data to either Firestore or LocalStorage depending on auth state.
 */
export const saveData = async (
    userId: string | undefined | null,
    key: string,
    data: any
) => {
    // If we have a user, save to Cloud
    if (userId) {
        try {
            const userRef = doc(db, 'users', userId);
            // We use merge: true so we don't overwrite other fields (like profile info)
            await setDoc(userRef, { [key]: data }, { merge: true });
            console.log(`[Cloud] Saved ${key}`);
        } catch (e) {
            console.error("Error saving to cloud", e);
            throw e; // RETHROW so UI knows it failed
        }
    }

    // ALWAYS save to LocalStorage as a backup/cache for offline use
    // and for immediate UI responsiveness.
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to local storage", e);
    }
};

/**
 * Loads data. Preference: Cloud (if logged in) -> LocalStorage (fallback).
 */
export const loadData = async (
    userId: string | undefined | null,
    key: string
) => {
    // For logged-in users, we use real-time subscriptions instead of getDoc
    // This avoids "client is offline" errors during initial Firebase connection
    // Just return local storage data - subscriptions will update with cloud data

    // Fallback to LocalStorage
    const local = localStorage.getItem(key);
    if (local) {
        try {
            return JSON.parse(local);
        } catch (e) {
            return null;
        }
    }
    return null;
};

/**
 * Subscribes to real-time updates from Cloud.
 */
export const subscribeToData = (
    userId: string | undefined | null,
    key: string,
    callback: (data: any) => void
) => {
    if (!userId) return () => { };

    try {
        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data && data[key]) {
                    console.log(`[Cloud] Received Update for ${key}`);
                    // Update local storage to match cloud
                    localStorage.setItem(key, JSON.stringify(data[key]));
                    callback(data[key]);
                } else {
                    // Key missing? possibly fire with null so the app knows it's empty
                    callback(null);
                }
            } else {
                // Doc missing?
                callback(null);
            }
        }, (error) => {
            console.error("Error subscribing to cloud data", error);
        });
        return unsubscribe;
    } catch (e) {
        console.error("Error setting up subscription", e);
        return () => { };
    }
};
/**
 * Subscribes to a sub-collection (e.g. users/{uid}/teams)
 */
export const subscribeToCollection = (
    userId: string | undefined | null,
    collectionName: string,
    callback: (data: any[]) => void
) => {
    if (!userId) return () => { };

    try {
        const colRef = collection(db, 'users', userId, collectionName);
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            const items: any[] = [];
            snapshot.forEach((doc) => {
                items.push(doc.data());
            });
            console.log(`[Cloud] Received ${items.length} items from ${collectionName}`);
            callback(items);
        }, (error) => {
            console.error(`Error subscribing to ${collectionName}`, error);
        });
        return unsubscribe;
    } catch (e) {
        console.error("Error setting up collection subscription", e);
        return () => { };
    }
};

// --- ATOMIC SAVE OPERATIONS (V2 Architecture) ---

export const saveTeam = async (userId: string | undefined | null, team: any) => {
    if (!userId) return; // TODO: Local fallback?
    try {
        const docRef = doc(db, 'users', userId, 'teams', team.id);
        await setDoc(docRef, team);
        console.log(`[Cloud] Saved Team ${team.name}`);
    } catch (e) {
        console.error("Error saving team", e);
        throw e;
    }
};

export const deleteTeam = async (userId: string | undefined | null, teamId: string) => {
    if (!userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'teams', teamId);
        await deleteDoc(docRef);
        console.log(`[Cloud] Deleted Team ${teamId}`);
    } catch (e) {
        console.error("Error deleting team", e);
        throw e;
    }
};

export const saveLineup = async (userId: string | undefined | null, lineup: any) => {
    if (!userId) {
        console.error("[Cloud] Cannot save lineup - no user ID");
        throw new Error("No user ID provided for saveLineup");
    }
    if (!lineup || !lineup.id) {
        console.error("[Cloud] Cannot save lineup - invalid lineup data", lineup);
        throw new Error("Invalid lineup data");
    }
    try {
        const docRef = doc(db, 'users', userId, 'lineups', lineup.id);
        await setDoc(docRef, lineup);
        console.log(`[Cloud] Saved Lineup ${lineup.name} (${lineup.id})`);
    } catch (e) {
        console.error("Error saving lineup", e);
        throw e;
    }
};

export const deleteLineup = async (userId: string | undefined | null, lineupId: string) => {
    if (!userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'lineups', lineupId);
        await deleteDoc(docRef);
        console.log(`[Cloud] Deleted Lineup ${lineupId}`);
    } catch (e) {
        console.error("Error deleting lineup", e);
        throw e;
    }
};

// --- MIGRATION LOGIC ---

export const migrateCloudData = async (userId: string) => {
    // Migration uses getDoc which can fail if Firebase is still connecting
    // This is non-critical - if it fails, we just skip migration silently
    try {
        const userRef = doc(db, 'users', userId);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) return;
        const data = snapshot.data();

        // Check if v2 migration flag exists
        if (data.migration_v2_complete) {
            return;
        }

        console.log("[Migration] Migrating v1 data...");

        // 1. Migrate Teams
        if (data[STORAGE_KEYS.TEAMS] && Array.isArray(data[STORAGE_KEYS.TEAMS])) {
            const teams = data[STORAGE_KEYS.TEAMS];
            for (const team of teams) {
                await saveTeam(userId, team);
            }
        }

        // 2. Migrate Lineups
        if (data[STORAGE_KEYS.LINEUPS] && Array.isArray(data[STORAGE_KEYS.LINEUPS])) {
            const lineups = data[STORAGE_KEYS.LINEUPS];
            for (const lineup of lineups) {
                await saveLineup(userId, lineup);
            }
        }

        // 3. Mark Complete
        await setDoc(userRef, { migration_v2_complete: true }, { merge: true });
        console.log("[Migration] Complete.");

    } catch (e: any) {
        // Silently ignore offline errors - migration will retry on next login
        if (!e?.message?.includes('offline')) {
            console.error("[Migration] Error:", e);
        }
    }
};
