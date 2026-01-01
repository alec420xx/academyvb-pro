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
    if (userId) {
        try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, { [key]: data }, { merge: true });
        } catch (e) {
            throw e;
        }
    }

    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        // Silently fail for localStorage
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
                    localStorage.setItem(key, JSON.stringify(data[key]));
                    callback(data[key]);
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        }, (error) => {
            console.error(`Firebase subscription error for ${key}:`, error.message);
        });
        return unsubscribe;
    } catch (e) {
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
            callback(items);
        }, (error) => {
            console.error(`Firebase collection subscription error for ${collectionName}:`, error.message);
        });
        return unsubscribe;
    } catch (e) {
        return () => { };
    }
};

// --- ATOMIC SAVE OPERATIONS (V2 Architecture) ---

export const saveTeam = async (userId: string | undefined | null, team: any) => {
    if (!userId) {
        console.warn('saveTeam: No user ID, saving to local only');
        return;
    }
    if (!team || !team.id) {
        console.error('saveTeam: Invalid team data');
        return;
    }
    const docRef = doc(db, 'users', userId, 'teams', team.id);
    await setDoc(docRef, team);
};

export const deleteTeam = async (userId: string | undefined | null, teamId: string) => {
    if (!userId) return;
    const docRef = doc(db, 'users', userId, 'teams', teamId);
    await deleteDoc(docRef);
};

export const saveLineup = async (userId: string | undefined | null, lineup: any) => {
    if (!userId) throw new Error("No user ID");
    if (!lineup || !lineup.id) throw new Error("Invalid lineup");
    const docRef = doc(db, 'users', userId, 'lineups', lineup.id);
    await setDoc(docRef, lineup);
};

export const deleteLineup = async (userId: string | undefined | null, lineupId: string) => {
    if (!userId) return;
    const docRef = doc(db, 'users', userId, 'lineups', lineupId);
    await deleteDoc(docRef);
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

        if (data.migration_v2_complete) return;

        // Migrate Teams
        if (data[STORAGE_KEYS.TEAMS] && Array.isArray(data[STORAGE_KEYS.TEAMS])) {
            for (const team of data[STORAGE_KEYS.TEAMS]) {
                await saveTeam(userId, team);
            }
        }

        // Migrate Lineups
        if (data[STORAGE_KEYS.LINEUPS] && Array.isArray(data[STORAGE_KEYS.LINEUPS])) {
            for (const lineup of data[STORAGE_KEYS.LINEUPS]) {
                await saveLineup(userId, lineup);
            }
        }

        // Mark Complete
        await setDoc(userRef, { migration_v2_complete: true }, { merge: true });
    } catch (e) {
        // Silently fail - will retry on next login
    }
};
