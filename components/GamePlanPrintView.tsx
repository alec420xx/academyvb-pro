import React from 'react';
import { Team, Lineup, Player, DrawingPath, PlayerPosition, GameMode, SavedRotationData } from '../types';
import { Court } from './Court';
import { RotationSquare } from './RotationSquare';
import { PlayerToken } from './PlayerToken';
import { ClubLogo } from './Icons';
import { OFFENSE_PHASES, DEFENSE_PHASES } from '../constants';
import { getStorageKey, calculateDefaultPositions } from '../utils';

interface GamePlanPrintViewProps {
    teams: Team[];
    currentTeamId: string | null;
    lineups: Lineup[];
    currentLineupId: string | null;
    roster: Player[];
    savedRotations: Record<string, SavedRotationData>;
    currentRotation: number;
    currentPhase: string;
    playerPositions: Record<string, PlayerPosition>;
    paths: DrawingPath[];
    activePlayerIds: string[];
    gameMode: GameMode;
    startRotation?: number;
    visiblePhases?: string[];
}

export const GamePlanPrintView: React.FC<GamePlanPrintViewProps> = ({
    teams,
    currentTeamId,
    lineups,
    currentLineupId,
    roster,
    savedRotations,
    currentRotation,
    currentPhase,
    playerPositions,
    paths,
    activePlayerIds,
    gameMode,
    startRotation = 1,
    visiblePhases
}) => {
    // Generate the rotation order array based on startRotation (e.g. 2,3,4,5,6,1)
    const rotationsList = Array.from({ length: 6 }, (_, i) => {
        const val = (startRotation - 1 + i) % 6 + 1;
        return val;
    });

    const allPhases = gameMode === 'offense' ? OFFENSE_PHASES : DEFENSE_PHASES;
    const finalPhases = visiblePhases && visiblePhases.length > 0
        ? allPhases.filter(p => visiblePhases.includes(p.id))
        : allPhases;

    // Dynamic grid columns based on number of visible phases
    const gridColsClass =
        finalPhases.length <= 2 ? 'grid-cols-1' : // Stack phases vertically for 1 or 2 selections
            finalPhases.length === 3 ? 'grid-cols-3' :
                'grid-cols-4';

    const useCompactGrid = finalPhases.length <= 2;

    return (
        <div className="bg-white text-slate-900 w-[1224px] h-[1584px] p-6 relative flex flex-col box-border shadow-2xl origin-top-left overflow-hidden">
            {/* Page Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-4 flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[400px] flex flex-col">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="text-red-600"><ClubLogo size={56} /></div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight">GAME PLAN</h1>
                    </div>
                    {/* BIG TEAM NAME HEADER + MODE */}
                    <h1 className="text-4xl font-black text-slate-900 uppercase mt-4 mb-2 max-w-[800px] leading-normal pb-1">
                        {teams.find(t => t.id === currentTeamId)?.name} <span className={gameMode === 'offense' ? "text-red-600" : "text-blue-600"}>{gameMode}</span>
                    </h1>
                    <h2 className="text-2xl font-bold text-slate-500 uppercase max-w-[800px] leading-normal pb-1">
                        {lineups.find(l => l.id === currentLineupId)?.name}
                    </h2>
                </div>
                {/* Full Roster Summary - DYNAMIC ROWS */}
                <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg w-auto min-w-[200px]">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b pb-1">Full Roster</div>
                    <div className="grid gap-x-8 gap-y-1" style={{ gridTemplateRows: 'repeat(3, min-content)', gridAutoFlow: 'column' }}>
                        {roster.map((p, i) => (
                            <div key={p.id} className="text-xs flex justify-between gap-3 min-w-[120px] leading-relaxed">
                                <span className="font-bold text-slate-700 w-6 shrink-0">{p.number}</span>
                                <span className="text-slate-500">{p.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid - Dynamic Layout */}
            <div className={`flex-1 min-h-0 ${useCompactGrid ? 'grid grid-cols-2 gap-6 pb-2' : 'flex flex-col'}`}>
                {rotationsList.map((rot, idx) => (
                    <div key={rot} className={`
                        flex gap-2 min-h-0 
                        ${useCompactGrid
                            ? 'border border-slate-200 rounded-lg p-3 shadow-sm bg-slate-50/50'
                            : `flex-1 py-2 ${idx !== 5 ? 'border-b border-slate-200' : ''}`
                        }
                    `}>
                        <div className="w-24 flex-none flex flex-col items-center justify-center gap-1 border-r border-slate-200 pr-2">
                            <div className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm pb-[2px] leading-none pt-0.5">R{rot}</div>
                            <div className="w-20 h-20">
                                <RotationSquare rotation={rot} roster={roster} />
                            </div>
                        </div>
                        <div className={`flex-1 grid ${gridColsClass}`}>
                            {finalPhases.map((phase, i) => {
                                const key = getStorageKey(rot, phase.id, gameMode);
                                let data: SavedRotationData | undefined = savedRotations[key];
                                if (rot === currentRotation && phase.id === currentPhase && gameMode === gameMode) {
                                    data = { positions: playerPositions, paths: paths, activePlayers: activePlayerIds, notes: data?.notes };
                                }
                                let validData = true;
                                if (data && data.positions) {
                                    const savedIDs = Object.keys(data.positions);
                                    const existingCount = savedIDs.filter(id => roster.find(p => p.id === id)).length;
                                    if (existingCount < 6) validData = false;
                                } else {
                                    validData = false;
                                }
                                if (!validData || !data) {
                                    data = { positions: calculateDefaultPositions(rot, roster), paths: [], activePlayers: [] };
                                }
                                return (
                                    <div key={phase.id} className={`flex flex-col h-full min-h-0 ${i < finalPhases.length - 1 && !useCompactGrid ? 'border-r border-slate-200' : ''} ${useCompactGrid ? 'border-b border-slate-100 last:border-0 pb-1 mb-1' : 'px-2'}`}>
                                        <div className="text-center font-bold text-[10px] uppercase text-slate-500 tracking-wider mb-1 leading-normal pb-0.5">{phase.label}</div>
                                        {/* Main Content Row: Court + Notes */}
                                        <div className="flex-1 flex flex-row items-center border border-slate-100 rounded-sm overflow-hidden bg-white">
                                            {/* Court */}
                                            <div className="flex-none p-0 relative h-full aspect-square">
                                                <div className="w-full h-full">
                                                    <Court small={true} paths={data.paths || []} readOnly={true} playerPositions={data.positions || {}} attacker={phase.attacker}>
                                                        {Object.entries(data.positions || {}).map(([id, pos]) => {
                                                            const player = roster.find(p => p.id === id);
                                                            if (!player) return null;
                                                            return <PlayerToken key={id} player={player} x={pos.x} y={pos.y} small={true} style={{ marginTop: '-1px' }} />;
                                                        })}
                                                    </Court>
                                                </div>
                                            </div>
                                            {/* Notes Side Panel */}
                                            <div className="flex-1 h-full bg-slate-50 p-2 border-l border-slate-100 flex flex-col justify-start">
                                                <div className={`text-[9px] leading-relaxed text-slate-700 whitespace-pre-wrap overflow-hidden h-full ${useCompactGrid ? 'text-xs' : ''}`}>
                                                    {data.notes || <span className="text-slate-300 italic">...</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-400 uppercase shrink-0">
                <div>Generated by ACADEMYVB PRO</div>
                <div>{new Date().toLocaleDateString()}</div>
            </div>
        </div>
    );
};