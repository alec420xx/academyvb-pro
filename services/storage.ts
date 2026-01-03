import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Team, Lineup } from '../types';

// Simple single-document storage
// All user data is stored in one document: users/{uid}

export interface UserData {
    teams: Team[];
    lineups: Lineup[];
    lastUpdated: number;
}

const DEFAULT_USER_DATA: UserData = {
    teams: [],
    lineups: [],
    lastUpdated: Date.now()
};

/**
 * Load all user data from Firestore with timeout
 */
export const loadUserData = async (userId: string): Promise<UserData> => {
    console.log('loadUserData: Loading for user', userId);

    // Add timeout to prevent hanging if Firebase is slow/offline
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), 10000);
    });

    try {
        const userRef = doc(db, 'users', userId);
        const snapshot = await Promise.race([getDoc(userRef), timeoutPromise]);

        if (snapshot.exists()) {
            const data = snapshot.data() as UserData;
            console.log('loadUserData: Found data', {
                teams: data.teams?.length || 0,
                lineups: data.lineups?.length || 0
            });
            return {
                teams: data.teams || [],
                lineups: data.lineups || [],
                lastUpdated: data.lastUpdated || Date.now()
            };
        } else {
            console.log('loadUserData: No data found, returning defaults');
            return DEFAULT_USER_DATA;
        }
    } catch (error: any) {
        console.error('loadUserData: Error', error.message);
        // If offline or timeout, return empty data so app can still work
        if (error.message?.includes('offline') || error.message?.includes('timeout')) {
            console.log('loadUserData: Returning defaults due to connection issue');
            return DEFAULT_USER_DATA;
        }
        throw error;
    }
};

/**
 * Save all user data to Firestore
 */
export const saveUserData = async (userId: string, data: UserData): Promise<void> => {
    try {
        console.log('saveUserData: Saving for user', userId, {
            teams: data.teams?.length || 0,
            lineups: data.lineups?.length || 0
        });
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...data,
            lastUpdated: Date.now()
        });
        console.log('saveUserData: Success');
    } catch (error: any) {
        console.error('saveUserData: Error', error.message);
        throw error;
    }
};
