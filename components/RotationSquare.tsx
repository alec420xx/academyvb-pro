import React from 'react';
import { Player } from '../types';
import { getPlayerZone } from '../utils';

interface RotationSquareProps {
    rotation: number;
    roster: Player[];
    small?: boolean;
}

export const RotationSquare: React.FC<RotationSquareProps> = ({ rotation, roster, small = false }) => {
  const zones: Record<number, Player> = {};
  roster.slice(0,6).forEach((player, idx) => {
      const z = getPlayerZone(idx, rotation);
      zones[z] = player;
  });

  const innerBorderClass = small ? "border-slate-900" : "border-slate-900";
  const borderThickness = small ? "border" : "border-2";

  const renderCell = (zoneId: number, cellBorderClasses: string) => {
      const p = zones[zoneId];
      return (
          <div className={`flex flex-col items-center justify-center ${cellBorderClasses} bg-white h-full overflow-hidden p-0.5 w-full relative z-0`}>
              <div className="font-black text-slate-900 text-[12px] sm:text-[14px] leading-none mb-0.5 truncate w-full text-center">{p ? p.number : '-'}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase leading-none truncate w-full text-center">{p ? p.role : ''}</div>
          </div>
      );
  };

  return (
    <div className="w-full h-full aspect-square relative rounded-sm overflow-hidden bg-slate-900">
        <div className="absolute inset-0 flex flex-col bg-white">
             <div className={`flex-1 flex border-b ${innerBorderClass} min-h-0`}>
                <div className="flex-1 min-w-0">{renderCell(4, `border-r ${innerBorderClass}`)}</div>
                <div className="flex-1 min-w-0">{renderCell(3, `border-r ${innerBorderClass}`)}</div>
                <div className="flex-1 min-w-0">{renderCell(2, "")}</div>
            </div>
            <div className="flex-1 flex min-h-0">
                <div className="flex-1 min-w-0">{renderCell(5, `border-r ${innerBorderClass}`)}</div>
                <div className="flex-1 min-w-0">{renderCell(6, `border-r ${innerBorderClass}`)}</div>
                <div className="flex-1 min-w-0">{renderCell(1, "")}</div>
            </div>
        </div>
        {/* Overlay Border to hide any sub-pixel rendering gaps */}
        <div className={`absolute inset-0 ${borderThickness} border-slate-900 rounded-sm pointer-events-none z-10`}></div>
    </div>
  );
};