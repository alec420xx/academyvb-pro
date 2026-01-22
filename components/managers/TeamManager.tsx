import React, { useState } from 'react';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
import { Team } from '../../types';

interface TeamManagerProps {
    isOpen: boolean;
    onClose: () => void;
    teams: Team[];
    currentTeamId: string | null;
    onSwitchTeam: (id: string) => void;
    onCreateTeam: (name: string) => void;
    onRenameTeam: (id: string, name: string) => void;
    onDeleteTeam: (id: string) => void;
}

export const TeamManager: React.FC<TeamManagerProps> = ({
    isOpen,
    onClose,
    teams,
    currentTeamId,
    onSwitchTeam,
    onCreateTeam,
    onRenameTeam,
    onDeleteTeam
}) => {
    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [newItemName, setNewItemName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 p-0 rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-lg md:text-xl font-bold text-white">My Teams</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
                    {teams.map(t => (
                        <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${currentTeamId === t.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                            {editId === t.id ? (
                                <input
                                    className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white flex-1 mr-2"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={() => {
                                        onRenameTeam(t.id, editName);
                                        setEditId(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onRenameTeam(t.id, editName);
                                            setEditId(null);
                                        }
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <button onClick={() => onSwitchTeam(t.id)} className="flex-1 text-left font-bold text-sm text-slate-200">{t.name}</button>
                            )}
                            <div className="flex items-center gap-2">
                                {currentTeamId === t.id && <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                                <button onClick={(e) => { e.stopPropagation(); setEditId(t.id); setEditName(t.name); }} className="p-2 text-slate-500 hover:text-blue-400"><Pencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteTeam(t.id); }} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 md:p-6 bg-slate-800 border-t border-slate-700">
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="New Team Name"
                            className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm outline-none"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                        />
                        <button
                            onClick={() => {
                                if (newItemName.trim()) {
                                    onCreateTeam(newItemName);
                                    setNewItemName('');
                                }
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                        >
                            <Plus size={16} /> Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
