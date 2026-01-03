import React, { useState } from 'react';
import { ScoutedTeam, ScoutingSession } from '../types';
import { Plus } from 'lucide-react';
import { generateId } from '../utils';

interface ScoutPageProps {
    scoutedTeams: ScoutedTeam[];
    scoutingSessions: ScoutingSession[];
    setScoutedTeams: (teams: ScoutedTeam[]) => void;
    setScoutingSessions: (sessions: ScoutingSession[]) => void;
}

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

    return (
        <div className="h-full overflow-y-auto pb-20 md:pb-4">
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Scout Opponent Teams</h1>
                    <p className="text-slate-400 text-sm">Live scouting for matches - fast data entry</p>
                </div>

                {/* Mode Selector */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <label className="text-slate-300 text-sm font-bold mb-3 block">Scout Mode</label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setScoutMode('1-team')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${scoutMode === '1-team' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            Scout 1 Team
                        </button>
                        <button
                            onClick={() => setScoutMode('2-teams')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${scoutMode === '2-teams' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            Scout 2 Teams (Head-to-Head)
                        </button>
                    </div>
                </div>

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
                            <button
                                onClick={() => setShowNewTeamDialog(true)}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
                            >
                                <Plus size={20} />
                                New Team
                            </button>
                        </div>
                    )}
                </div>

                {/* Coming Soon Placeholder */}
                {selectedTeamId && (
                    <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Scouting Interface Coming Soon</h2>
                        <p className="text-slate-400">
                            Full scouting interface with rotation tracking, quick stats, and point tracking will be implemented next.
                        </p>
                    </div>
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
            </div>
        </div>
    );
}
