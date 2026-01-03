import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, Users, Target, BarChart3 } from 'lucide-react';
import { ScoutOpponent, ScoutSet, ScoutPlayer, DotType, PassGrade, CourtDot, PassEvent, PlayerPosition } from '../../types';
import { generateId } from '../../utils';
import { SCOUT_ZONE_POSITIONS } from '../../constants';
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

    // === LINEUP (simplified - just jersey numbers) ===
    /**
     * Set the starting lineup from jersey numbers in each zone.
     * Creates players on-the-fly from the entered numbers.
     */
    const setStartingLineupFromNumbers = useCallback((zoneNumbers: Record<number, string>, declaredRotation: number) => {
        if (!currentOpponent || !currentSet) return;

        // Create players from the jersey numbers (or find existing)
        const updatedPlayers = [...currentOpponent.players];
        const lineupPlayerIds: string[] = [];

        // Zone order for lineup: 1, 6, 5, 4, 3, 2
        const zoneOrder = [1, 6, 5, 4, 3, 2];

        for (const zone of zoneOrder) {
            const jerseyNumber = zoneNumbers[zone].trim();

            // Find existing player or create new one
            let player = updatedPlayers.find(p => p.number === jerseyNumber);
            if (!player) {
                player = {
                    id: generateId('sp'),
                    number: jerseyNumber,
                    isWeakPasser: false
                };
                updatedPlayers.push(player);
            }
            lineupPlayerIds.push(player.id);
        }

        // Calculate positions for all 6 rotations based on declared rotation
        const rotations: Record<number, { positions: Record<string, PlayerPosition>; manuallyAdjusted: boolean }> = {};

        for (let rot = 1; rot <= 6; rot++) {
            // Calculate the offset from declared rotation
            const offset = (rot - declaredRotation + 6) % 6;

            // Build positions for this rotation
            const positions: Record<string, PlayerPosition> = {};

            zoneOrder.forEach((zone, lineupIdx) => {
                const playerId = lineupPlayerIds[lineupIdx];
                // Calculate which zone this player is in for this rotation
                const rotatedZoneIdx = (lineupIdx + offset) % 6;
                const rotatedZone = zoneOrder[rotatedZoneIdx];
                const zonePos = SCOUT_ZONE_POSITIONS[rotatedZone];
                positions[playerId] = { x: zonePos.x, y: zonePos.y };
            });

            rotations[rot] = { positions, manuallyAdjusted: false };
        }

        // Update opponent with new players and set with lineup
        const updatedOpponent = {
            ...currentOpponent,
            players: updatedPlayers,
            sets: currentOpponent.sets.map(s =>
                s.id === currentSet.id
                    ? { ...s, startingLineup: lineupPlayerIds, currentRotation: declaredRotation, rotations }
                    : s
            )
        };

        setOpponents(opponents.map(o => o.id === updatedOpponent.id ? { ...updatedOpponent, updatedAt: Date.now() } : o));
    }, [currentOpponent, currentSet, opponents, setOpponents]);

    const toggleWeakPasser = useCallback((playerId: string) => {
        if (!currentOpponent) return;

        updateOpponent({
            ...currentOpponent,
            players: currentOpponent.players.map(p =>
                p.id === playerId ? { ...p, isWeakPasser: !p.isWeakPasser } : p
            )
        });
    }, [currentOpponent, updateOpponent]);

    const changeRotation = useCallback((newRotation: number) => {
        if (!currentSet || currentSet.startingLineup.length !== 6) return;
        updateCurrentSet({ currentRotation: newRotation });
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
                        players={lineupPlayers}
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
                        // Show the lineup sheet - just enter numbers directly
                        <ScoutLineupSheet
                            onLineupComplete={setStartingLineupFromNumbers}
                        />
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
                        setShowOpponentManager(false);
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
                        setShowOpponentManager(false);
                    }}
                    onUpdate={updateOpponent}
                    onDelete={deleteOpponent}
                    onAddPlayer={() => {}} // No longer needed - players created from lineup
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
