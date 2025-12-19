import React from 'react';
import { Player } from '../types';
import { getRoleColor } from '../constants';
import { UserPlus, Trash2 } from 'lucide-react';
import { generateId } from '../utils';

interface RosterViewProps {
    roster: Player[];
    setRoster: React.Dispatch<React.SetStateAction<Player[]>>;
    // We can pass a direct updater, or replicate the update logic inside if we lift the state properly.
    // For now, let's pass a specialized update function or the setter.
    // Ideally, the parent passes an "onUpdateRoster" function.
    updateRoster: (index: number, field: keyof Player, value: any) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({
    roster,
    setRoster,
    updateRoster
}) => {
    return (
        <div className="max-w-4xl mx-auto bg-slate-800 md:rounded-2xl shadow-xl border-y md:border border-slate-700 overflow-hidden mb-40">
            <div className="p-4 md:p-6 border-b border-slate-700 flex flex-row justify-between items-center bg-slate-900/50 gap-4">
                <h2 className="text-lg md:text-xl font-bold text-white">Roster</h2>
                <button
                    onClick={() => setRoster(prev => [...prev, { id: generateId('p'), role: 'DS', name: 'New', number: '' }])}
                    className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-bold hover:bg-red-500 transition-colors"
                >
                    <UserPlus size={16} /> Add
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-6">
                {roster.map((player, idx) => (
                    <div key={player.id} className="p-3 md:p-4 border border-slate-700 bg-slate-900 rounded-xl relative group hover:border-red-500 transition-colors">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{idx < 6 ? `Starter ${idx + 1}` : 'Bench'}</div>
                            {roster.length > 6 && (
                                <button
                                    onClick={() => setRoster(prev => prev.filter(p => p.id !== player.id))}
                                    className="text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg ${getRoleColor(player.role)}`}>{player.number || '#'}</div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={player.name}
                                    onChange={(e) => updateRoster(idx, 'name', e.target.value)}
                                    className="w-full bg-transparent font-bold text-white border-b border-slate-700 focus:border-red-500 focus:outline-none py-1 text-sm md:text-base"
                                    placeholder="Name"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role</label>
                                <select
                                    value={player.role}
                                    onChange={(e) => updateRoster(idx, 'role', e.target.value as any)}
                                    className="w-full p-1.5 md:p-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {["S", "OH1", "OH2", "M1", "M2", "OPP", "L", "DS", "OH", "M"].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Num/Init</label>
                                <input
                                    type="text"
                                    value={player.number}
                                    onChange={(e) => updateRoster(idx, 'number', e.target.value)}
                                    className="w-full p-1.5 md:p-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="#"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
