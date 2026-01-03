import React, { useRef, useEffect, useState } from 'react';
import { ScoutPlayer, CourtDot, DotType, PlayerPosition } from '../../types';
import { SCOUT_DOT_COLORS } from '../../constants';
import { ScoutMode } from './ScoutPage';

interface ScoutFullCourtProps {
    players: ScoutPlayer[];
    positions: Record<string, PlayerPosition>;
    dots: CourtDot[];
    currentRotation: number;
    mode: ScoutMode;
    activeDotType: DotType;
    selectedPlayerId: string | null;
    onDotPlaced: (position: PlayerPosition, type: DotType) => void;
    onPlayerClick: (playerId: string) => void;
    onPlayerDrag: (playerId: string, position: PlayerPosition) => void;
    onRotationChange: (rotation: number) => void;
}

/**
 * Full court view showing:
 * - Opponent's side (top) with their 6 zones and players
 * - Your side (bottom) - empty, just for reference
 * - Net in the middle
 * - Zone labels and lines
 */
export const ScoutFullCourt: React.FC<ScoutFullCourtProps> = ({
    players,
    positions,
    dots,
    currentRotation,
    mode,
    activeDotType,
    selectedPlayerId,
    onDotPlaced,
    onPlayerClick,
    onPlayerDrag,
    onRotationChange
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 500, height: 600 });
    const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Aspect ratio: court is roughly 9m x 18m (1:2), but we show it portrait
                const maxWidth = rect.width - 32;
                const maxHeight = rect.height - 32;
                const aspectRatio = 9 / 18; // width / height

                let width = maxWidth;
                let height = width / aspectRatio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }

                // Minimum size
                width = Math.max(300, width);
                height = Math.max(400, height);

                setDimensions({ width: Math.floor(width), height: Math.floor(height) });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Draw court
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = dimensions;
        const s = width / 500; // Scale factor

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Full court background
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 0, width, height);

        // Court lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * s;

        // Outer boundary
        ctx.strokeRect(10 * s, 10 * s, width - 20 * s, height - 20 * s);

        // Net line (center)
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(10 * s, height / 2);
        ctx.lineTo(width - 10 * s, height / 2);
        ctx.stroke();

        // Net label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${12 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('NET', width / 2, height / 2 + 4 * s);

        // Attack lines (3m from net)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * s;
        ctx.setLineDash([8 * s, 4 * s]);

        // Opponent's attack line (top half)
        const oppAttackY = height * 0.35;
        ctx.beginPath();
        ctx.moveTo(10 * s, oppAttackY);
        ctx.lineTo(width - 10 * s, oppAttackY);
        ctx.stroke();

        // Your attack line (bottom half)
        const yourAttackY = height * 0.65;
        ctx.beginPath();
        ctx.moveTo(10 * s, yourAttackY);
        ctx.lineTo(width - 10 * s, yourAttackY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Zone dividing lines (vertical, splitting into 3 columns)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 * s;

        // Vertical lines for opponent's side
        ctx.beginPath();
        ctx.moveTo(width / 3, 10 * s);
        ctx.lineTo(width / 3, height / 2);
        ctx.moveTo(2 * width / 3, 10 * s);
        ctx.lineTo(2 * width / 3, height / 2);
        ctx.stroke();

        // Vertical lines for your side
        ctx.beginPath();
        ctx.moveTo(width / 3, height / 2);
        ctx.lineTo(width / 3, height - 10 * s);
        ctx.moveTo(2 * width / 3, height / 2);
        ctx.lineTo(2 * width / 3, height - 10 * s);
        ctx.stroke();

        // Zone labels - Opponent's side (top)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `bold ${14 * s}px sans-serif`;
        ctx.textAlign = 'center';

        // Front row zones (4, 3, 2) - closer to net
        ctx.fillText('4', width / 6, height * 0.42);
        ctx.fillText('3', width / 2, height * 0.42);
        ctx.fillText('2', 5 * width / 6, height * 0.42);

        // Back row zones (5, 6, 1) - far from net
        ctx.fillText('5', width / 6, height * 0.20);
        ctx.fillText('6', width / 2, height * 0.20);
        ctx.fillText('1', 5 * width / 6, height * 0.20);

        // "OPPONENT" label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `bold ${11 * s}px sans-serif`;
        ctx.fillText('OPPONENT', width / 2, 25 * s);

        // "YOUR TEAM" label
        ctx.fillText('YOUR TEAM', width / 2, height - 15 * s);

        // Draw dots on opponent's side only (top half)
        dots.forEach(dot => {
            // Dots are stored with y in 0-100 range for opponent's side
            // We need to map to top half of court
            const x = (dot.position.x / 100) * (width - 20 * s) + 10 * s;
            const y = (dot.position.y / 100) * (height / 2 - 20 * s) + 10 * s;
            const radius = 8 * s;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = SCOUT_DOT_COLORS[dot.type];
            ctx.globalAlpha = 0.85;
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

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Only allow dots on opponent's side (top half)
        if (canvasY > dimensions.height / 2) return;

        // Convert to percentage (0-100) for opponent's court area
        const padding = 10 * (dimensions.width / 500);
        const courtWidth = dimensions.width - 2 * padding;
        const courtHeight = dimensions.height / 2 - 2 * padding;

        const x = ((canvasX - padding) / courtWidth) * 100;
        const y = ((canvasY - padding) / courtHeight) * 100;

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        onDotPlaced({ x: clampedX, y: clampedY }, activeDotType);
    };

    // Handle player drag
    const handlePlayerDragStart = (playerId: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setDraggedPlayer(playerId);
    };

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggedPlayer) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        let clientX: number, clientY: number;
        if ('touches' in e) {
            if (e.touches.length === 0) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Only allow drag on opponent's side
        if (canvasY > dimensions.height / 2 - 20) return;

        const padding = 10 * (dimensions.width / 500);
        const courtWidth = dimensions.width - 2 * padding;
        const courtHeight = dimensions.height / 2 - 2 * padding;

        const x = Math.max(0, Math.min(100, ((canvasX - padding) / courtWidth) * 100));
        const y = Math.max(0, Math.min(100, ((canvasY - padding) / courtHeight) * 100));

        onPlayerDrag(draggedPlayer, { x, y });
    };

    const handleDragEnd = () => {
        setDraggedPlayer(null);
    };

    // Calculate pixel position for a player
    const getPlayerPixelPosition = (pos: PlayerPosition) => {
        const padding = 10 * (dimensions.width / 500);
        const courtWidth = dimensions.width - 2 * padding;
        const courtHeight = dimensions.height / 2 - 2 * padding;

        return {
            x: (pos.x / 100) * courtWidth + padding,
            y: (pos.y / 100) * courtHeight + padding
        };
    };

    const tokenSize = Math.max(32, dimensions.width / 12);
    const fontSize = Math.max(12, dimensions.width / 35);

    return (
        <div className="flex flex-col h-full">
            {/* Rotation selector bar */}
            <div className="flex items-center justify-center gap-2 py-2 bg-slate-800 rounded-t-lg">
                <span className="text-slate-400 text-sm mr-2">Rotation:</span>
                {[1, 2, 3, 4, 5, 6].map(rot => (
                    <button
                        key={rot}
                        onClick={() => onRotationChange(rot)}
                        className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${currentRotation === rot
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {rot}
                    </button>
                ))}
            </div>

            {/* Court */}
            <div
                ref={containerRef}
                className="flex-1 relative flex items-center justify-center bg-slate-900 rounded-b-lg"
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

                    {/* Player tokens - only on opponent's side */}
                    {players.map(player => {
                        const pos = positions[player.id];
                        if (!pos) return null;

                        const pixelPos = getPlayerPixelPosition(pos);
                        const isSelected = selectedPlayerId === player.id;
                        const isDragging = draggedPlayer === player.id;

                        return (
                            <div
                                key={player.id}
                                className={`absolute flex items-center justify-center rounded-full cursor-grab select-none transition-transform
                                    ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''}
                                    ${isDragging ? 'scale-110 cursor-grabbing z-20' : 'z-10'}
                                    ${player.isWeakPasser ? 'bg-amber-500 border-amber-300' : 'bg-blue-500 border-blue-300'}
                                    border-2 shadow-lg`}
                                style={{
                                    left: pixelPos.x,
                                    top: pixelPos.y,
                                    transform: 'translate(-50%, -50%)',
                                    width: tokenSize,
                                    height: tokenSize,
                                    fontSize: fontSize,
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

                    {/* Mode indicator */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 bg-slate-900/90 rounded text-xs text-white">
                        {mode === 'dot' && (
                            <>
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: SCOUT_DOT_COLORS[activeDotType] }}
                                />
                                <span>Tap opponent's court to place dot</span>
                            </>
                        )}
                        {mode === 'pass' && <span>Tap player to grade pass</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};
