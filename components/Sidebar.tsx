import React from 'react';
import { Player } from '../types';
import { getRoleColor } from '../constants';

interface SidebarProps {
    roster: Player[];
    activePlayerIds: string[];
    handleTokenDown: (e: any, playerId: string, isBench: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    roster,
    activePlayerIds,
    handleTokenDown
}) => {
    return (
        <div className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 h-full">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Bench</h3>
                <div className="grid grid-cols-2 gap-3">
                    {roster.filter(p => !activePlayerIds.includes(p.id)).map(player => (
                        <div
                            key={player.id}
                            className="relative flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500 cursor-grab active:cursor-grabbing group transition-all"
                            onMouseDown={(e) => handleTokenDown(e, player.id, true)}
                            onTouchStart={(e) => handleTokenDown(e, player.id, true)}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow-sm ${getRoleColor(player.role)}`}>
                                {player.number}
                            </div>
                            <div className="text-xs font-bold text-slate-300">{player.name}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">{player.role}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
