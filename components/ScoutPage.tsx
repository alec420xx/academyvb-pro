import React, { useState, useEffect } from 'react';
import { ScoutedTeam, ScoutingSession, ScoutedRotation, ScoutedPlayer, RotationStats, ScoutPoint } from '../types';
import { Plus, Target, Trash2 } from 'lucide-react';
import { generateId } from '../utils';

interface ScoutPageProps {
    scoutedTeams: ScoutedTeam[];
    scoutingSessions: ScoutingSession[];
    setScoutedTeams: (teams: ScoutedTeam[]) => void;
    setScoutingSessions: (sessions: ScoutingSession[]) => void;
}

const POSITIONS = ['S', 'OH', 'MB', 'OPP', 'L', 'DS'];

export function ScoutPage({
    scoutedTeams,
    scoutingSessions,
    setScoutedTeams,
    setScoutingSessions
}: ScoutPageProps) {
    const [scoutMode, setScoutMode] = useState<'1-team' | '2-teams'>('1-team');
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [currentRotation, setCurrentRotation] = useState(1);
    const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamColor, setNewTeamColor] = useState('#3b82f6');
    const [currentSession, setCurrentSession] = useState<ScoutingSession | null>(null);
    const [pointTrackMode, setPointTrackMode] = useState<'won' | 'lost'>('won');
    const [selectedPlayerForNotes, setSelectedPlayerForNotes] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedTeam = scoutedTeams.find(t => t.id === selectedTeamId);
    const currentRotationData = currentSession?.rotations.find(r => r.rotation === currentRotation);

    // Initialize session when team is selected
    useEffect(() => {
        if (!selectedTeamId) {
            setCurrentSession(null);
            return;
        }

        // Create new session for this team
        const newSession: ScoutingSession = {
            id: generateId('session'),
            teamId: selectedTeamId,
            date: Date.now(),
            rotations: [1, 2, 3, 4, 5, 6].map(rotNum => ({
                rotation: rotNum,
                players: [],
                stats: {
                    serveReceive: {},
                    transition: {},
                    freeBall: {},
                    outOfSystem: {},
                    pointsWon: [],
                    pointsLost: []
                },
                notes: ''
            }))
        };
        setCurrentSession(newSession);
    }, [selectedTeamId]);

    const handleCreateTeam = () => {
        if (!newTeamName.trim()) return;

        const newTeam: ScoutedTeam = {
            id: generateId('scout'),
            name: newTeamName,
            color: newTeamColor,
            createdAt: Date.now(),
            lastScoutedAt: Date.now()
        };

        setScoutedTeams([...scoutedTeams, newTeam]);
        setSelectedTeamId(newTeam.id);
        setNewTeamName('');
        setShowNewTeamDialog(false);
    };

    const handleDeleteTeam = () => {
        if (!selectedTeamId) return;

        // Delete team
        setScoutedTeams(scoutedTeams.filter(t => t.id !== selectedTeamId));

        // Delete all sessions for this team
        setScoutingSessions(scoutingSessions.filter(s => s.teamId !== selectedTeamId));

        setSelectedTeamId(null);
        setShowDeleteConfirm(false);
    };

    // Rotate players clockwise (for volleyball rotation)
    const rotatePlayersClockwise = (players: ScoutedPlayer[]): ScoutedPlayer[] => {
        if (players.length !== 6) return players;
        // In volleyball, position 1 -> 6, 6 -> 5, 5 -> 4, 4 -> 3, 3 -> 2, 2 -> 1
        // This means the player at index 0 goes to index 5, index 1 to 0, etc.
        return [players[1], players[2], players[3], players[4], players[5], players[0]];
    };

    // Auto-populate other rotations when rotation 1 is complete
    const autoPopulateRotations = () => {
        if (!currentSession) return;

        const rotation1 = currentSession.rotations.find(r => r.rotation === 1);
        if (!rotation1 || rotation1.players.length !== 6) return;

        let currentPlayers = rotation1.players;
        const updatedRotations = currentSession.rotations.map(r => {
            if (r.rotation === 1) return r; // Keep rotation 1 as is

            // Rotate players for each subsequent rotation
            currentPlayers = rotatePlayersClockwise(currentPlayers);

            // Only auto-populate if the rotation is empty
            if (r.players.length === 0) {
                return { ...r, players: [...currentPlayers] };
            }
            return r;
        });

        setCurrentSession({ ...currentSession, rotations: updatedRotations });
    };

    const addPlayerToLineup = (playerNumber: string, position: string) => {
        if (!currentSession || !currentRotationData) return;

        const newPlayer: ScoutedPlayer = {
            number: playerNumber,
            position,
            isMainHitter: false,
            setterDumpFrequency: 0,
            notes: ''
        };

        const updatedRotations = currentSession.rotations.map(r =>
            r.rotation === currentRotation
                ? { ...r, players: [...r.players, newPlayer] }
                : r
        );

        const newSession = { ...currentSession, rotations: updatedRotations };
        setCurrentSession(newSession);

        // If we just completed rotation 1 lineup (6 players), auto-populate other rotations
        if (currentRotation === 1 && currentRotationData.players.length + 1 === 6) {
            // Use setTimeout to ensure state updates first
            setTimeout(() => autoPopulateRotations(), 100);
        }
    };

    const removePlayer = (playerNumber: string) => {
        if (!currentSession || !currentRotationData) return;

        const updatedRotations = currentSession.rotations.map(r =>
            r.rotation === currentRotation
                ? { ...r, players: r.players.filter(p => p.number !== playerNumber) }
                : r
        );

        setCurrentSession({ ...currentSession, rotations: updatedRotations });
    };

    const incrementStat = (statType: keyof RotationStats, playerNumber: string) => {
        if (!currentSession || !currentRotationData) return;
        if (statType === 'pointsWon' || statType === 'pointsLost') return;

        const updatedRotations = currentSession.rotations.map(r =>
            r.rotation === currentRotation
                ? {
                    ...r,
                    stats: {
                        ...r.stats,
                        [statType]: {
                            ...r.stats[statType],
                            [playerNumber]: ((r.stats[statType] as Record<string, number>)[playerNumber] || 0) + 1
                        }
                    }
                }
                : r
        );

        setCurrentSession({ ...currentSession, rotations: updatedRotations });
    };

    const addPoint = (x: number, y: number) => {
        if (!currentSession || !currentRotationData) return;

        const point: ScoutPoint = { x, y, timestamp: Date.now() };
        const statKey = pointTrackMode === 'won' ? 'pointsWon' : 'pointsLost';

        const updatedRotations = currentSession.rotations.map(r =>
            r.rotation === currentRotation
                ? {
                    ...r,
                    stats: {
                        ...r.stats,
                        [statKey]: [...r.stats[statKey], point]
                    }
                }
                : r
        );

        setCurrentSession({ ...currentSession, rotations: updatedRotations });
    };

    const updatePlayerNotes = (playerNumber: string, field: keyof ScoutedPlayer, value: any) => {
        if (!currentSession || !currentRotationData) return;

        const updatedRotations = currentSession.rotations.map(r =>
            r.rotation === currentRotation
                ? {
                    ...r,
                    players: r.players.map(p =>
                        p.number === playerNumber ? { ...p, [field]: value } : p
                    )
                }
                : r
        );

        setCurrentSession({ ...currentSession, rotations: updatedRotations });
    };

    const saveSession = () => {
        if (!currentSession || !selectedTeamId) return;

        // Update team's last scouted time
        setScoutedTeams(scoutedTeams.map(t =>
            t.id === selectedTeamId ? { ...t, lastScoutedAt: Date.now() } : t
        ));

        // Save session
        setScoutingSessions([...scoutingSessions, currentSession]);

        alert('Session saved successfully!');
    };

    return (
        <div className="h-full overflow-y-auto pb-20 md:pb-4">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Scout Opponent Teams</h1>
                    <p className="text-slate-400 text-sm">Live scouting for matches - fast data entry</p>
                </div>

                {/* Mode Selector - Hidden for now, only 1-team mode */}
                {false && (
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <label className="text-slate-300 text-sm font-bold mb-3 block">Scout Mode</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setScoutMode('1-team')}
                                className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${scoutMode === '1-team' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Scout 1 Team
                            </button>
                            <button
                                onClick={() => setScoutMode('2-teams')}
                                className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${scoutMode === '2-teams' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                Scout 2 Teams (Head-to-Head)
                            </button>
                        </div>
                    </div>
                )}

                {/* Team Selection */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <label className="text-slate-300 text-sm font-bold mb-3 block">Select Team</label>
                    {scoutedTeams.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400 mb-4">No teams scouted yet</p>
                            <button
                                onClick={() => setShowNewTeamDialog(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                            >
                                <Plus size={20} />
                                Create First Team
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <select
                                value={selectedTeamId || ''}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                            >
                                <option value="">Select a team...</option>
                                {scoutedTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} - Last scouted: {new Date(team.lastScoutedAt).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewTeamDialog(true)}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
                                >
                                    <Plus size={20} />
                                    New Team
                                </button>
                                {selectedTeamId && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                                        title="Delete Team"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Scouting Interface */}
                {selectedTeamId && currentSession && (
                    <>
                        {/* Rotation Selector */}
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <label className="text-slate-300 text-sm font-bold mb-3 block">Rotation</label>
                            <div className="grid grid-cols-6 gap-2">
                                {[1, 2, 3, 4, 5, 6].map(rot => (
                                    <button
                                        key={rot}
                                        onClick={() => setCurrentRotation(rot)}
                                        className={`py-3 px-4 rounded-lg font-bold transition-all ${currentRotation === rot ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        {rot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lineup Input */}
                        {currentRotationData && currentRotationData.players.length < 6 && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="text-slate-300 text-sm font-bold mb-3 block">
                                    Starting Lineup ({currentRotationData.players.length}/6 players)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6].map(pos => {
                                        const player = currentRotationData.players[pos - 1];
                                        return (
                                            <div key={pos} className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                                                <div className="text-slate-400 text-xs mb-2">Position {pos}</div>
                                                {!player ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="#"
                                                            maxLength={2}
                                                            className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center focus:outline-none focus:border-red-500"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter' && e.currentTarget.value) {
                                                                    const select = e.currentTarget.nextElementSibling as HTMLSelectElement;
                                                                    if (select && select.value) {
                                                                        addPlayerToLineup(e.currentTarget.value, select.value);
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <select className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-red-500">
                                                            <option value="">Pos</option>
                                                            {POSITIONS.map(p => (
                                                                <option key={p} value={p}>{p}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-white font-bold">#{player.number} {player.position}</span>
                                                        <button
                                                            onClick={() => removePlayer(player.number)}
                                                            className="text-red-500 hover:text-red-400"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Stats */}
                        {currentRotationData && currentRotationData.players.length > 0 && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="text-slate-300 text-sm font-bold mb-3 block">Quick Stats</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(['serveReceive', 'transition', 'freeBall', 'outOfSystem'] as const).map(statType => (
                                        <div key={statType} className="bg-slate-900 rounded-lg p-3">
                                            <div className="text-white font-bold text-sm mb-2 capitalize">
                                                {statType === 'serveReceive' ? 'Serve Receive' :
                                                    statType === 'freeBall' ? 'Free Ball' :
                                                        statType === 'outOfSystem' ? 'Out of System' : 'Transition'}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {currentRotationData.players.map(player => {
                                                    const count = (currentRotationData.stats[statType] as Record<string, number>)[player.number] || 0;
                                                    return (
                                                        <button
                                                            key={player.number}
                                                            onClick={() => incrementStat(statType, player.number)}
                                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold text-sm transition-colors"
                                                        >
                                                            #{player.number} {count > 0 && `(${count})`}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Point Tracker */}
                        {currentRotationData && currentRotationData.players.length > 0 && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="text-slate-300 text-sm font-bold mb-3 block">Point Tracking</label>
                                <div className="flex gap-3 mb-3">
                                    <button
                                        onClick={() => setPointTrackMode('won')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${pointTrackMode === 'won' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        Points Won ({currentRotationData.stats.pointsWon.length})
                                    </button>
                                    <button
                                        onClick={() => setPointTrackMode('lost')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${pointTrackMode === 'lost' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        Points Lost ({currentRotationData.stats.pointsLost.length})
                                    </button>
                                </div>
                                <div className="relative aspect-[3/2] bg-slate-900 rounded-lg border-2 border-white cursor-crosshair"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                        addPoint(x, y);
                                    }}
                                >
                                    {/* Court net line */}
                                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white" />

                                    {/* Points Won */}
                                    {currentRotationData.stats.pointsWon.map((point, idx) => (
                                        <div
                                            key={`won-${idx}`}
                                            className="absolute w-3 h-3 bg-green-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                        />
                                    ))}

                                    {/* Points Lost */}
                                    {currentRotationData.stats.pointsLost.map((point, idx) => (
                                        <div
                                            key={`lost-${idx}`}
                                            className="absolute w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Player Notes */}
                        {currentRotationData && currentRotationData.players.length > 0 && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="text-slate-300 text-sm font-bold mb-3 block">Player Notes</label>
                                <select
                                    value={selectedPlayerForNotes || ''}
                                    onChange={(e) => setSelectedPlayerForNotes(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-red-500"
                                >
                                    <option value="">Select player...</option>
                                    {currentRotationData.players.map(player => (
                                        <option key={player.number} value={player.number}>
                                            #{player.number} - {player.position}
                                        </option>
                                    ))}
                                </select>

                                {selectedPlayerForNotes && (() => {
                                    const player = currentRotationData.players.find(p => p.number === selectedPlayerForNotes);
                                    if (!player) return null;
                                    return (
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={player.isMainHitter}
                                                    onChange={(e) => updatePlayerNotes(player.number, 'isMainHitter', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-white text-sm">Main Hitter</span>
                                            </label>

                                            <div>
                                                <label className="text-slate-300 text-sm mb-2 block">
                                                    Setter Dump Frequency (0-10): {player.setterDumpFrequency || 0}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="10"
                                                    value={player.setterDumpFrequency || 0}
                                                    onChange={(e) => updatePlayerNotes(player.number, 'setterDumpFrequency', parseInt(e.target.value))}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-slate-300 text-sm mb-2 block">Notes</label>
                                                <textarea
                                                    value={player.notes}
                                                    onChange={(e) => updatePlayerNotes(player.number, 'notes', e.target.value)}
                                                    placeholder="Player notes..."
                                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none h-24 focus:outline-none focus:border-red-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Rotation Notes */}
                        {currentRotationData && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="text-slate-300 text-sm font-bold mb-3 block">Rotation Notes</label>
                                <textarea
                                    value={currentRotationData.notes}
                                    onChange={(e) => {
                                        const updatedRotations = currentSession.rotations.map(r =>
                                            r.rotation === currentRotation ? { ...r, notes: e.target.value } : r
                                        );
                                        setCurrentSession({ ...currentSession, rotations: updatedRotations });
                                    }}
                                    placeholder="General observations for this rotation..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none h-24 focus:outline-none focus:border-red-500"
                                />
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="sticky bottom-4 md:bottom-0">
                            <button
                                onClick={saveSession}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg transition-colors shadow-lg"
                            >
                                Save Session
                            </button>
                        </div>
                    </>
                )}

                {/* New Team Dialog */}
                {showNewTeamDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-white text-lg font-semibold mb-4">Create New Team</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-2 block">Team Name</label>
                                    <input
                                        type="text"
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                        placeholder="Team name..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-2 block">Team Color</label>
                                    <input
                                        type="color"
                                        value={newTeamColor}
                                        onChange={(e) => setNewTeamColor(e.target.value)}
                                        className="w-full h-12 bg-slate-900 border border-slate-600 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button
                                        onClick={() => {
                                            setShowNewTeamDialog(false);
                                            setNewTeamName('');
                                        }}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateTeam}
                                        disabled={!newTeamName.trim()}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Team
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Team Confirmation */}
                {showDeleteConfirm && selectedTeam && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-white text-lg font-semibold mb-4">Delete Team?</h3>
                            <p className="text-slate-300 mb-6">
                                Are you sure you want to delete <span className="font-bold text-white">{selectedTeam.name}</span>? This will also delete all scouting sessions for this team. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteTeam}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                    Delete Team
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
