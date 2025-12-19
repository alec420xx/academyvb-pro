import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, SavedRotationData } from '../types';

export const STORAGE_KEYS = {
    ROSTER: 'academyvb_roster_v2',
    ROTATIONS: 'academyvb_rotations_v2',
    TEAMS: 'academyvb_teams_v1',
    LINEUPS: 'academyvb_lineups_v1',
    SETTINGS: 'academyvb_settings_v1'
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
            // Fallback? Or just notify? For now, we log.
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
    // If logged in, try to fetch from Cloud first
    if (userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const snapshot = await getDoc(userRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data && data[key]) {
                    console.log(`[Cloud] Loaded ${key}`);
                    // Update local storage to match cloud
                    localStorage.setItem(key, JSON.stringify(data[key]));
                    return data[key];
                }
            }
        } catch (e) {
            console.error("Error loading from cloud", e);
        }
    }

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
