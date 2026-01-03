import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
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
 * Check for and migrate old sub-collection data to new single-document format
 */
const migrateOldData = async (userId: string): Promise<UserData | null> => {
    try {
        console.log('migrateOldData: Checking for old data format...');

        // Check if old teams sub-collection exists
        const teamsRef = collection(db, 'users', userId, 'teams');
        const teamsSnapshot = await getDocs(teamsRef);

        if (teamsSnapshot.empty) {
            console.log('migrateOldData: No old data found');
            return null;
        }

        console.log('migrateOldData: Found old data, migrating...');

        // Get old teams
        const teams: Team[] = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() } as Team);
        });

        // Get old lineups
        const lineupsRef = collection(db, 'users', userId, 'lineups');
        const lineupsSnapshot = await getDocs(lineupsRef);
        const lineups: Lineup[] = [];
        lineupsSnapshot.forEach(doc => {
            lineups.push({ id: doc.id, ...doc.data() } as Lineup);
        });

        console.log('migrateOldData: Migrated', teams.length, 'teams,', lineups.length, 'lineups');

        // Save to new format
        const newData: UserData = {
            teams,
            lineups,
            lastUpdated: Date.now()
        };

        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, newData);

        console.log('migrateOldData: Migration complete');
        return newData;
    } catch (error) {
        console.error('migrateOldData: Error', error);
        return null;
    }
};

/**
 * Load all user data from Firestore with timeout
 */
export const loadUserData = async (userId: string): Promise<UserData> => {
    console.log('loadUserData: Loading for user', userId);

    // Add timeout to prevent hanging if Firebase is slow/offline
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), 15000);
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
            // No new-format data found - check for old data to migrate
            console.log('loadUserData: No new-format data, checking for old data...');
            const migratedData = await migrateOldData(userId);
            if (migratedData) {
                return migratedData;
            }
            console.log('loadUserData: No data found, returning defaults');
            return DEFAULT_USER_DATA;
        }
    } catch (error: any) {
        console.error('loadUserData: Error', error.message);
        // Always throw - don't return defaults on error
        // This prevents the app from showing "create team" and overwriting existing data
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
