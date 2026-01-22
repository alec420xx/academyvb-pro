import React, { useState, useEffect, useRef } from 'react';
import { Player, DrawingPath, PlayerPosition, GameMode } from '../types';
import { getCentroid, isPointInPolygon, distToSegment, getPlayerZone } from '../utils';

interface UseBoardInteractionProps {
    mode: string;
    drawColor: string;
    roster: Player[];
    activePlayerIds: string[];

    setActivePlayerIds: (ids: string[]) => void;
    currentRotation: number;
    gameMode: GameMode;
    savedPaths?: DrawingPath[];
    savedPositions?: Record<string, PlayerPosition>;
}

export const useBoardInteraction = ({
    mode,
    drawColor,
    roster,
    activePlayerIds,
    setActivePlayerIds,
    currentRotation,
    gameMode,
    savedPaths = [],
    savedPositions = {}
}: UseBoardInteractionProps) => {

    // --- STATE ---
    const [playerPositions, setPlayerPositions] = useState<Record<string, PlayerPosition>>({});
    const [paths, setPaths] = useState<DrawingPath[]>([]);

    // Interaction State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
    const [hoveredElement, setHoveredElement] = useState<any>(null);
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
    const [draggedPlayer, setDraggedPlayer] = useState<{ id: string, isBench: boolean } | null>(null);
    const [draggedVertex, setDraggedVertex] = useState<{ pathIndex: number, vertexIndex: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0, cx: 0, cy: 0 });
    const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);

    // History
    const [history, setHistory] = useState<any[]>([]);
    const [future, setFuture] = useState<any[]>([]);

    // --- SYNC WITH PROPS ---
    // When switching rotations/phases, App passes new initial values.
    // We update state if they differ significantly or if we want to "reset".
    // Ideally, App controls this. But for now, we'll let App set these via effects or we verify here.
    // Actually, distinct from App state, we need to respect "updates" from outside.
    useEffect(() => {
        if (savedPositions) setPlayerPositions(savedPositions);
    }, [savedPositions]);

    useEffect(() => {
        if (savedPaths) setPaths(savedPaths);
    }, [savedPaths]);

    // --- HELPERS ---
    const getPlayerIdInZone = (targetZone: number) => {
        for (let i = 0; i < 6; i++) {
            const zone = getPlayerZone(i, currentRotation);
            if (zone === targetZone) return activePlayerIds[i];
        }
        return null;
    };

    const getConstraints = (playerId: string) => {
        const playerIdx = activePlayerIds.indexOf(playerId);
        if (playerIdx === -1) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        const logicalZone = getPlayerZone(playerIdx, currentRotation);
        const neighbors = { left: [] as number[], right: [] as number[], front: [] as number[], back: [] as number[] };

        if (logicalZone === 1) { neighbors.left.push(6); neighbors.front.push(2); }
        if (logicalZone === 2) { neighbors.left.push(3); neighbors.back.push(1); }
        if (logicalZone === 3) { neighbors.left.push(4); neighbors.right.push(2); neighbors.back.push(6); }
        if (logicalZone === 4) { neighbors.right.push(3); neighbors.back.push(5); }
        if (logicalZone === 5) { neighbors.right.push(6); neighbors.front.push(4); }
        if (logicalZone === 6) { neighbors.left.push(5); neighbors.right.push(1); neighbors.front.push(3); }

        let limits = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        const padding = 2;
        const isValidPos = (pos: PlayerPosition) => pos && pos.x >= 0 && pos.x <= 100 && pos.y >= 0 && pos.y <= 100;

        neighbors.left.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) limits.minX = Math.max(limits.minX, playerPositions[nId].x + padding);
        });
        neighbors.right.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) limits.maxX = Math.min(limits.maxX, playerPositions[nId].x - padding);
        });
        neighbors.front.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) limits.minY = Math.max(limits.minY, playerPositions[nId].y + padding);
        });
        neighbors.back.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) limits.maxY = Math.min(limits.maxY, playerPositions[nId].y - padding);
        });

        if (limits.minX > limits.maxX) { limits.minX = 0; limits.maxX = 100; }
        if (limits.minY > limits.maxY) { limits.minY = 0; limits.maxY = 100; }
        if (limits.maxY <= 1) limits.maxY = 100;

        return limits;
    };

    const performHitTest = (cx: number, cy: number, width: number, height: number) => {
        const absX = (cx / 100) * width;
        const absY = (cy / 100) * height;

        // 1. Check UI Controls
        if (hoveredElement && hoveredElement.type !== 'vertex') {
            const path = paths[hoveredElement.index];
            if (path) {
                let drawPoints = path.points.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
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
                const spacing = 18;
                const distToDel = Math.sqrt(Math.pow(absX - (center.x + spacing), 2) + Math.pow(absY - center.y, 2));
                const distToMove = Math.sqrt(Math.pow(absX - (center.x - spacing), 2) + Math.pow(absY - center.y, 2));
                if (distToDel < 15) return { type: 'delete', index: hoveredElement.index };
                if (distToMove < 15) return { type: 'move-shape', index: hoveredElement.index };
                const distToCenter = Math.sqrt(Math.pow(absX - center.x, 2) + Math.pow(absY - center.y, 2));
                if (distToCenter < 50) return { type: 'ui-proximity', index: hoveredElement.index };
            }
        }

        // 2. Check Vertices
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (path.type === 'polygon' || path.type === 'line' || path.type === 'triangle') {
                for (let j = 0; j < path.points.length; j++) {
                    const p = path.points[j];
                    const absXVertex = (p.x / 100) * width;
                    const absYVertex = (p.y / 100) * height;
                    const dist = Math.sqrt(Math.pow(absX - absXVertex, 2) + Math.pow(absY - absYVertex, 2));
                    if (dist < 10) return { type: 'vertex', index: i, vertexIndex: j };
                }
            }
        }

        // 3. Check Bodies
        for (let i = paths.length - 1; i >= 0; i--) {
            const path = paths[i];
            let hit = false;
            const absPoints = path.points.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
            const pt = { x: absX, y: absY };

            if (path.type === 'polygon' || path.type === 'triangle') {
                if (isPointInPolygon(pt, absPoints)) hit = true;
            } else if (path.type === 'line' || path.type === 'arrow' || path.type === 'draw') {
                for (let k = 0; k < absPoints.length - 1; k++) {
                    if (distToSegment(pt, absPoints[k], absPoints[k + 1]) < 15) hit = true;
                }
            } else if (path.type === 'rect') {
                const minX = Math.min(absPoints[0].x, absPoints[1].x);
                const maxX = Math.max(absPoints[0].x, absPoints[1].x);
                const minY = Math.min(absPoints[0].y, absPoints[1].y);
                const maxY = Math.max(absPoints[0].y, absPoints[1].y);
                if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) hit = true;
            }
            if (hit) return { type: 'shape', index: i };
        }
        return null;
    };

    // --- HISTORY ---
    const saveToHistory = () => {
        const currentState = {
            playerPositions: JSON.parse(JSON.stringify(playerPositions)),
            paths: JSON.parse(JSON.stringify(paths)),
            activePlayers: [...activePlayerIds]
        };
        setHistory(prev => [...prev, currentState]);
        setFuture([]);
        if (history.length > 20) setHistory(prev => prev.slice(1));
    };

    const undo = () => {
        if (history.length === 0) return;
        const currentState = {
            playerPositions: JSON.parse(JSON.stringify(playerPositions)),
            paths: JSON.parse(JSON.stringify(paths)),
            activePlayers: [...activePlayerIds]
        };
        setFuture(prev => [currentState, ...prev]);
        const previousState = history[history.length - 1];
        setPlayerPositions(previousState.playerPositions);
        setPaths(previousState.paths);
        if (setActivePlayerIds) setActivePlayerIds(previousState.activePlayers);
        setHistory(prev => prev.slice(0, -1));
    };

    const redo = () => {
        if (future.length === 0) return;
        const currentState = {
            playerPositions: JSON.parse(JSON.stringify(playerPositions)),
            paths: JSON.parse(JSON.stringify(paths)),
            activePlayers: [...activePlayerIds]
        };
        setHistory(prev => [...prev, currentState]);
        const nextState = future[0];
        setPlayerPositions(nextState.playerPositions);
        setPaths(nextState.paths);
        if (setActivePlayerIds) setActivePlayerIds(nextState.activePlayers);
        setFuture(prev => prev.slice(1));
    };

    const resetHistory = () => {
        setHistory([]);
        setFuture([]);
    };

    const swapPlayers = (benchId: string, courtId: string) => {
        saveToHistory();
        const newActive = activePlayerIds.map(id => id === courtId ? benchId : id);
        setActivePlayerIds(newActive);

        setPlayerPositions(prev => {
            const next = { ...prev };
            if (next[courtId]) {
                next[benchId] = next[courtId];
                delete next[courtId];
            }
            return next;
        });
        setSelectedBenchPlayerId(null);
        setDraggedPlayer(null);
    };

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent default touch actions (scrolling) only inside the canvas area if needed
        // but often handled by CSS touch-action: none.

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const cx = (x / rect.width) * 100;
        const cy = (y / rect.height) * 100;

        setMousePos({ x, y, cx, cy });

        if (mode === 'move') {
            // Check for player click
            let clickedPlayerId: string | null = null;
            let minDistance = 5; // roughly 5% width

            // Check active players on court
            activePlayerIds.forEach(id => {
                const pos = playerPositions[id];
                if (pos) {
                    const dist = Math.sqrt(Math.pow(cx - pos.x, 2) + Math.pow(cy - pos.y, 2));
                    if (dist < minDistance) clickedPlayerId = id;
                }
            });

            // Logic for Side Bench selection via mouse (if implemented in App, passed via props? or handled here?)
            // For now, assuming standard court interaction.
            // If dragging from bench, App usually handles the "Start Drag" event. 
            // BUT, if we click an existing player on court:
            if (clickedPlayerId) {
                // @ts-ignore
                setDraggedPlayer({ id: clickedPlayerId, isBench: false });
                saveToHistory();
                return;
            }

            // Hit Test for Shapes/UI
            let hit = performHitTest(cx, cy, rect.width, rect.height);
            if (!hit && e.type === 'touchstart') setHoveredElement(null);
            else if (e.type === 'touchstart') setHoveredElement(hit);

            if (hit) {
                if (hit.type === 'delete') {
                    setPaths(prev => prev.filter((_, i) => i !== hit.index));
                    setHoveredElement(null);
                    saveToHistory(); // Changed to prevent auto-save, we use history
                    return;
                }
                if (hit.type === 'move-shape') {
                    setSelectedShapeIndex(hit.index);
                    saveToHistory();
                    return;
                }
                if (hit.type === 'vertex') {
                    setDraggedVertex({ pathIndex: hit.index, vertexIndex: hit.vertexIndex });
                    saveToHistory();
                    return;
                }
                if ((hit.type === 'shape' || hit.type === 'ui-proximity') && e.type === 'touchstart') {
                    setHoveredElement(hit);
                    return;
                }
            }
            if (!hit && e.type === 'touchstart') setHoveredElement(null);

        } else if (['draw', 'arrow'].includes(mode)) {
            saveToHistory();
            setIsDrawing(true);
            setCurrentPath({
                points: [{ x: cx, y: cy }],
                color: drawColor,
                // @ts-ignore
                type: mode,
                anchorId: null,
                modifiers: { shift: e.shiftKey }
            });
        } else if (mode === 'line') {
            saveToHistory();
            setIsDrawing(true);
            setCurrentPath({
                points: [{ x: cx, y: cy }, { x: cx, y: cy }],
                color: drawColor,
                type: 'line'
            });
        } else if (mode === 'polygon') {
            e.stopPropagation();
            const newPoint = { x: cx, y: cy };
            if (!isDrawing) {
                saveToHistory();
                setIsDrawing(true);
                setCurrentPath({
                    points: [newPoint, newPoint],
                    color: drawColor,
                    type: 'polygon',
                    anchorId: null
                });
            } else {
                // @ts-ignore
                const startPoint = currentPath.points[0];
                const dist = Math.sqrt(Math.pow(newPoint.x - startPoint.x, 2) + Math.pow(newPoint.y - startPoint.y, 2));

                // Close polygon if clicked near start
                // @ts-ignore
                if (dist < 3 && currentPath.points.length > 2) {
                    // @ts-ignore
                    setPaths(prev => [...prev, { ...currentPath, points: currentPath.points.slice(0, -1) }]);
                    setCurrentPath(null);
                    setIsDrawing(false);
                    return;
                }

                setCurrentPath(prev => {
                    if (!prev) return null;
                    const newPoints = [...prev.points];
                    newPoints[newPoints.length - 1] = newPoint;
                    return { ...prev, points: [...newPoints, newPoint] };
                });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent default only if dragging/drawing to stop scrolling on touch
        if (isDrawing || draggedPlayer || selectedShapeIndex !== null || draggedVertex) {
            // e.preventDefault(); 
            // React synthetic events might not need this if style touch-action: none is used
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const cx = (x / rect.width) * 100;
        const cy = (y / rect.height) * 100;

        setMousePos({ x, y, cx, cy });

        // Hover logic (Desktop mainly)
        if (mode === 'move' && !draggedPlayer && selectedShapeIndex === null && !draggedVertex && !('touches' in e)) {
            const hit = performHitTest(cx, cy, rect.width, rect.height);
            setHoveredElement(hit);
        }

        if (mode === 'move') {
            if (draggedPlayer && !draggedPlayer.isBench) {
                const constraints = getConstraints(draggedPlayer.id);
                let newX = Math.max(constraints.minX, Math.min(constraints.maxX, cx));
                let newY = Math.max(constraints.minY, Math.min(constraints.maxY, cy));

                setPlayerPositions(prev => ({ ...prev, [draggedPlayer.id]: { x: newX, y: newY } }));
            }
            else if (selectedShapeIndex !== null) {
                const dx = cx - mousePos.cx;
                const dy = cy - mousePos.cy;
                setPaths(prev => {
                    const next = [...prev];
                    const path = { ...next[selectedShapeIndex] };
                    path.points = path.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                    next[selectedShapeIndex] = path;
                    return next;
                });
            }
            else if (draggedVertex) {
                setPaths(prev => {
                    const next = [...prev];
                    const path = { ...next[draggedVertex.pathIndex] };
                    const newPoints = [...path.points];
                    newPoints[draggedVertex.vertexIndex] = { x: cx, y: cy };
                    path.points = newPoints;
                    next[draggedVertex.pathIndex] = path;
                    return next;
                });
            }
        }
        else if (isDrawing && currentPath) {
            if (mode === 'draw') {
                setCurrentPath(prev => {
                    if (!prev) return null;
                    return { ...prev, points: [...prev.points, { x: cx, y: cy }] };
                });
            } else if (mode === 'line' || mode === 'arrow') {
                setCurrentPath(prev => {
                    if (!prev) return null;
                    const newPoints = [...prev.points];
                    newPoints[1] = { x: cx, y: cy };
                    return { ...prev, points: newPoints };
                });
            } else if (mode === 'polygon') {
                setCurrentPath(prev => {
                    if (!prev) return null;
                    const newPoints = [...prev.points];
                    newPoints[newPoints.length - 1] = { x: cx, y: cy };
                    return { ...prev, points: newPoints };
                });
            }
        }
    };

    const handleMouseUp = () => {
        if (mode === 'move') {
            setDraggedPlayer(null);
            setSelectedShapeIndex(null);
            setDraggedVertex(null);
        } else if (isDrawing) {
            if (mode === 'draw') {
                if (currentPath && currentPath.points.length > 5) { // Min length check
                    // smoothing could happen here
                    setPaths(prev => [...prev, currentPath]);
                }
                setCurrentPath(null);
                setIsDrawing(false);
            } else if (mode === 'line' || mode === 'arrow') {
                if (currentPath) setPaths(prev => [...prev, currentPath]);
                setCurrentPath(null);
                setIsDrawing(false);
            }
            // Polygon is handled in MouseDown for "clicks", but we might cancel if drags fail?
            // Polygon mainly relies on clicks.
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (mode === 'polygon' && isDrawing) {
            e.preventDefault(); e.stopPropagation();
            if (!currentPath) return;
            let finalPoints = [...currentPath.points];
            finalPoints.pop(); // Remove floating point
            const uniquePoints: { x: number, y: number }[] = [];
            if (finalPoints.length > 0) uniquePoints.push(finalPoints[0]);
            for (let i = 1; i < finalPoints.length; i++) {
                const p = finalPoints[i];
                const prev = uniquePoints[uniquePoints.length - 1];
                if (Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2)) > 0.5) uniquePoints.push(p);
            }
            if (uniquePoints.length >= 3) {
                setPaths(prev => [...prev, { ...currentPath, points: uniquePoints }]);
            }
            setCurrentPath(null);
            setIsDrawing(false);
        }
    };

    // Listen for mode changes to reset drawing
    useEffect(() => {
        if (isDrawing && mode === 'polygon' && currentPath && currentPath.points.length > 2) {
            // If switching away from polygon while drawing, try to close it?
            // Or just discard. Discarding is safer behavior logic for now to avoid accidental shapes.
            setCurrentPath(null);
            setIsDrawing(false);
        } else if (isDrawing) {
            setCurrentPath(null);
            setIsDrawing(false);
        }
    }, [mode]);

    return {
        playerPositions, setPlayerPositions,
        paths, setPaths,
        currentPath,
        hoveredElement,
        mousePos,
        isDrawing,
        draggedPlayer,
        setDraggedPlayer, // Expose for bench dragging
        selectedBenchPlayerId, // Expose for sidebar
        setSelectedBenchPlayerId,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onDoubleClick: handleDoubleClick,
            onTouchStart: handleMouseDown,
            onTouchMove: handleMouseMove,
            onTouchEnd: handleMouseUp
        },
        undo, redo, history, future,
        saveToHistory, resetHistory,
        swapPlayers
    };
};

