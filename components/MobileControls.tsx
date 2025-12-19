import React from 'react';
import { GameMode, Phase, SavedRotationData } from '../types';

interface MobileControlsProps {
    currentRotation: number;
    // Rotation selection for the main view
    handleViewChange: (rot: number, phase: string, newMode?: GameMode) => void;
    // Current phase state
    currentPhase: string;
    gameMode: GameMode;
    currentPhasesList: Phase[];

    // Notes state
    currentNotes: string;
    setCurrentNotes: (notes: string) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
    currentRotation,
    handleViewChange,
    currentPhase,
    gameMode,
    currentPhasesList,
    currentNotes,
    setCurrentNotes
}) => {
    return (
        <div className="lg:hidden w-full mt-4 space-y-4 order-4 pb-32">
            {/* 1. Rotation Selector */}
            <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rotation</div>
                <div className="flex justify-between bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {[1, 2, 3, 4, 5, 6].map(r => (
                        <button
                            key={r}
                            onClick={() => handleViewChange(r, currentPhase)}
                            className={`w-10 h-10 rounded-lg font-black text-lg flex items-center justify-center ${currentRotation === r
                                    ? (gameMode === 'offense' ? 'bg-red-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg')
                                    : 'text-slate-500'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Phase Selector */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phase</div>
                    <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-800">
                        <button
                            onClick={() => handleViewChange(currentRotation, 'receive1', 'offense')}
                            className={`px-3 py-1 rounded text-[10px] font-bold ${gameMode === 'offense' ? 'bg-red-600 text-white' : 'text-slate-400'
                                }`}
                        >
                            OFF
                        </button>
                        <button
                            onClick={() => handleViewChange(currentRotation, 'base', 'defense')}
                            className={`px-3 py-1 rounded text-[10px] font-bold ${gameMode === 'defense' ? 'bg-blue-600 text-white' : 'text-slate-400'
                                }`}
                        >
                            DEF
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {currentPhasesList.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleViewChange(currentRotation, p.id)}
                            className={`py-2 rounded-lg text-[10px] font-bold uppercase ${currentPhase === p.id
                                    ? 'bg-slate-100 text-slate-900'
                                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Phase Notes */}
            <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phase Notes</div>
                <textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:border-slate-400"
                    placeholder="Add notes..."
                />
            </div>
        </div>
    );
};
