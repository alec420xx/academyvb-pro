import React from 'react';
import { Circle, Hand, Target, Undo2, AlertTriangle, RotateCcw } from 'lucide-react';
import { ScoutPlayer, DotType, PassGrade } from '../../types';
import { SCOUT_DOT_COLORS, SCOUT_DOT_LABELS, PASS_GRADE_LABELS } from '../../constants';
import { ScoutMode } from './ScoutPage';

interface ScoutToolbarProps {
    mode: ScoutMode;
    setMode: (mode: ScoutMode) => void;
    activeDotType: DotType;
    setActiveDotType: (type: DotType) => void;
    currentRotation: number;
    onRotationChange: (rotation: number) => void;
    hasLineup: boolean;
    players: ScoutPlayer[];
    selectedPlayerId: string | null;
    onPlayerSelect: (id: string | null) => void;
    onPassGrade: (playerId: string, grade: PassGrade) => void;
    onToggleWeakPasser: (playerId: string) => void;
    onUndo: () => void;
    canUndo: boolean;
}

export const ScoutToolbar: React.FC<ScoutToolbarProps> = ({
    mode,
    setMode,
    activeDotType,
    setActiveDotType,
    currentRotation,
    onRotationChange,
    hasLineup,
    players,
    selectedPlayerId,
    onPlayerSelect,
    onPassGrade,
    onToggleWeakPasser,
    onUndo,
    canUndo
}) => {
    const dotTypes: DotType[] = ['kill', 'error', 'ace', 'serviceError', 'block'];

    return (
        <div className="w-48 bg-slate-900 border-r border-slate-800 p-3 flex flex-col gap-4 overflow-y-auto">
            {/* Mode Selection */}
            <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Mode</h3>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setMode('dot')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${mode === 'dot'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        <Circle size={16} />
                        <span>Place Dots</span>
                    </button>
                    <button
                        onClick={() => setMode('pass')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${mode === 'pass'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        <Hand size={16} />
                        <span>Grade Pass</span>
                    </button>
                </div>
            </div>

            {/* Rotation */}
            {hasLineup && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Rotation</h3>
                    <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3, 4, 5, 6].map(rot => (
                            <button
                                key={rot}
                                onClick={() => onRotationChange(rot)}
                                className={`py-2 rounded text-sm font-medium transition-all ${currentRotation === rot
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                R{rot}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Dot Types */}
            {mode === 'dot' && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Dot Type</h3>
                    <div className="flex flex-col gap-1">
                        {dotTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveDotType(type)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${activeDotType === type
                                        ? 'ring-2 ring-white bg-slate-700'
                                        : 'bg-slate-800 hover:bg-slate-700'
                                    }`}
                            >
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: SCOUT_DOT_COLORS[type] }}
                                />
                                <span className="text-white">{SCOUT_DOT_LABELS[type]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Undo */}
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Undo2 size={14} />
                        <span>Undo Last</span>
                    </button>
                </div>
            )}

            {/* Pass Grading */}
            {mode === 'pass' && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                        {selectedPlayerId ? 'Grade Pass' : 'Select Player'}
                    </h3>

                    {selectedPlayerId ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                                <span className="text-white font-medium">
                                    #{players.find(p => p.id === selectedPlayerId)?.number}
                                </span>
                                <button
                                    onClick={() => onPlayerSelect(null)}
                                    className="text-xs text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1">
                                {([0, 1, 2, 3] as PassGrade[]).map(grade => (
                                    <button
                                        key={grade}
                                        onClick={() => onPassGrade(selectedPlayerId, grade)}
                                        className={`py-3 rounded-lg text-lg font-bold transition-all ${grade === 0 ? 'bg-red-600 hover:bg-red-500' :
                                                grade === 1 ? 'bg-orange-600 hover:bg-orange-500' :
                                                    grade === 2 ? 'bg-yellow-600 hover:bg-yellow-500' :
                                                        'bg-emerald-600 hover:bg-emerald-500'
                                            } text-white`}
                                    >
                                        {grade}
                                    </button>
                                ))}
                            </div>

                            <div className="text-xs text-slate-500 space-y-0.5 mt-2">
                                <p>0 = Ace/Overpass</p>
                                <p>1 = Out of system</p>
                                <p>2 = Playable</p>
                                <p>3 = Perfect</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {players.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => onPlayerSelect(player.id)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${player.isWeakPasser
                                            ? 'bg-amber-600 border-amber-400'
                                            : 'bg-slate-700 border-slate-500'
                                        } text-white hover:scale-110`}
                                >
                                    {player.number}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Weak Passer Toggle */}
                    <div className="mt-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Weak Passers</h4>
                        <div className="flex flex-wrap gap-1">
                            {players.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => onToggleWeakPasser(player.id)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${player.isWeakPasser
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {player.isWeakPasser && <AlertTriangle size={10} />}
                                    #{player.number}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-auto pt-4 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Legend</h3>
                <div className="space-y-1">
                    {dotTypes.map(type => (
                        <div key={type} className="flex items-center gap-2 text-xs text-slate-400">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: SCOUT_DOT_COLORS[type] }}
                            />
                            <span>{SCOUT_DOT_LABELS[type]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
