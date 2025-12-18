import React from 'react';
import { Player } from '../types';
import { getRoleColor } from '../constants';

interface PlayerTokenProps {
  player: Player;
  x?: number;
  y?: number;
  isDragging?: boolean;
  isBench?: boolean;
  style?: React.CSSProperties;
  small?: boolean;
  isSelected?: boolean;
  isInteractive?: boolean;
  onStartInteraction?: (e: React.MouseEvent | React.TouchEvent, playerId: string, isBench: boolean) => void;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ 
  player, 
  x, 
  y, 
  isDragging, 
  isBench = false, 
  style, 
  small = false, 
  isSelected,
  isInteractive = true,
  onStartInteraction 
}) => {
  const isGhost = style?.position === 'fixed';
  const sizeClasses = small ? "w-5 h-5 text-[8px] border" : "w-11 h-11 md:w-14 md:h-14 border-2";
  const tokenColorClass = getRoleColor(player.role);

  // Position logic handling for Export vs Interactive
  const positionStyle: React.CSSProperties = {};
  
  if (x !== undefined && !isGhost) {
      positionStyle.left = `${x}%`;
      positionStyle.top = `${y}%`;
      
      if (small) {
          // Use margins for export stability
          positionStyle.marginLeft = '-10px';
          positionStyle.marginTop = '-10px';
          positionStyle.transform = 'none';
      } else {
          // Use transform3d for smooth dragging interactions and SAFARI fixes
          positionStyle.transform = 'translate3d(-50%, -50%, 0)';
      }
  } else {
      // Fallback/Ghost/Bench dragging
      if (style) {
          positionStyle.left = style.left;
          positionStyle.top = style.top;
          positionStyle.transform = style.transform || 'translate(-50%, -50%)';
          positionStyle.position = style.position;
      }
  }

  // Interaction classes
  const interactionClasses = isInteractive 
    ? 'pointer-events-auto hover:scale-105 cursor-grab active:cursor-grabbing' 
    : 'pointer-events-none';

  return (
    <div
      onMouseDown={(e) => {
        if (isInteractive && onStartInteraction) onStartInteraction(e, player.id, isBench);
      }}
      onTouchStart={(e) => {
        if (isInteractive && onStartInteraction) onStartInteraction(e, player.id, isBench);
      }}
      className={`
        ${isGhost ? 'fixed z-[100] shadow-2xl scale-110 pointer-events-none' : `absolute transition-transform ${interactionClasses}`}
        ${sizeClasses} rounded-full flex items-center justify-center shadow-sm
        ${isDragging ? 'opacity-50' : ''} 
        ${tokenColorClass} 
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 z-50' : ''}
        font-sans z-40
      `}
      style={{ ...positionStyle, touchAction: 'none' }}
    >
      <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none select-none leading-none -mt-[1px]">
        <span className={`${small ? 'font-black text-[9px]' : 'font-black text-sm md:text-lg'} drop-shadow-none`} style={{ lineHeight: '1' }}>{player.number}</span>
        <span className={`uppercase tracking-tighter font-bold ${small ? 'text-[6px]' : 'text-[8px] md:text-[9px] opacity-90'}`} style={{ lineHeight: '1' }}>{player.role}</span>
      </div>
    </div>
  );
};