import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertTriangle } from 'lucide-react';
import { ScoutOpponent, ScoutPlayer } from '../../types';

interface OpponentManagerProps {
    opponents: ScoutOpponent[];
    currentOpponentId: string | null;
    onSelect: (id: string) => void;
    onCreate: (name: string) => void;
    onUpdate: (opponent: ScoutOpponent) => void;
    onDelete: (id: string) => void;
    onAddPlayer: (number: string, name?: string) => void;
    onClose: () => void;
}

export const OpponentManager: React.FC<OpponentManagerProps> = ({
    opponents,
    currentOpponentId,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
    onAddPlayer,
    onClose
}) => {
    const [newOpponentName, setNewOpponentName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const currentOpponent = opponents.find(o => o.id === currentOpponentId);

    const handleCreateOpponent = () => {
        if (newOpponentName.trim()) {
            onCreate(newOpponentName.trim());
            setNewOpponentName('');
        }
    };

    const handleAddPlayer = () => {
        if (newPlayerNumber.trim()) {
            onAddPlayer(newPlayerNumber.trim(), newPlayerName.trim() || undefined);
            setNewPlayerNumber('');
            setNewPlayerName('');
        }
    };

    const handleRename = (opponent: ScoutOpponent) => {
        if (editName.trim() && editName !== opponent.name) {
            onUpdate({ ...opponent, name: editName.trim() });
        }
        setEditingId(null);
    };

    const handleDeletePlayer = (playerId: string) => {
        if (!currentOpponent) return;
        onUpdate({
            ...currentOpponent,
            players: currentOpponent.players.filter(p => p.id !== playerId)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white">Opponent Teams</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Create New Opponent */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newOpponentName}
                            onChange={(e) => setNewOpponentName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateOpponent()}
                            placeholder="New team name..."
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm"
                        />
                        <button
                            onClick={handleCreateOpponent}
                            disabled={!newOpponentName.trim()}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Opponent List */}
                    <div className="space-y-2">
                        {opponents.map(opponent => (
                            <div
                                key={opponent.id}
                                className={`p-3 rounded-lg border transition-all ${opponent.id === currentOpponentId
                                        ? 'bg-blue-900/30 border-blue-600'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    {editingId === opponent.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRename(opponent)}
                                                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleRename(opponent)}
                                                className="text-emerald-400 hover:text-emerald-300"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onSelect(opponent.id)}
                                                className="flex-1 text-left"
                                            >
                                                <span className="text-white font-medium">{opponent.name}</span>
                                                <span className="text-slate-400 text-sm ml-2">
                                                    ({opponent.players.length} players, {opponent.sets.length} sets)
                                                </span>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(opponent.id);
                                                        setEditName(opponent.name);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-white"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {showDeleteConfirm === opponent.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                onDelete(opponent.id);
                                                                setShowDeleteConfirm(null);
                                                            }}
                                                            className="px-2 py-0.5 bg-red-600 text-white text-xs rounded"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                            className="px-2 py-0.5 bg-slate-600 text-white text-xs rounded"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(opponent.id)}
                                                        className="p-1 text-slate-400 hover:text-red-400"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {opponents.length === 0 && (
                            <p className="text-center text-slate-500 py-4">
                                No opponent teams yet. Add one above!
                            </p>
                        )}
                    </div>

                    {/* Player Management for Current Opponent */}
                    {currentOpponent && (
                        <div className="mt-6 pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">
                                Players - {currentOpponent.name}
                            </h3>

                            {/* Add Player */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newPlayerNumber}
                                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                                    placeholder="#"
                                    className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-center text-sm"
                                />
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                                    placeholder="Name (optional)"
                                    className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                />
                                <button
                                    onClick={handleAddPlayer}
                                    disabled={!newPlayerNumber.trim()}
                                    className="px-2 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Player List */}
                            <div className="flex flex-wrap gap-2">
                                {currentOpponent.players.map(player => (
                                    <div
                                        key={player.id}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${player.isWeakPasser
                                                ? 'bg-amber-900/50 border border-amber-600'
                                                : 'bg-slate-800 border border-slate-700'
                                            }`}
                                    >
                                        <span className="font-bold text-white">#{player.number}</span>
                                        {player.name && (
                                            <span className="text-slate-400">{player.name}</span>
                                        )}
                                        {player.isWeakPasser && (
                                            <AlertTriangle size={12} className="text-amber-400" />
                                        )}
                                        <button
                                            onClick={() => handleDeletePlayer(player.id)}
                                            className="ml-1 text-slate-500 hover:text-red-400"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {currentOpponent.players.length === 0 && (
                                    <p className="text-slate-500 text-sm">No players added yet</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
