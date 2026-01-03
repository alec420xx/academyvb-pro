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
  const sizeClasses = small ? "w-7 h-7 text-[10px] border" : "w-11 h-11 md:w-14 md:h-14 border-2";
  const tokenColorClass = getRoleColor(player.role);

  // Position logic handling for Export vs Interactive
  const positionStyle: React.CSSProperties = {};
  
  if (x !== undefined && !isGhost) {
      positionStyle.left = `${x}%`;
      positionStyle.top = `${y}%`;
      
      if (small) {
          // Use margins for export stability (half of w-7 = 14px)
          positionStyle.marginLeft = '-14px';
          positionStyle.marginTop = '-14px';
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
      {small ? (
        // Small token (print view) - just centered number
        <span className="font-black text-[11px] leading-none pointer-events-none select-none" style={{ marginTop: '-1px' }}>{player.number}</span>
      ) : (
        // Normal token - number + role
        <>
          <div className="flex flex-col items-center justify-center pointer-events-none select-none" style={{ marginTop: '-2px' }}>
            <span className="font-black text-sm md:text-lg leading-none">{player.number}</span>
          </div>
          <span className="absolute bottom-0.5 left-0 right-0 text-center uppercase tracking-tighter font-bold text-[8px] md:text-[9px] opacity-90 pointer-events-none select-none">{player.role}</span>
        </>
      )}
    </div>
  );
};