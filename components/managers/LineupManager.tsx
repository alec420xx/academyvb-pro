import React, { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { Lineup, Player } from '../../types';

interface LineupManagerProps {
    isOpen: boolean;
    onClose: () => void;
    lineups: Lineup[];
    currentTeamId: string | null;
    currentLineupId: string | null;
    roster: Player[];
    onSwitchLineup: (id: string) => void;
    onCreateLineup: (name: string, roster: Player[]) => void;
    onDeleteLineup: (id: string) => void;
}

export const LineupManager: React.FC<LineupManagerProps> = ({
    isOpen,
    onClose,
    lineups,
    currentTeamId,
    currentLineupId,
    roster,
    onSwitchLineup,
    onCreateLineup,
    onDeleteLineup
}) => {
    const [newItemName, setNewItemName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 p-0 rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-lg md:text-xl font-bold text-white">Lineups</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-2 max-h-[50vh]">
                    {lineups.filter(l => l.teamId === currentTeamId).map(l => (
                        <div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${currentLineupId === l.id ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                            <button onClick={() => onSwitchLineup(l.id)} className="flex-1 text-left font-bold text-sm text-slate-200">{l.name}</button>
                            <div className="flex items-center gap-2">
                                {currentLineupId === l.id && <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                                <button onClick={(e) => { e.stopPropagation(); onDeleteLineup(l.id); }} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 md:p-6 bg-slate-800 border-t border-slate-700">
                    <input
                        type="text"
                        placeholder="New Lineup Name"
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg mb-3 text-white outline-none"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            onCreateLineup(newItemName || 'New Lineup', roster);
                            setNewItemName('');
                        }}
                        className="w-full p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Create Lineup
                    </button>
                </div>
            </div>
        </div>
    );
};
