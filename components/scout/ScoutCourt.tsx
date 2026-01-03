import React, { useRef, useEffect, useState } from 'react';
import { ScoutPlayer, CourtDot, DotType, PlayerPosition } from '../../types';
import { SCOUT_DOT_COLORS } from '../../constants';
import { ScoutMode } from './ScoutPage';

interface ScoutCourtProps {
    players: ScoutPlayer[];
    positions: Record<string, PlayerPosition>;
    dots: CourtDot[];
    mode: ScoutMode;
    activeDotType: DotType;
    selectedPlayerId: string | null;
    onDotPlaced: (position: PlayerPosition, type: DotType) => void;
    onPlayerClick: (playerId: string) => void;
    onPlayerDrag: (playerId: string, position: PlayerPosition) => void;
}

export const ScoutCourt: React.FC<ScoutCourtProps> = ({
    players,
    positions,
    dots,
    mode,
    activeDotType,
    selectedPlayerId,
    onDotPlaced,
    onPlayerClick,
    onPlayerDrag
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Maintain 3:2 aspect ratio
                const maxWidth = rect.width - 32;
                const maxHeight = rect.height - 32;
                const aspectRatio = 3 / 2;

                let width = maxWidth;
                let height = width / aspectRatio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }

                setDimensions({ width: Math.floor(width), height: Math.floor(height) });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Draw court and dots
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = dimensions;
        const s = width / 600;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Court background
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 0, width, height);

        // Court lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * s;

        // Outer boundary
        ctx.strokeRect(2 * s, 2 * s, width - 4 * s, height - 4 * s);

        // Net line (center)
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Attack line (3m line) - approximately 1/3 from net
        const attackLineY = height * 0.35;
        ctx.setLineDash([10 * s, 5 * s]);
        ctx.beginPath();
        ctx.moveTo(0, attackLineY);
        ctx.lineTo(width, attackLineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone lines (vertical)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(width / 3, 0);
        ctx.lineTo(width / 3, height);
        ctx.moveTo(2 * width / 3, 0);
        ctx.lineTo(2 * width / 3, height);
        ctx.stroke();

        // Draw dots
        dots.forEach(dot => {
            const x = (dot.position.x / 100) * width;
            const y = (dot.position.y / 100) * height;
            const radius = 10 * s;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = SCOUT_DOT_COLORS[dot.type];
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * s;
            ctx.stroke();
        });

    }, [dimensions, dots]);

    // Handle court click for dot placement
    const handleCourtClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'dot' || draggedPlayer) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        onDotPlaced({ x, y }, activeDotType);
    };

    // Handle player drag
    const handlePlayerDragStart = (playerId: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setDraggedPlayer(playerId);
    };

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggedPlayer) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            if (e.touches.length === 0) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Calculate position relative to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();

        const x = Math.max(0, Math.min(100, ((clientX - canvasRect.left) / canvasRect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - canvasRect.top) / canvasRect.height) * 100));

        onPlayerDrag(draggedPlayer, { x, y });
    };

    const handleDragEnd = () => {
        setDraggedPlayer(null);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center"
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchMove={handleDrag}
            onTouchEnd={handleDragEnd}
        >
            <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
                {/* Canvas for court and dots */}
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    onClick={handleCourtClick}
                    onTouchStart={handleCourtClick}
                    className="rounded-lg cursor-crosshair"
                    style={{ touchAction: 'none' }}
                />

                {/* Player tokens */}
                {players.map(player => {
                    const pos = positions[player.id];
                    if (!pos) return null;

                    const isSelected = selectedPlayerId === player.id;
                    const isDragging = draggedPlayer === player.id;

                    return (
                        <div
                            key={player.id}
                            className={`absolute flex items-center justify-center rounded-full cursor-grab select-none transition-transform ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''
                                } ${isDragging ? 'scale-110 cursor-grabbing z-20' : 'z-10'
                                } ${player.isWeakPasser ? 'bg-amber-600 border-amber-400' : 'bg-slate-600 border-slate-400'
                                } border-2`}
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                width: Math.max(36, dimensions.width / 14),
                                height: Math.max(36, dimensions.width / 14),
                                fontSize: Math.max(12, dimensions.width / 40),
                                touchAction: 'none'
                            }}
                            onMouseDown={(e) => handlePlayerDragStart(player.id, e)}
                            onTouchStart={(e) => handlePlayerDragStart(player.id, e)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (mode === 'pass') {
                                    onPlayerClick(player.id);
                                }
                            }}
                        >
                            <span className="font-bold text-white">{player.number}</span>
                        </div>
                    );
                })}

                {/* Dot placement indicator */}
                {mode === 'dot' && (
                    <div
                        className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 bg-slate-900/80 rounded text-xs text-white"
                    >
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: SCOUT_DOT_COLORS[activeDotType] }}
                        />
                        <span>Tap to place {activeDotType}</span>
                    </div>
                )}

                {/* Pass mode indicator */}
                {mode === 'pass' && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/80 rounded text-xs text-white">
                        Tap player to grade pass
                    </div>
                )}
            </div>
        </div>
    );
};
