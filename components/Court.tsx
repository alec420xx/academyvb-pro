import React, { useRef, useEffect } from 'react';
import { DrawingPath, PlayerPosition } from '../types';
import { getDistance, getCentroid } from '../utils';

interface CourtProps {
    children?: React.ReactNode;
    paths?: DrawingPath[];
    currentPath?: DrawingPath | null;
    courtRef?: React.RefObject<HTMLDivElement>;
    readOnly?: boolean;
    small?: boolean;
    onMouseDown?: (e: React.MouseEvent | React.TouchEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    playerPositions?: Record<string, PlayerPosition>;
    attacker?: 'left' | 'middle' | 'right' | null;
    hoveredElement?: any;
    cursor?: string;
}

export const Court: React.FC<CourtProps> = ({
    children,
    paths = [],
    currentPath,
    courtRef,
    readOnly = false,
    small = false,
    onMouseDown,
    onDoubleClick,
    playerPositions = {},
    attacker = null,
    hoveredElement = null,
    cursor
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const localRef = useRef<HTMLDivElement>(null);
    const resolvedRef = courtRef || localRef;

    const drawPath = (ctx: CanvasRenderingContext2D, pathData: DrawingPath, width: number, height: number) => {
        const { points, color, type, anchorId, modifiers, widthFactor } = pathData;
        if (points.length < 1) return;

        // SCALING FACTOR: Normalize all drawing dimensions based on court width
        // Base width is approx 600px on desktop. 
        const s = width / 600;

        let drawPoints = points;

        // Resolve Anchoring
        if (anchorId && playerPositions[anchorId]) {
            const anchorPos = playerPositions[anchorId];
            const ax = (anchorPos.x / 100) * width;
            const ay = (anchorPos.y / 100) * height;
            drawPoints = points.map(p => ({
                x: ax + (p.x / 100) * width,
                y: ay + (p.y / 100) * height
            }));
        } else if (anchorId) {
            return;
        } else {
            drawPoints = points.map(p => ({
                x: (p.x / 100) * width,
                y: (p.y / 100) * height
            }));
        }

        if (drawPoints.length < 2 && type !== 'rect') return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // Relative Line Width: 3px at 600px width
        ctx.lineWidth = Math.max(1, 3 * s);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // --- DRAWING LOGIC BASED ON TYPE ---
        if (type === 'rect') {
            const start = drawPoints[0];
            const end = drawPoints[drawPoints.length - 1];
            const w = end.x - start.x;
            const h = end.y - start.y;

            ctx.globalAlpha = 0.3;
            ctx.fillRect(start.x, start.y, w, h);
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = Math.max(1, 1 * s);
            ctx.strokeRect(start.x, start.y, w, h);
        }
        else if (type === 'triangle') {
            if (drawPoints.length < 2) return;
            const start = drawPoints[0];
            const end = drawPoints[drawPoints.length - 1];

            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            const factor = widthFactor || (modifiers?.shift ? 1.2 : 0.6);
            const baseWidth = dist * factor;

            const baseLeftX = end.x + baseWidth / 2 * Math.cos(angle - Math.PI / 2);
            const baseLeftY = end.y + baseWidth / 2 * Math.sin(angle - Math.PI / 2);

            const baseRightX = end.x + baseWidth / 2 * Math.cos(angle + Math.PI / 2);
            const baseRightY = end.y + baseWidth / 2 * Math.sin(angle + Math.PI / 2);

            ctx.moveTo(start.x, start.y);
            ctx.lineTo(baseLeftX, baseLeftY);
            ctx.lineTo(baseRightX, baseRightY);
            ctx.closePath();

            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.stroke();
        }
        else if (type === 'polygon') {
            if (drawPoints.length < 2) return;

            ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
            for (let i = 1; i < drawPoints.length; i++) {
                ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
            }

            if (drawPoints.length > 2) {
                ctx.closePath();
                ctx.globalAlpha = 0.3;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            ctx.stroke();
        }
        else if (type === 'line') {
            if (drawPoints.length < 2) return;
            ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
            ctx.lineTo(drawPoints[1].x, drawPoints[1].y);
            ctx.stroke();
        }
        else {
            // Arrow/Pencil Logic
            if (type === 'arrow' && drawPoints.length > 1) {
                const last = drawPoints[drawPoints.length - 1];

                // STABILIZED ANGLE CALCULATION
                // Look back a certain distance (e.g. 10px scaled) to smooth out touch jitter at the end of stroke
                const lookBackDist = 10 * s;
                let anglePoint = drawPoints[0];

                // Search backwards from the second to last point
                for (let i = drawPoints.length - 2; i >= 0; i--) {
                    const p = drawPoints[i];
                    // Simple distance check
                    const dist = Math.sqrt(Math.pow(last.x - p.x, 2) + Math.pow(last.y - p.y, 2));
                    if (dist >= lookBackDist) {
                        anglePoint = p;
                        break;
                    }
                }

                // Calculate angle based on the stabilized vector
                const dx = last.x - anglePoint.x;
                const dy = last.y - anglePoint.y;
                let angle = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);

                // Fallback for very short lines
                if (drawPoints.length > 1 && Math.sqrt(dx * dx + dy * dy) < 1) {
                    const prev = drawPoints[drawPoints.length - 2];
                    angle = Math.atan2(last.y - prev.y, last.x - prev.x);
                }

                // Relative Sizes
                const headLen = 16 * s;
                const headWidth = 14 * s; // Increased from 12 to 14

                // Draw line first (will be underneath arrowhead)
                ctx.beginPath();
                ctx.moveTo(drawPoints[0].x, drawPoints[0].y);

                // Draw smooth curve to the point just before the end
                let lastMidX = drawPoints[0].x;
                let lastMidY = drawPoints[0].y;

                if (drawPoints.length > 2) {
                    for (let i = 1; i < drawPoints.length - 1; i++) {
                        const p1 = drawPoints[i];
                        const p2 = drawPoints[i + 1];
                        const midX = (p1.x + p2.x) / 2;
                        const midY = (p1.y + p2.y) / 2;
                        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                        lastMidX = midX;
                        lastMidY = midY;
                    }
                }

                // Draw line all the way to the tip - arrowhead will cover it
                ctx.lineTo(last.x, last.y);
                ctx.stroke();

                // Draw arrowhead AFTER line so it's on top
                // Make tip slightly extended to ensure it covers any line protrusion
                const tTip = { x: 2, y: 0 }; // Extend tip slightly forward
                const tBackTop = { x: -headLen, y: -headWidth / 2 };
                const tBackBot = { x: -headLen, y: headWidth / 2 };

                const rotate = (p: { x: number, y: number }) => ({
                    x: p.x * Math.cos(angle) - p.y * Math.sin(angle) + last.x,
                    y: p.x * Math.sin(angle) + p.y * Math.cos(angle) + last.y
                });

                const r1 = rotate(tTip);
                const r2 = rotate(tBackTop);
                const r3 = rotate(tBackBot);

                // First, draw a slightly larger background-colored triangle to cover the line
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.moveTo(r1.x, r1.y);
                ctx.lineTo(r2.x, r2.y);
                ctx.lineTo(r3.x, r3.y);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Then draw the actual arrowhead
                ctx.beginPath();
                ctx.moveTo(r1.x, r1.y);
                ctx.lineTo(r2.x, r2.y);
                ctx.lineTo(r3.x, r3.y);
                ctx.closePath();
                ctx.fill();
                return;
            }

            // Standard Pencil Draw
            ctx.beginPath();
            let p0 = drawPoints[0];
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < drawPoints.length - 1; i++) {
                const p1 = drawPoints[i];
                const p2 = drawPoints[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            ctx.stroke();
        }
    };

    const drawUIOverlay = (ctx: CanvasRenderingContext2D, hoveredElement: any, width: number, height: number) => {
        if (!hoveredElement) return;
        const { index, type, vertexIndex } = hoveredElement;
        const path = paths[index];
        if (!path) return;

        const s = width / 600;

        // Draw vertices
        let drawPoints = path.points.map(p => ({
            x: (p.x / 100) * width,
            y: (p.y / 100) * height
        }));

        if (path.anchorId && playerPositions[path.anchorId]) {
            const anchorPos = playerPositions[path.anchorId];
            const ax = (anchorPos.x / 100) * width;
            const ay = (anchorPos.y / 100) * height;
            drawPoints = path.points.map(p => ({
                x: ax + (p.x / 100) * width,
                y: ay + (p.y / 100) * height
            }));
        }

        ctx.save();

        if (path.type === 'polygon' || path.type === 'line' || path.type === 'triangle') {
            drawPoints.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6 * s, 0, Math.PI * 2);
                ctx.fillStyle = (type === 'vertex' && vertexIndex === i) ? '#3b82f6' : 'white';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 2 * s;
                ctx.fill();
                ctx.stroke();
            });
        }

        let center = { x: 0, y: 0 };
        if (path.type === 'line') {
            center = {
                x: (drawPoints[0].x + drawPoints[drawPoints.length - 1].x) / 2,
                y: (drawPoints[0].y + drawPoints[drawPoints.length - 1].y) / 2
            };
        } else if (path.type === 'arrow' || path.type === 'draw') {
            const midIdx = Math.floor(drawPoints.length / 2);
            center = drawPoints[midIdx];
        } else {
            center = getCentroid(drawPoints);
        }

        const btnRadius = 12 * s;
        const spacing = 18 * s;

        // Delete Button
        const delX = center.x + spacing;
        const delY = center.y;
        ctx.beginPath();
        ctx.arc(delX, delY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(delX - 4 * s, delY - 4 * s);
        ctx.lineTo(delX + 4 * s, delY + 4 * s);
        ctx.moveTo(delX + 4 * s, delY - 4 * s);
        ctx.lineTo(delX - 4 * s, delY + 4 * s);
        ctx.stroke();

        // Move Button
        const moveX = center.x - spacing;
        const moveY = center.y;

        ctx.beginPath();
        ctx.arc(moveX, moveY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        // Draw 4-way arrow icon
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5 * s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const r = 5 * s; // Arrow radius

        ctx.beginPath();
        // Horizontal
        ctx.moveTo(moveX - r, moveY);
        ctx.lineTo(moveX + r, moveY);
        // Left Arrow Head
        ctx.moveTo(moveX - r + 2 * s, moveY - 2 * s);
        ctx.lineTo(moveX - r, moveY);
        ctx.lineTo(moveX - r + 2 * s, moveY + 2 * s);
        // Right Arrow Head
        ctx.moveTo(moveX + r - 2 * s, moveY - 2 * s);
        ctx.lineTo(moveX + r, moveY);
        ctx.lineTo(moveX + r - 2 * s, moveY + 2 * s);

        // Vertical
        ctx.moveTo(moveX, moveY - r);
        ctx.lineTo(moveX, moveY + r);
        // Top Arrow Head
        ctx.moveTo(moveX - 2 * s, moveY - r + 2 * s);
        ctx.lineTo(moveX, moveY - r);
        ctx.lineTo(moveX + 2 * s, moveY - r + 2 * s);
        // Bottom Arrow Head
        ctx.moveTo(moveX - 2 * s, moveY + r - 2 * s);
        ctx.lineTo(moveX, moveY + r);
        ctx.lineTo(moveX + 2 * s, moveY + r - 2 * s);

        ctx.stroke();

        ctx.restore();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = resolvedRef?.current || canvas?.parentElement;

        if (!canvas || !container) return;

        const render = () => {
            // Use clientWidth/Height (inner size excluding border) instead of getBoundingClientRect
            // This ensures correct dimensions even when the parent element is scaled using CSS transform
            // which happens in the Plan Print View.
            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width === 0 || height === 0) return;

            const dpr = window.devicePixelRatio || 1;

            if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.scale(dpr, dpr);

                if (paths) {
                    paths.forEach(path => {
                        drawPath(ctx, path, width, height);
                    });
                }
                if (currentPath && currentPath.points.length > 0) {
                    drawPath(ctx, currentPath, width, height);
                }

                if (!readOnly && hoveredElement) {
                    drawUIOverlay(ctx, hoveredElement, width, height);
                }
            }
        };

        const observer = new ResizeObserver(() => {
            window.requestAnimationFrame(render);
        });

        observer.observe(container);
        render(); // Initial draw

        return () => observer.disconnect();
    }, [paths, currentPath, resolvedRef, small, playerPositions, hoveredElement]);

    // Dynamic cursor logic
    const defaultCursor = !small ? 'cursor-crosshair' : 'cursor-default';
    const finalCursor = cursor || defaultCursor;

    return (
        <div
            ref={resolvedRef}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            onDoubleClick={onDoubleClick}
            id={!small ? "court-capture-area" : undefined}
            className={`relative w-full bg-[#f0f4f8] ${!small ? 'shadow-sm' : ''} border-2 border-slate-900 aspect-square ${finalCursor} select-none bg-white`}
            style={{ touchAction: 'none', aspectRatio: '1 / 1' }}
        >
            {/* Background */}
            <div className="absolute inset-0 bg-[#fff] pointer-events-none"></div>
            <div className="absolute left-[15%] right-[15%] top-[15%] bottom-[15%] border-2 border-slate-900 pointer-events-none z-10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 flex items-center justify-center"></div>
                <div className="absolute top-[33.33%] left-0 right-0 h-px bg-slate-900"></div>
            </div>
            {attacker && (
                <div
                    className={`absolute top-[13%] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-600 z-20 animate-bounce`}
                    style={{
                        left: attacker === 'left' ? '80%' : attacker === 'right' ? '20%' : '50%',
                        transform: 'translateX(-50%)'
                    }}
                ></div>
            )}
            <canvas ref={canvasRef} className="absolute inset-0 z-20 w-full h-full pointer-events-none" />
            <div className={`relative z-30 w-full h-full ${readOnly ? 'pointer-events-none' : ''}`}>
                {children}
            </div>
        </div>
    );
};