import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, Users, Target, BarChart3 } from 'lucide-react';
import { ScoutOpponent, ScoutSet, ScoutPlayer, DotType, PassGrade, CourtDot, PassEvent, AttackEvent, PlayerPosition } from '../../types';
import { generateId, calculateScoutRotationPositions } from '../../utils';
import { OpponentManager } from './OpponentManager';
import { SetManager } from './SetManager';
import { ScoutLineupSheet } from './ScoutLineupSheet';
import { ScoutFullCourt } from './ScoutFullCourt';
import { ScoutToolbar } from './ScoutToolbar';
import { ScoutStats } from './ScoutStats';

interface ScoutPageProps {
    opponents: ScoutOpponent[];
    setOpponents: (opponents: ScoutOpponent[]) => void;
}

export type ScoutMode = 'lineup' | 'dot' | 'pass' | 'attack';

export const ScoutPage: React.FC<ScoutPageProps> = ({ opponents, setOpponents }) => {
    // UI State
    const [showOpponentManager, setShowOpponentManager] = useState(false);
    const [showSetManager, setShowSetManager] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Active selections
    const [currentOpponentId, setCurrentOpponentId] = useState<string | null>(
        opponents.length > 0 ? opponents[0].id : null
    );
    const [currentSetId, setCurrentSetId] = useState<string | null>(null);

    // Scouting mode
    const [scoutMode, setScoutMode] = useState<ScoutMode>('dot');
    const [activeDotType, setActiveDotType] = useState<DotType>('kill');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    // Derived state
    const currentOpponent = useMemo(() =>
        opponents.find(o => o.id === currentOpponentId) || null,
        [opponents, currentOpponentId]
    );

    const currentSet = useMemo(() =>
        currentOpponent?.sets.find(s => s.id === currentSetId) || null,
        [currentOpponent, currentSetId]
    );

    // Auto-select first set when opponent changes
    React.useEffect(() => {
        if (currentOpponent && currentOpponent.sets.length > 0 && !currentSetId) {
            setCurrentSetId(currentOpponent.sets[0].id);
        } else if (currentOpponent && currentOpponent.sets.length === 0) {
            setCurrentSetId(null);
        }
    }, [currentOpponent, currentSetId]);

    // === OPPONENT CRUD ===
    const updateOpponent = useCallback((updated: ScoutOpponent) => {
        setOpponents(opponents.map(o => o.id === updated.id ? { ...updated, updatedAt: Date.now() } : o));
    }, [opponents, setOpponents]);

    const deleteOpponent = useCallback((id: string) => {
        const remaining = opponents.filter(o => o.id !== id);
        setOpponents(remaining);
        if (currentOpponentId === id) {
            setCurrentOpponentId(remaining.length > 0 ? remaining[0].id : null);
            setCurrentSetId(null);
        }
    }, [opponents, setOpponents, currentOpponentId]);

    // === SET CRUD ===
    const createSet = useCallback(() => {
        if (!currentOpponent) return;

        const setNumber = currentOpponent.sets.length + 1;
        const newSet: ScoutSet = {
            id: generateId('set'),
            opponentId: currentOpponent.id,
            date: Date.now(),
            setNumber,
            startingLineup: [],
            currentRotation: 1,
            rotations: {},
            passEvents: [],
            attackEvents: [],
            courtDots: [],
        };

        const updated = {
            ...currentOpponent,
            sets: [...currentOpponent.sets, newSet]
        };
        updateOpponent(updated);
        setCurrentSetId(newSet.id);
    }, [currentOpponent, updateOpponent]);

    const updateCurrentSet = useCallback((updates: Partial<ScoutSet>) => {
        if (!currentOpponent || !currentSet) return;

        const updatedSet = { ...currentSet, ...updates };
        const updated = {
            ...currentOpponent,
            sets: currentOpponent.sets.map(s => s.id === currentSet.id ? updatedSet : s)
        };
        updateOpponent(updated);
    }, [currentOpponent, currentSet, updateOpponent]);

    // === PLAYER CRUD ===
    const addPlayer = useCallback((number: string, name?: string) => {
        if (!currentOpponent) return;

        const newPlayer: ScoutPlayer = {
            id: generateId('sp'),
            number,
            name,
            isWeakPasser: false
        };

        updateOpponent({
            ...currentOpponent,
            players: [...currentOpponent.players, newPlayer]
        });
    }, [currentOpponent, updateOpponent]);

    const toggleWeakPasser = useCallback((playerId: string) => {
        if (!currentOpponent) return;

        updateOpponent({
            ...currentOpponent,
            players: currentOpponent.players.map(p =>
                p.id === playerId ? { ...p, isWeakPasser: !p.isWeakPasser } : p
            )
        });
    }, [currentOpponent, updateOpponent]);

    // === LINEUP & ROTATION ===
    /**
     * Set the starting lineup from the lineup sheet.
     * playerIds are in standard order: zone 1, 6, 5, 4, 3, 2
     * declaredRotation is what rotation the user observed this lineup in
     */
    const setStartingLineup = useCallback((playerIds: string[], declaredRotation: number) => {
        if (!currentSet || playerIds.length !== 6) return;

        // Calculate positions for all 6 rotations based on declared rotation
        const rotations: Record<number, { positions: Record<string, PlayerPosition>; manuallyAdjusted: boolean }> = {};

        for (let rot = 1; rot <= 6; rot++) {
            // Calculate the offset from declared rotation
            // If declared is R3 and we want R1, we need to "reverse rotate" by 2
            const offset = (rot - declaredRotation + 6) % 6;

            // Reorder the lineup based on offset
            const rotatedLineup = playerIds.map((_, idx) => {
                const newIdx = (idx + offset) % 6;
                return playerIds[newIdx];
            });

            const positions = calculateScoutRotationPositions(rotatedLineup, 1);
            rotations[rot] = { positions, manuallyAdjusted: false };
        }

        updateCurrentSet({
            startingLineup: playerIds,
            currentRotation: declaredRotation,
            rotations
        });
    }, [currentSet, updateCurrentSet]);

    const changeRotation = useCallback((newRotation: number) => {
        if (!currentSet || currentSet.startingLineup.length !== 6) return;

        // Check if we have saved positions for this rotation
        const existingRotation = currentSet.rotations[newRotation];

        if (existingRotation) {
            // Use existing positions (either calculated or manually adjusted)
            updateCurrentSet({ currentRotation: newRotation });
        } else {
            // This shouldn't happen if setStartingLineup was called correctly
            // But fall back to calculating
            const positions = calculateScoutRotationPositions(currentSet.startingLineup, newRotation);
            updateCurrentSet({
                currentRotation: newRotation,
                rotations: {
                    ...currentSet.rotations,
                    [newRotation]: { positions, manuallyAdjusted: false }
                }
            });
        }
    }, [currentSet, updateCurrentSet]);

    const updatePlayerPosition = useCallback((playerId: string, position: PlayerPosition) => {
        if (!currentSet) return;

        const rotation = currentSet.currentRotation;
        const existingData = currentSet.rotations[rotation] || { positions: {}, manuallyAdjusted: false };

        updateCurrentSet({
            rotations: {
                ...currentSet.rotations,
                [rotation]: {
                    positions: { ...existingData.positions, [playerId]: position },
                    manuallyAdjusted: true
                }
            }
        });
    }, [currentSet, updateCurrentSet]);

    // === SCOUTING EVENTS ===
    const addCourtDot = useCallback((position: PlayerPosition, type: DotType) => {
        if (!currentSet) return;

        const newDot: CourtDot = {
            id: generateId('dot'),
            timestamp: Date.now(),
            position,
            type,
            rotation: currentSet.currentRotation
        };

        updateCurrentSet({
            courtDots: [...currentSet.courtDots, newDot]
        });
    }, [currentSet, updateCurrentSet]);

    const addPassEvent = useCallback((playerId: string, grade: PassGrade) => {
        if (!currentSet) return;

        const newEvent: PassEvent = {
            id: generateId('pass'),
            timestamp: Date.now(),
            playerId,
            grade
        };

        updateCurrentSet({
            passEvents: [...currentSet.passEvents, newEvent]
        });

        setSelectedPlayerId(null);
    }, [currentSet, updateCurrentSet]);

    const undoLastDot = useCallback(() => {
        if (!currentSet || currentSet.courtDots.length === 0) return;
        updateCurrentSet({
            courtDots: currentSet.courtDots.slice(0, -1)
        });
    }, [currentSet, updateCurrentSet]);

    // Get current positions
    const currentPositions = useMemo(() => {
        if (!currentSet) return {};
        const rotationData = currentSet.rotations[currentSet.currentRotation];
        return rotationData?.positions || {};
    }, [currentSet]);

    // Get players for current lineup
    const lineupPlayers = useMemo(() => {
        if (!currentOpponent || !currentSet) return [];
        return currentSet.startingLineup
            .map(id => currentOpponent.players.find(p => p.id === id))
            .filter((p): p is ScoutPlayer => p !== undefined);
    }, [currentOpponent, currentSet]);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    {/* Opponent Selector */}
                    <button
                        onClick={() => setShowOpponentManager(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-white hover:bg-slate-700"
                    >
                        <Users size={16} />
                        <span className="text-sm font-medium">
                            {currentOpponent?.name || 'Select Team'}
                        </span>
                        <ChevronDown size={14} />
                    </button>

                    {/* Set Selector */}
                    {currentOpponent && (
                        <button
                            onClick={() => setShowSetManager(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-white hover:bg-slate-700"
                        >
                            <Target size={16} />
                            <span className="text-sm font-medium">
                                {currentSet ? `Set ${currentSet.setNumber}` : 'No Set'}
                            </span>
                            <ChevronDown size={14} />
                        </button>
                    )}

                    {/* New Set Button */}
                    {currentOpponent && (
                        <button
                            onClick={createSet}
                            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 text-sm"
                        >
                            <Plus size={14} />
                            <span>New Set</span>
                        </button>
                    )}
                </div>

                {/* Stats Toggle */}
                <button
                    onClick={() => setShowStats(!showStats)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${showStats ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    <BarChart3 size={16} />
                    <span>Stats</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar - only show when we have a lineup */}
                {currentSet && currentSet.startingLineup.length === 6 && (
                    <ScoutToolbar
                        mode={scoutMode}
                        setMode={setScoutMode}
                        activeDotType={activeDotType}
                        setActiveDotType={setActiveDotType}
                        currentRotation={currentSet?.currentRotation || 1}
                        onRotationChange={changeRotation}
                        hasLineup={true}
                        players={currentOpponent?.players || []}
                        selectedPlayerId={selectedPlayerId}
                        onPlayerSelect={setSelectedPlayerId}
                        onPassGrade={addPassEvent}
                        onToggleWeakPasser={toggleWeakPasser}
                        onUndo={undoLastDot}
                        canUndo={currentSet ? currentSet.courtDots.length > 0 : false}
                    />
                )}

                {/* Court Area */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    {!currentOpponent ? (
                        <div className="text-center text-slate-400">
                            <Users size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No opponent selected</p>
                            <button
                                onClick={() => setShowOpponentManager(true)}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                            >
                                Add Opponent Team
                            </button>
                        </div>
                    ) : !currentSet ? (
                        <div className="text-center text-slate-400">
                            <Target size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No set selected</p>
                            <button
                                onClick={createSet}
                                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                            >
                                Start New Set
                            </button>
                        </div>
                    ) : currentSet.startingLineup.length < 6 ? (
                        // Show the new lineup sheet for entering lineup
                        currentOpponent.players.length < 6 ? (
                            <div className="text-center text-slate-400 max-w-md">
                                <Users size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-lg mb-2">Add opponent players first</p>
                                <p className="text-sm mb-4">You need at least 6 players in the roster to enter a lineup.</p>
                                <button
                                    onClick={() => setShowOpponentManager(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                                >
                                    Add Players ({currentOpponent.players.length}/6+)
                                </button>
                            </div>
                        ) : (
                            <ScoutLineupSheet
                                players={currentOpponent.players}
                                onLineupComplete={setStartingLineup}
                            />
                        )
                    ) : (
                        // Show the full court view for scouting
                        <ScoutFullCourt
                            players={lineupPlayers}
                            positions={currentPositions}
                            dots={currentSet.courtDots}
                            currentRotation={currentSet.currentRotation}
                            mode={scoutMode}
                            activeDotType={activeDotType}
                            selectedPlayerId={selectedPlayerId}
                            onDotPlaced={addCourtDot}
                            onPlayerClick={setSelectedPlayerId}
                            onPlayerDrag={updatePlayerPosition}
                            onRotationChange={changeRotation}
                        />
                    )}
                </div>

                {/* Stats Panel */}
                {showStats && currentOpponent && (
                    <ScoutStats
                        opponent={currentOpponent}
                        currentSet={currentSet}
                        onClose={() => setShowStats(false)}
                    />
                )}
            </div>

            {/* Modals */}
            {showOpponentManager && (
                <OpponentManager
                    opponents={opponents}
                    currentOpponentId={currentOpponentId}
                    onSelect={(id) => {
                        setCurrentOpponentId(id);
                        setCurrentSetId(null);
                        // Don't close modal - let user add players
                    }}
                    onCreate={(name) => {
                        const newOpponent: ScoutOpponent = {
                            id: generateId('opp'),
                            name,
                            players: [],
                            sets: [],
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        };
                        setOpponents([...opponents, newOpponent]);
                        setCurrentOpponentId(newOpponent.id);
                        // Don't close modal - let user add players
                    }}
                    onUpdate={updateOpponent}
                    onDelete={deleteOpponent}
                    onAddPlayer={addPlayer}
                    onClose={() => setShowOpponentManager(false)}
                />
            )}

            {showSetManager && currentOpponent && (
                <SetManager
                    sets={currentOpponent.sets}
                    currentSetId={currentSetId}
                    onSelect={(id) => {
                        setCurrentSetId(id);
                        setShowSetManager(false);
                    }}
                    onCreate={createSet}
                    onClose={() => setShowSetManager(false)}
                />
            )}
        </div>
    );
};
