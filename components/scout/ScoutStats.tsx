import React, { useMemo } from 'react';
import { X, TrendingUp, Target, Users } from 'lucide-react';
import { ScoutOpponent, ScoutSet } from '../../types';
import { calculateOpponentStats } from '../../utils';
import { SCOUT_DOT_COLORS, SCOUT_DOT_LABELS } from '../../constants';

interface ScoutStatsProps {
    opponent: ScoutOpponent;
    currentSet: ScoutSet | null;
    onClose: () => void;
}

export const ScoutStats: React.FC<ScoutStatsProps> = ({
    opponent,
    currentSet,
    onClose
}) => {
    // Calculate aggregate stats
    const stats = useMemo(() => calculateOpponentStats(opponent), [opponent]);

    // Calculate current set stats if available
    const setStats = useMemo(() => {
        if (!currentSet) return null;

        const passEvents = currentSet.passEvents;
        const attackEvents = currentSet.attackEvents;
        const dots = currentSet.courtDots;

        return {
            passCount: passEvents.length,
            avgPassGrade: passEvents.length > 0
                ? passEvents.reduce((sum, e) => sum + e.grade, 0) / passEvents.length
                : 0,
            attackCount: attackEvents.length,
            kills: attackEvents.filter(e => e.outcome === 'kill').length,
            errors: attackEvents.filter(e => e.outcome === 'error').length,
            dotCounts: {
                kill: dots.filter(d => d.type === 'kill').length,
                error: dots.filter(d => d.type === 'error').length,
                ace: dots.filter(d => d.type === 'ace').length,
                serviceError: dots.filter(d => d.type === 'serviceError').length,
                block: dots.filter(d => d.type === 'block').length,
            }
        };
    }, [currentSet]);

    return (
        <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
                <h3 className="font-semibold text-white">Statistics</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Current Set Stats */}
                {setStats && currentSet && (
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <Target size={12} />
                            Set {currentSet.setNumber}
                        </h4>
                        <div className="bg-slate-800 rounded-lg p-3 space-y-3">
                            {/* Dot counts */}
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Point Markers</p>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    {Object.entries(setStats.dotCounts).map(([type, count]) => (
                                        <div key={type} className="flex items-center gap-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: SCOUT_DOT_COLORS[type as keyof typeof SCOUT_DOT_COLORS] }}
                                            />
                                            <span className="text-slate-300">{SCOUT_DOT_LABELS[type as keyof typeof SCOUT_DOT_LABELS]}:</span>
                                            <span className="text-white font-medium">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pass stats */}
                            {setStats.passCount > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Passing</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300 text-sm">Avg Grade:</span>
                                        <span className={`text-lg font-bold ${setStats.avgPassGrade >= 2.5 ? 'text-emerald-400' :
                                                setStats.avgPassGrade >= 1.5 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {setStats.avgPassGrade.toFixed(1)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">{setStats.passCount} passes tracked</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Season/Cumulative Stats */}
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <TrendingUp size={12} />
                        Season Totals ({stats.totalSets} sets)
                    </h4>

                    {stats.totalSets > 0 ? (
                        <div className="space-y-3">
                            {/* Overall Dots */}
                            <div className="bg-slate-800 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-2">All Point Markers</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCOUT_DOT_COLORS.kill }} />
                                        <span className="text-slate-300">Kills:</span>
                                        <span className="text-white font-medium">{stats.dots.kills.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCOUT_DOT_COLORS.error }} />
                                        <span className="text-slate-300">Errors:</span>
                                        <span className="text-white font-medium">{stats.dots.errors.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCOUT_DOT_COLORS.ace }} />
                                        <span className="text-slate-300">Aces:</span>
                                        <span className="text-white font-medium">{stats.dots.aces.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCOUT_DOT_COLORS.block }} />
                                        <span className="text-slate-300">Blocks:</span>
                                        <span className="text-white font-medium">{stats.dots.blocks.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Passing */}
                            {stats.passStats.total > 0 && (
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 mb-2">Passing ({stats.passStats.total} tracked)</p>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-slate-300">Team Avg:</span>
                                        <span className={`text-xl font-bold ${stats.passStats.avgGrade >= 2.5 ? 'text-emerald-400' :
                                                stats.passStats.avgGrade >= 1.5 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {stats.passStats.avgGrade.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Per-player pass stats */}
                                    <div className="space-y-1">
                                        {Object.entries(stats.passStats.byPlayer)
                                            .sort((a, b) => a[1].avg - b[1].avg) // Sort worst to best
                                            .map(([playerId, pStats]) => {
                                                const player = opponent.players.find(p => p.id === playerId);
                                                if (!player) return null;
                                                return (
                                                    <div key={playerId} className="flex items-center justify-between text-xs">
                                                        <span className={`${player.isWeakPasser ? 'text-amber-400' : 'text-slate-300'}`}>
                                                            #{player.number}
                                                            {player.isWeakPasser && ' ⚠️'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500">{pStats.total}p</span>
                                                            <span className={`font-medium ${pStats.avg >= 2.5 ? 'text-emerald-400' :
                                                                    pStats.avg >= 1.5 ? 'text-yellow-400' :
                                                                        'text-red-400'
                                                                }`}>
                                                                {pStats.avg.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Attack stats */}
                            {stats.attackStats.total > 0 && (
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 mb-2">Attacking ({stats.attackStats.total} tracked)</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-slate-400 text-xs">Kill %</span>
                                            <p className="text-emerald-400 font-bold">{stats.attackStats.killPct.toFixed(1)}%</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Error %</span>
                                            <p className="text-red-400 font-bold">{stats.attackStats.errorPct.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                            No data yet. Start scouting!
                        </p>
                    )}
                </div>

                {/* Weak Passers */}
                {opponent.players.some(p => p.isWeakPasser) && (
                    <div>
                        <h4 className="text-xs font-semibold text-amber-400 uppercase mb-2 flex items-center gap-2">
                            <Users size={12} />
                            Weak Passers
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {opponent.players
                                .filter(p => p.isWeakPasser)
                                .map(player => (
                                    <div
                                        key={player.id}
                                        className="px-2 py-1 bg-amber-900/50 border border-amber-600 rounded text-sm"
                                    >
                                        <span className="text-amber-200 font-medium">#{player.number}</span>
                                        {player.name && (
                                            <span className="text-amber-300/70 ml-1">{player.name}</span>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
