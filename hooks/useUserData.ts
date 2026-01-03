import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loadUserData, saveUserData, UserData } from '../services/storage';
import { Team, Lineup } from '../types';

export function useUserData() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [lineups, setLineups] = useState<Lineup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs to always have current values
    const teamsRef = useRef<Team[]>(teams);
    const lineupsRef = useRef<Lineup[]>(lineups);

    // Keep refs in sync
    useEffect(() => { teamsRef.current = teams; }, [teams]);
    useEffect(() => { lineupsRef.current = lineups; }, [lineups]);

    // Debounce timer ref
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load data when user logs in
    useEffect(() => {
        if (!user) {
            setTeams([]);
            setLineups([]);
            setIsLoading(false);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await loadUserData(user.uid);
                setTeams(data.teams);
                setLineups(data.lineups);
                teamsRef.current = data.teams;
                lineupsRef.current = data.lineups;
                console.log('useUserData: Loaded', data.teams.length, 'teams,', data.lineups.length, 'lineups');
            } catch (err: any) {
                console.error('useUserData: Load error', err);
                setError(err.message || 'Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [user]);

    // Immediate save function
    const doSave = useCallback(async () => {
        if (!user) return;

        const dataToSave = {
            teams: teamsRef.current,
            lineups: lineupsRef.current,
            lastUpdated: Date.now()
        };

        console.log('useUserData: Saving...', {
            teams: dataToSave.teams.length,
            lineups: dataToSave.lineups.length
        });

        setIsSaving(true);
        try {
            await saveUserData(user.uid, dataToSave);
            console.log('useUserData: Save success');
            setError(null);
        } catch (err: any) {
            console.error('useUserData: Save error', err);
            setError(err.message || 'Failed to save data');
        } finally {
            setIsSaving(false);
        }
    }, [user]);

    // Debounced save - schedules a save after changes settle
    const scheduleSave = useCallback((immediate = false) => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        if (immediate) {
            doSave();
        } else {
            saveTimerRef.current = setTimeout(doSave, 500); // Reduced from 1000ms
        }
    }, [doSave]);

    // Update teams and trigger save (immediate for create/delete)
    const updateTeams = useCallback((newTeams: Team[]) => {
        console.log('useUserData: updateTeams called with', newTeams.length, 'teams');
        const wasEmpty = teamsRef.current.length === 0;
        const isCreatingOrDeleting = newTeams.length !== teamsRef.current.length;
        setTeams(newTeams);
        teamsRef.current = newTeams;
        // Immediate save for first team or when adding/removing teams
        scheduleSave(wasEmpty || isCreatingOrDeleting);
    }, [scheduleSave]);

    // Update lineups and trigger save (immediate for create/delete)
    const updateLineups = useCallback((newLineups: Lineup[]) => {
        console.log('useUserData: updateLineups called with', newLineups.length, 'lineups');
        const wasEmpty = lineupsRef.current.length === 0;
        const isCreatingOrDeleting = newLineups.length !== lineupsRef.current.length;
        setLineups(newLineups);
        lineupsRef.current = newLineups;
        // Immediate save for first lineup or when adding/removing lineups
        scheduleSave(wasEmpty || isCreatingOrDeleting);
    }, [scheduleSave]);

    // Force save immediately (for critical operations)
    const forceSave = useCallback(async () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        await doSave();
    }, [doSave]);

    // Cleanup on unmount - force save pending changes
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                // Force immediate save on unmount
                doSave();
            }
        };
    }, [doSave]);

    // Save before page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                // Sync save before page closes
                const data = {
                    teams: teamsRef.current,
                    lineups: lineupsRef.current,
                    lastUpdated: Date.now()
                };
                // Use sendBeacon for reliable delivery on page close
                if (user && navigator.sendBeacon) {
                    // Can't use sendBeacon with Firestore directly, but log the attempt
                    console.log('useUserData: Page unloading with pending save');
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user]);

    return {
        user,
        teams,
        lineups,
        setTeams: updateTeams,
        setLineups: updateLineups,
        isLoading,
        isSaving,
        error,
        forceSave
    };
}
