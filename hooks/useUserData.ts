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

    // Debounce timer ref
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Track if we have unsaved changes
    const pendingDataRef = useRef<{ teams: Team[], lineups: Lineup[] } | null>(null);

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

    // Save function (debounced)
    const save = useCallback((newTeams: Team[], newLineups: Lineup[]) => {
        if (!user) return;

        // Store pending data
        pendingDataRef.current = { teams: newTeams, lineups: newLineups };

        // Clear existing timer
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        // Set new timer (save after 1 second of no changes)
        saveTimerRef.current = setTimeout(async () => {
            if (!pendingDataRef.current) return;

            setIsSaving(true);
            try {
                await saveUserData(user.uid, {
                    teams: pendingDataRef.current.teams,
                    lineups: pendingDataRef.current.lineups,
                    lastUpdated: Date.now()
                });
                pendingDataRef.current = null;
                setError(null);
            } catch (err: any) {
                console.error('useUserData: Save error', err);
                setError(err.message || 'Failed to save data');
            } finally {
                setIsSaving(false);
            }
        }, 1000);
    }, [user]);

    // Update teams and trigger save
    const updateTeams = useCallback((newTeams: Team[]) => {
        setTeams(newTeams);
        save(newTeams, lineups);
    }, [lineups, save]);

    // Update lineups and trigger save
    const updateLineups = useCallback((newLineups: Lineup[]) => {
        setLineups(newLineups);
        save(teams, newLineups);
    }, [teams, save]);

    // Force save immediately (for critical operations)
    const forceSave = useCallback(async () => {
        if (!user) return;

        // Clear pending timer
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        setIsSaving(true);
        try {
            await saveUserData(user.uid, {
                teams,
                lineups,
                lastUpdated: Date.now()
            });
            pendingDataRef.current = null;
            setError(null);
        } catch (err: any) {
            console.error('useUserData: Force save error', err);
            setError(err.message || 'Failed to save data');
        } finally {
            setIsSaving(false);
        }
    }, [user, teams, lineups]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

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
