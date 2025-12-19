import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveData, loadData, STORAGE_KEYS } from '../services/storage';
import { Player, SavedRotationData } from '../types';

export function useCloudData() {
    const { user, loading: authLoading } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);

    // Helper to save roster
    const saveRoster = async (roster: Player[]) => {
        await saveData(user?.uid, STORAGE_KEYS.ROSTER, roster);
    };

    // Helper to save rotations
    const saveRotations = async (rotations: Record<string, SavedRotationData>) => {
        await saveData(user?.uid, STORAGE_KEYS.ROTATIONS, rotations);
    };

    /**
     * Loads initial data. 
     * Returns the data found (preference cloud -> local) 
     * or null if nothing found.
     */
    const loadInitialData = async () => {
        setIsSyncing(true);
        const roster = await loadData(user?.uid, STORAGE_KEYS.ROSTER);
        const rotations = await loadData(user?.uid, STORAGE_KEYS.ROTATIONS);
        setIsSyncing(false);
        return { roster, rotations };
    };

    return {
        saveRoster,
        saveRotations,
        loadInitialData,
        isSyncing,
        user
    };
}
