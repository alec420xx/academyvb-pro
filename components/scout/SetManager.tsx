import React from 'react';
import { X, Plus, Calendar, Target } from 'lucide-react';
import { ScoutSet } from '../../types';

interface SetManagerProps {
    sets: ScoutSet[];
    currentSetId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onClose: () => void;
}

export const SetManager: React.FC<SetManagerProps> = ({
    sets,
    currentSetId,
    onSelect,
    onCreate,
    onClose
}) => {
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white">Scouting Sets</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* New Set Button */}
                    <button
                        onClick={() => {
                            onCreate();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                    >
                        <Plus size={18} />
                        <span>Start New Set</span>
                    </button>

                    {/* Set List */}
                    {sets.length > 0 ? (
                        <div className="space-y-2">
                            {sets.slice().reverse().map(set => (
                                <button
                                    key={set.id}
                                    onClick={() => onSelect(set.id)}
                                    className={`w-full p-3 rounded-lg border text-left transition-all ${set.id === currentSetId
                                            ? 'bg-blue-900/30 border-blue-600'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} className="text-slate-400" />
                                            <span className="font-medium text-white">Set {set.setNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar size={12} />
                                            {formatDate(set.date)}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex gap-3 text-xs text-slate-400">
                                        <span>{set.courtDots.length} dots</span>
                                        <span>{set.passEvents.length} passes</span>
                                        <span>{set.attackEvents.length} attacks</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-4">
                            No sets recorded yet. Start scouting!
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
