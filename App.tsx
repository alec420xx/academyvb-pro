import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Menu, Download, Trash2, RotateCcw,
    Save, Plus, Grid, Users, Layout, Settings, FileText,
    MousePointer2, Move, Eraser, Pen, Edit3, X, ImageIcon,
    PenTool, Type, Circle, Square, Minus, LogIn, Trophy,
    ArrowUpFromLine, Layers, Share2, Camera, Loader2,
    Check, AlertTriangle, Info, Monitor, Smartphone,
    MenuSquare, UserPlus, LogOut, Link
} from 'lucide-react';
import { TeamManager } from './components/managers/TeamManager';
import { LineupManager } from './components/managers/LineupManager';
import { Player, DrawingPath, PlayerPosition, Team, Lineup, SavedRotationData, GameMode } from './types';
import { OFFENSE_PHASES, DEFENSE_PHASES, DEFAULT_ROSTER, getRoleColor, DRAWING_COLORS } from './constants';
import { generateId, getStorageKey, getPlayerZone, calculateDefaultPositions, isFrontRow, isPointInPolygon, distToSegment, getCentroid, migrateStorage } from './utils';
import { Court } from './components/Court';
import { PlayerToken } from './components/PlayerToken';
import { MobileControls } from './components/MobileControls';
import { Sidebar } from './components/Sidebar';
import { RosterView } from './components/RosterView';
import { RotationSquare } from './components/RotationSquare';
import { GamePlanPrintView } from './components/GamePlanPrintView';
import { ClubLogo, CustomArrowIcon, DiagonalLineIcon, CourtIcon } from './components/Icons';
import { useCloudData } from './hooks/useCloudData';
import { useAuth } from './contexts/AuthContext';
import { saveData, loadData, STORAGE_KEYS } from './services/storage';
import { LogIn, LogOut, Cloud, CloudOff } from 'lucide-react';

export default function App() {
    const [activeTab, setActiveTab] = useState<'roster' | 'board' | 'export'>('board');
    const [gameMode, setGameMode] = useState<GameMode>('offense');
    const [currentRotation, setCurrentRotation] = useState(1);
    const [currentPhase, setCurrentPhase] = useState('receive1');
    const [mode, setMode] = useState<'move' | 'draw' | 'line' | 'arrow' | 'polygon' | 'rect' | 'triangle'>('move');
    const [drawColor, setDrawColor] = useState('#000000');
    const [isExporting, setIsExporting] = useState(false);
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
    // Persistent Phase Selection State
    const [visiblePhasesMap, setVisiblePhasesMap] = useState<{ offense: string[], defense: string[] }>({
        offense: OFFENSE_PHASES.map(p => p.id),
        defense: DEFENSE_PHASES.map(p => p.id)
    });

    const printViewVisiblePhases = visiblePhasesMap[gameMode]; // Derived for current view

    // Mobile Export View State
    const [mobilePlanRotation, setMobilePlanRotation] = useState(1);
    const [printViewStartRotation, setPrintViewStartRotation] = useState(1);

    // --- GLOBAL DATA STATE ---
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [lineups, setLineups] = useState<Lineup[]>([]);
    const [currentLineupId, setCurrentLineupId] = useState<string | null>(null);

    // --- UI STATE ---
    const [isLineupManagerOpen, setIsLineupManagerOpen] = useState(false);
    const [isTeamManagerOpen, setIsTeamManagerOpen] = useState(false);

    // --- WORKING MEMORY (Active Lineup) ---
    // --- WORKING MEMORY (Active Lineup) ---
    const { saveRoster, saveRotations, loadInitialData, isSyncing, user } = useCloudData();
    const { signInWithGoogle, logout } = useAuth();

    const [roster, setRoster] = useState<Player[]>(DEFAULT_ROSTER);
    const [savedRotations, setSavedRotations] = useState<Record<string, SavedRotationData>>({});
    const [activePlayerIds, setActivePlayerIds] = useState<string[]>([]);
    const [playerPositions, setPlayerPositions] = useState<Record<string, PlayerPosition>>({});
    const [paths, setPaths] = useState<DrawingPath[]>([]);
    const [currentNotes, setCurrentNotes] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [future, setFuture] = useState<any[]>([]); // Redo stack

    // Load Data on Mount (Cloud -> Local)
    useEffect(() => {
        loadInitialData().then(data => {
            if (data.roster) setRoster(data.roster);
            if (data.rotations) {
                setSavedRotations(data.rotations);
                // Determine initial positions after load
                // (This logic mimics the old behavior but waits for data)
                // We will let the existing rotation-change logic handle this if we set state
            }
        });
    }, [user]); // Reload if user changes

    // Auto-Save Roster
    useEffect(() => {
        saveRoster(roster);
    }, [roster]);

    // Auto-Save Rotations
    useEffect(() => {
        saveRotations(savedRotations);
    }, [savedRotations]);

    // Interaction
    const [draggedPlayer, setDraggedPlayer] = useState<{ id: string, isBench: boolean } | null>(null);
    const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0, cx: 0, cy: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

    const [hoveredElement, setHoveredElement] = useState<any>(null);
    const [draggedVertex, setDraggedVertex] = useState<{ pathIndex: number, vertexIndex: number } | null>(null);

    const courtRef = useRef<HTMLDivElement>(null);

    // --- CONSTRAINT HELPERS ---
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

        // Helper: only respect neighbors that are actually on the court
        const isValidPos = (pos: PlayerPosition) => pos && pos.x >= 0 && pos.x <= 100 && pos.y >= 0 && pos.y <= 100;

        neighbors.left.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) {
                limits.minX = Math.max(limits.minX, playerPositions[nId].x + padding);
            }
        });
        neighbors.right.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) {
                limits.maxX = Math.min(limits.maxX, playerPositions[nId].x - padding);
            }
        });
        neighbors.front.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) {
                limits.minY = Math.max(limits.minY, playerPositions[nId].y + padding);
            }
        });
        neighbors.back.forEach(z => {
            const nId = getPlayerIdInZone(z);
            if (nId && playerPositions[nId] && isValidPos(playerPositions[nId])) {
                limits.maxY = Math.min(limits.maxY, playerPositions[nId].y - padding);
            }
        });

        // --- ANTI-LOCKING LOGIC ---
        // If the constraints are impossible (min > max), or if they pin the player 
        // to the extreme edge (e.g. maxY <= 0), we relax the constraints to allow movement.

        // 1. Fix inverted ranges (squeeze)
        if (limits.minX > limits.maxX) { limits.minX = 0; limits.maxX = 100; }
        if (limits.minY > limits.maxY) { limits.minY = 0; limits.maxY = 100; }

        // 2. Fix pinned to top
        if (limits.maxY <= 1) limits.maxY = 100;

        return limits;
    };

    const shouldEnforceRules = (phase: string) => ['receive1', 'receive2'].includes(phase);

    // New Hit Test Logic
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
                const delX = center.x + spacing, delY = center.y;
                const moveX = center.x - spacing, moveY = center.y;
                const distToDel = Math.sqrt(Math.pow(absX - delX, 2) + Math.pow(absY - delY, 2));
                const distToMove = Math.sqrt(Math.pow(absX - moveX, 2) + Math.pow(absY - moveY, 2));
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

    // --- LOCAL STORAGE & CLOUD SYNC ---
    useEffect(() => {
        migrateStorage();

        const load = async () => {
            const loadedTeams = await loadData(user?.uid, STORAGE_KEYS.TEAMS) || [];
            const loadedLineups = await loadData(user?.uid, STORAGE_KEYS.LINEUPS) || [];

            if (loadedTeams.length === 0) {
                const defaultTeam: Team = { id: generateId('team'), name: 'My Team', roster: DEFAULT_ROSTER };
                setTeams([defaultTeam]);
                setCurrentTeamId(defaultTeam.id);
                saveData(user?.uid, STORAGE_KEYS.TEAMS, [defaultTeam]);
            } else {
                setTeams(loadedTeams);
                setCurrentTeamId(loadedTeams[0].id);
            }
            setLineups(loadedLineups);
        };
        load();
    }, [user]);

    useEffect(() => {
        if (currentTeamId && lineups.length > 0) {
            const teamLineups = lineups.filter(l => l.teamId === currentTeamId);
            if (teamLineups.length > 0 && (!currentLineupId || !teamLineups.find(l => l.id === currentLineupId))) {
                loadLineup(teamLineups[0].id, lineups);
            } else if (teamLineups.length === 0) {
                createLineup('Lineup 1', teams.find(t => t.id === currentTeamId)?.roster || DEFAULT_ROSTER, currentTeamId, lineups);
            }
        } else if (currentTeamId && lineups.length === 0) {
            createLineup('Lineup 1', teams.find(t => t.id === currentTeamId)?.roster || DEFAULT_ROSTER, currentTeamId, []);
        }
    }, [currentTeamId, lineups]);

    // v4: RE-ENABLED AUTO-POPULATE
    useEffect(() => {
        if (Object.keys(playerPositions).length === 0 && roster.length > 0) {
            initRotationDefaults(currentRotation, roster);
        }
    }, [roster, currentRotation]);

    const saveTeamsToStorage = (newTeams: Team[]) => {
        setTeams(newTeams);
        saveData(user?.uid, STORAGE_KEYS.TEAMS, newTeams);
    };

    const saveLineupsToStorage = (newLineups: Lineup[]) => {
        setLineups(newLineups);
        saveData(user?.uid, STORAGE_KEYS.LINEUPS, newLineups);
    };

    const saveCurrentState = () => {
        if (!currentLineupId) return;
        const key = getStorageKey(currentRotation, currentPhase, gameMode);
        const newRotations = {
            ...savedRotations,
            [key]: {
                positions: playerPositions,
                paths: paths,
                activePlayers: activePlayerIds,
                notes: currentNotes
            }
        };
        setSavedRotations(newRotations);
        const updatedLineups = lineups.map(l => {
            if (l.id === currentLineupId) {
                return { ...l, rotations: newRotations, roster: roster };
            }
            return l;
        });
        saveLineupsToStorage(updatedLineups);
        return newRotations;
    };

    useEffect(() => {
        if (!currentLineupId) return;
        const timer = setTimeout(() => {
            saveCurrentState();
        }, 500);
        return () => clearTimeout(timer);
    }, [playerPositions, paths, activePlayerIds, currentNotes]);

    useEffect(() => {
        if (!currentTeamId || teams.length === 0) return;
        const timer = setTimeout(() => {
            const updatedTeams = teams.map(t => {
                if (t.id === currentTeamId) {
                    return { ...t, roster: roster };
                }
                return t;
            });
            saveTeamsToStorage(updatedTeams);
        }, 1000);
        return () => clearTimeout(timer);
    }, [roster, currentTeamId]);

    // --- APP ACTIONS ---
    const createTeam = () => {
        const newTeam: Team = { id: generateId('team'), name: newItemName || 'New Team', roster: DEFAULT_ROSTER };
        saveTeamsToStorage([...teams, newTeam]);
        setNewItemName('');
        setIsTeamManagerOpen(false);
        switchTeam(newTeam.id);
    };

    const switchTeam = (teamId: string) => {
        saveCurrentState();
        setCurrentTeamId(teamId);
        const team = teams.find(t => t.id === teamId);
        if (team) setRoster(team.roster);
        setIsTeamManagerOpen(false);
    };

    const deleteTeam = (id: string) => {
        if (teams.length <= 1) return alert("Cannot delete last team.");
        const newTeams = teams.filter(t => t.id !== id);
        saveTeamsToStorage(newTeams);
        if (currentTeamId === id) switchTeam(newTeams[0].id);
    };

    const renameTeam = (id: string, newName: string) => {
        const newTeams = teams.map(t => t.id === id ? { ...t, name: newName } : t);
        saveTeamsToStorage(newTeams);
        setEditId(null);
    };

    const createLineup = (name: string, rosterToUse: Player[], teamId = currentTeamId, currentLineupsList = lineups) => {
        if (!teamId) return;
        const safeRoster = (rosterToUse && rosterToUse.length > 0) ? rosterToUse : DEFAULT_ROSTER;
        const newLineup: Lineup = { id: generateId('lineup'), teamId: teamId, name: name, roster: safeRoster, rotations: {} };
        const newLineups = [...currentLineupsList, newLineup];
        saveLineupsToStorage(newLineups);
        if (newLineups.filter(l => l.teamId === teamId).length === 1 || teamId === currentTeamId) {
            loadLineup(newLineup.id, newLineups);
        }
        setIsLineupManagerOpen(false);
        setNewItemName('');
    };

    const loadLineup = (id: string, sourceLineups = lineups) => {
        const target = sourceLineups.find(l => l.id === id);
        if (!target) return;
        setCurrentLineupId(id);
        const validRoster = (target.roster && target.roster.length > 0) ? target.roster : DEFAULT_ROSTER;
        setRoster(validRoster);
        setSavedRotations(target.rotations || {});
        setCurrentRotation(1);
        setGameMode('offense');
        setCurrentPhase('receive1');
        setHistory([]);
        setFuture([]);
        setIsLineupManagerOpen(false);
        setSelectedBenchPlayerId(null);
        const key = getStorageKey(1, 'receive1', 'offense');
        const data = target.rotations?.[key];
        if (data && data.activePlayers && data.activePlayers.length > 0) {
            setPlayerPositions(data.positions);
            setPaths(data.paths);
            setActivePlayerIds(data.activePlayers);
            setCurrentNotes(data.notes || '');
        } else {
            initRotationDefaults(1, validRoster);
        }
    };

    const deleteLineup = (id: string) => {
        const teamLineups = lineups.filter(l => l.teamId === currentTeamId);
        if (teamLineups.length <= 1) return alert("Must have at least one lineup.");
        const newLineups = lineups.filter(l => l.id !== id);
        saveLineupsToStorage(newLineups);
        if (currentLineupId === id) {
            const remaining = newLineups.filter(l => l.teamId === currentTeamId);
            if (remaining.length > 0) loadLineup(remaining[0].id, newLineups);
        }
    };

    const initRotationDefaults = (rotNum: number, currentRoster: Player[], keepDrawings = false) => {
        const positions = calculateDefaultPositions(rotNum, currentRoster);
        const newActiveIds = Object.keys(positions);
        setActivePlayerIds(newActiveIds);
        setPlayerPositions(positions);
        if (!keepDrawings) {
            setPaths([]);
        }
        setCurrentNotes('');
    };

    const handleResetPositions = () => {
        initRotationDefaults(currentRotation, roster, true);
        saveCurrentState();
    };

    const handleViewChange = (newRot: number, newPhase: string, newMode: GameMode = gameMode) => {
        const updatedRotations = saveCurrentState() || savedRotations;
        const nextKey = getStorageKey(newRot, newPhase, newMode);
        if (updatedRotations[nextKey]) {
            const data = updatedRotations[nextKey];
            setPlayerPositions(data.positions);
            setPaths(data.paths);
            setActivePlayerIds(data.activePlayers);
            setCurrentNotes(data.notes || '');
        } else {
            initRotationDefaults(newRot, roster);
        }
        setCurrentRotation(newRot);
        setCurrentPhase(newPhase);
        setGameMode(newMode);
        setHistory([]);
        setFuture([]);
        setSelectedBenchPlayerId(null);
    };

    const handleExport = (elementId: string, filename: string) => {
        const element = document.getElementById(elementId);
        // @ts-ignore
        if (!element || !window.html2canvas) return;
        setIsExporting(true);

        const clone = element.cloneNode(true) as HTMLElement;
        const rect = element.getBoundingClientRect();
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.zIndex = '-9999';
        clone.style.backgroundColor = '#ffffff';

        document.body.appendChild(clone);

        const originalCanvases = element.querySelectorAll('canvas');
        const clonedCanvases = clone.querySelectorAll('canvas');
        originalCanvases.forEach((orig, i) => {
            const cloneCanvas = clonedCanvases[i];
            if (cloneCanvas) {
                cloneCanvas.width = orig.width;
                cloneCanvas.height = orig.height;
                if (orig.width > 0 && orig.height > 0) {
                    const ctx = cloneCanvas.getContext('2d');
                    if (ctx) ctx.drawImage(orig, 0, 0);
                }
            }
        });

        setTimeout(() => {
            // @ts-ignore
            window.html2canvas(clone, {
                scale: 2,
                useCORS: false,
                backgroundColor: '#ffffff',
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight
            }).then((canvas: HTMLCanvasElement) => {
                const link = document.createElement('a');
                link.download = `${filename}.png`;
                link.href = canvas.toDataURL();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                document.body.removeChild(clone);
                setIsExporting(false);
            }).catch((err: any) => {
                console.error(err);
                if (document.body.contains(clone)) document.body.removeChild(clone);
                setIsExporting(false);
            });
        }, 100);
    };

    const getCoords = (e: any) => {
        // Priority to touches list for drag/move events
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        // Fallback to changedTouches (e.g. touchend)
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        // Fallback to mouse (check if clientX is defined)
        if (e.clientX !== undefined) {
            return { x: e.clientX, y: e.clientY };
        }
        // If no coordinates found, return null to signal invalid input
        return null;
    };

    useEffect(() => {
        const handleWindowMove = (e: any) => {
            const coords = getCoords(e);
            if (!coords) return;

            const { x, y } = coords;
            const rect = courtRef.current?.getBoundingClientRect();

            // Safety check for invalid rect
            if (!rect || rect.width === 0 || rect.height === 0) return;

            const cx = ((x - rect.left) / rect.width) * 100;
            const cy = ((y - rect.top) / rect.height) * 100;

            // CRITICAL: Safety check for invalid coordinates or out of bounds (ghost touches at 0,0)
            // If coords are wildly outside the court (e.g. >50% margin), ignore them to prevent snapping
            if (isNaN(cx) || isNaN(cy) || !isFinite(cx) || !isFinite(cy) || cx < -50 || cx > 150 || cy < -50 || cy > 150) return;

            const dx = cx - (mousePos.cx || cx);
            const dy = cy - (mousePos.cy || cy);

            setMousePos({ x, y, cx, cy });

            if (mode === 'move' && !draggedPlayer && !draggedVertex && !isDrawing && selectedShapeIndex === null) {
                const hit = performHitTest(cx, cy, rect.width, rect.height);
                if (window.matchMedia("(hover: hover)").matches) {
                    setHoveredElement(hit);
                }
            }

            if (mode === 'move' && draggedVertex) {
                e.preventDefault();
                setPaths(prev => {
                    const newPaths = [...prev];
                    const path = { ...newPaths[draggedVertex.pathIndex] };
                    const newPoints = [...path.points];
                    newPoints[draggedVertex.vertexIndex] = { x: cx, y: cy };
                    path.points = newPoints;
                    newPaths[draggedVertex.pathIndex] = path;
                    return newPaths;
                });
            }

            if (mode === 'move' && selectedShapeIndex !== null) {
                e.preventDefault();
                setPaths(prev => {
                    const newPaths = [...prev];
                    const path = { ...newPaths[selectedShapeIndex] };
                    path.points = path.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                    newPaths[selectedShapeIndex] = path;
                    return newPaths;
                });
            }

            if (mode === 'move' && draggedPlayer) {
                e.preventDefault();

                if (!draggedPlayer.isBench) {
                    let newX = cx;
                    let newY = cy;

                    // First, Hard Clamp to prevent off-screen (above/below court)
                    newY = Math.max(0, Math.min(100, newY));
                    newX = Math.max(0, Math.min(100, newX));

                    if (shouldEnforceRules(currentPhase)) {
                        const constraints = getConstraints(draggedPlayer.id);
                        // Apply constraints, but respect the Hard Clamp we just did
                        newX = Math.max(constraints.minX, Math.min(constraints.maxX, newX));
                        newY = Math.max(constraints.minY, Math.min(constraints.maxY, newY));
                    }
                    setPlayerPositions(prev => ({ ...prev, [draggedPlayer.id]: { x: newX, y: newY } }));
                }
            }
            else if (isDrawing && currentPath) {
                e.preventDefault(); // Stop scrolling while drawing
                let pointToAdd = { x: cx, y: cy };
                if (currentPath.anchorId) {
                    const anchorPos = playerPositions[currentPath.anchorId];
                    if (anchorPos) pointToAdd = { x: cx - anchorPos.x, y: cy - anchorPos.y };
                }

                if (mode === 'line') {
                    setCurrentPath(prev => prev ? ({ ...prev, points: [prev.points[0], pointToAdd] }) : null);
                } else if (mode === 'polygon' || mode === 'triangle') {
                    setCurrentPath(prev => {
                        if (!prev) return null;
                        const newPoints = [...prev.points];
                        newPoints[newPoints.length - 1] = pointToAdd;
                        return { ...prev, points: newPoints };
                    });
                } else {
                    if (cx > -20 && cx < 120 && cy > -20 && cy < 120) {
                        setCurrentPath(prev => prev ? ({ ...prev, points: [...prev.points, pointToAdd] }) : null);
                    }
                }
            }
        };

        const handleWindowUp = (e: any) => {
            if (draggedVertex || selectedShapeIndex !== null) {
                setDraggedVertex(null);
                setSelectedShapeIndex(null);
                saveCurrentState();
            }

            if (draggedPlayer) {
                if (draggedPlayer.isBench) {
                    const rect = courtRef.current?.getBoundingClientRect();
                    if (rect) {
                        const coords = getCoords(e);
                        if (coords) {
                            const { x, y } = coords;
                            const dropX = ((x - rect.left) / rect.width) * 100;
                            const dropY = ((y - rect.top) / rect.height) * 100;
                            let nearestId: string | null = null;
                            let minDist = 15;
                            Object.entries(playerPositions).forEach(([pid, pos]: [string, any]) => {
                                const dist = Math.sqrt(Math.pow(pos.x - dropX, 2) + Math.pow(pos.y - dropY, 2));
                                if (dist < minDist) { minDist = dist; nearestId = pid; }
                            });

                            if (nearestId) {
                                const targetPlayerIndex = activePlayerIds.indexOf(nearestId);
                                const targetZone = getPlayerZone(targetPlayerIndex, currentRotation);
                                const draggedPlayerRole = roster.find(p => p.id === draggedPlayer.id)?.role;

                                if (draggedPlayerRole === 'L' && isFrontRow(targetZone)) {
                                    alert("Libero cannot replace a front-row player.");
                                } else {
                                    const benchId = draggedPlayer.id;
                                    const newActive = activePlayerIds.map(id => id === nearestId ? benchId : id);
                                    setActivePlayerIds(newActive);
                                    setPlayerPositions(prev => {
                                        const next = { ...prev };
                                        // @ts-ignore
                                        if (next[nearestId]) {
                                            // @ts-ignore
                                            next[benchId] = { ...next[nearestId] };
                                            // @ts-ignore
                                            delete next[nearestId];
                                        }
                                        return next;
                                    });
                                    setSelectedBenchPlayerId(null);
                                }
                            }
                        }
                    }
                }
                setDraggedPlayer(null);
                saveCurrentState();
            } else if (isDrawing && (mode === 'line' || mode === 'arrow' || mode === 'draw')) {
                setIsDrawing(false);
                if (currentPath && currentPath.points.length > 1) {
                    setPaths(prev => [...prev, currentPath]);
                    saveCurrentState();
                }
                setCurrentPath(null);
            }
        };

        window.addEventListener('mousemove', handleWindowMove);
        window.addEventListener('mouseup', handleWindowUp);
        window.addEventListener('mouseleave', handleWindowUp);
        window.addEventListener('touchmove', handleWindowMove, { passive: false });
        window.addEventListener('touchend', handleWindowUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
            window.removeEventListener('mouseleave', handleWindowUp);
            window.removeEventListener('touchmove', handleWindowMove);
            window.removeEventListener('touchend', handleWindowUp);
        };
    }, [mode, draggedPlayer, isDrawing, currentPath, playerPositions, activePlayerIds, savedRotations, draggedVertex, hoveredElement, selectedShapeIndex, mousePos]);

    const handleTokenDown = (e: any, playerId: string, isBench: boolean) => {
        e.stopPropagation();
        // Important for reliable dragging on touch devices
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();

        if (isBench) {
            if (selectedBenchPlayerId === playerId) setSelectedBenchPlayerId(null);
            else setSelectedBenchPlayerId(playerId);
            saveToHistory();
            setDraggedPlayer({ id: playerId, isBench });
            return;
        }

        if (mode === 'move') {
            if (selectedBenchPlayerId) {
                const benchId = selectedBenchPlayerId;
                const courtId = playerId;
                if (benchId === courtId) { setSelectedBenchPlayerId(null); return; }

                const benchPlayer = roster.find(p => p.id === benchId);
                const courtPlayerIndex = activePlayerIds.indexOf(courtId);
                const targetZone = getPlayerZone(courtPlayerIndex, currentRotation);

                if (benchPlayer?.role === 'L' && isFrontRow(targetZone)) {
                    alert("Libero cannot replace a front-row player.");
                    setSelectedBenchPlayerId(null);
                    return;
                }

                const newActive = activePlayerIds.map(id => id === courtId ? benchId : id);
                setActivePlayerIds(newActive);
                setPlayerPositions(prev => {
                    const next = { ...prev };
                    next[benchId] = next[courtId];
                    delete next[courtId];
                    return next;
                });
                setSelectedBenchPlayerId(null);
                saveCurrentState();
            } else {
                saveToHistory();
                setDraggedPlayer({ id: playerId, isBench });
            }
        }
        else if (mode === 'arrow' && !isBench) {
            saveToHistory();
            setIsDrawing(true);
            setCurrentPath({ points: [{ x: 0, y: 0 }], color: drawColor, type: 'arrow', anchorId: playerId });
        }
    };

    const handleCourtDown = (e: any) => {
        // Prevent default scrolling immediately on touch
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();

        const coords = getCoords(e);
        if (!coords) return;
        const { x, y } = coords;

        // @ts-ignore
        const rect = courtRef.current.getBoundingClientRect();
        const cx = ((x - rect.left) / rect.width) * 100;
        const cy = ((y - rect.top) / rect.height) * 100;

        if (mode === 'move') {
            // FIX: Always perform hit test on touch/click to check for UI buttons (move/delete)
            // or new shape selections. Don't rely on 'hoveredElement' state alone.
            let hit = performHitTest(cx, cy, rect.width, rect.height);

            // If no immediate hit, but we have a hover element, we might be clicking "off" it
            // checking specifically for UI proximity or button clicks was done by performHitTest
            // utilizing the current hoveredElement state internally.

            if (!hit && e.type === 'touchstart') {
                // If we missed everything, clear selection
                setHoveredElement(null);
            } else if (e.type === 'touchstart') {
                // Update hover on touch
                setHoveredElement(hit);
            }

            if (hit) {
                if (hit.type === 'delete') {
                    setPaths(prev => prev.filter((_, i) => i !== hit.index));
                    setHoveredElement(null);
                    saveCurrentState();
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
            setSelectedBenchPlayerId(null);
        }
        else if (['draw', 'arrow'].includes(mode)) {
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

                // @ts-ignore
                if (dist < 3 && currentPath.points.length > 2) {
                    // @ts-ignore
                    setPaths(prev => [...prev, { ...currentPath, points: currentPath.points.slice(0, -1) }]);
                    saveCurrentState();
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

    const handleDoubleClick = (e: any) => {
        if (mode === 'polygon' && isDrawing) {
            e.preventDefault(); e.stopPropagation();
            if (!currentPath) return;
            let finalPoints = [...currentPath.points];
            finalPoints.pop();
            const uniquePoints = [];
            if (finalPoints.length > 0) uniquePoints.push(finalPoints[0]);
            for (let i = 1; i < finalPoints.length; i++) {
                const p = finalPoints[i];
                const prev = uniquePoints[uniquePoints.length - 1];
                if (Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2)) > 0.5) uniquePoints.push(p);
            }
            if (uniquePoints.length >= 3) {
                setPaths(prev => [...prev, { ...currentPath, points: uniquePoints }]);
                saveCurrentState();
            }
            setCurrentPath(null);
            setIsDrawing(false);
        }
    };

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
        setActivePlayerIds(previousState.activePlayers);
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
        setActivePlayerIds(nextState.activePlayers);
        setFuture(prev => prev.slice(1));
    };

    const updateRoster = (index: number, field: keyof Player, value: string) => {
        if (field === 'number' && value.length > 4) return;
        const newRoster = [...roster];
        // @ts-ignore
        newRoster[index] = { ...newRoster[index], [field]: value };
        setRoster(newRoster);
    };

    const currentPhasesList = gameMode === 'offense' ? OFFENSE_PHASES : DEFENSE_PHASES;
    const currentAttacker = currentPhasesList.find(p => p.id === currentPhase)?.attacker;

    useEffect(() => {
        if (isDrawing && mode === 'polygon' && currentPath && currentPath.points.length > 2) {
            setPaths(prev => [...prev, { ...currentPath, points: currentPath.points.slice(0, -1) }]);
            saveCurrentState();
            setCurrentPath(null);
            setIsDrawing(false);
        } else if (isDrawing) {
            setCurrentPath(null);
            setIsDrawing(false);
        }
    }, [mode]);

    // Dynamic cursor logic
    let cursorClass = 'cursor-default';
    if (mode === 'move') {
        if (draggedPlayer && !draggedPlayer.isBench) {
            cursorClass = 'cursor-move';
        } else if (selectedShapeIndex !== null || draggedVertex) {
            cursorClass = 'cursor-move';
        } else if (hoveredElement) {
            if (hoveredElement.type === 'delete') cursorClass = 'cursor-pointer';
            else if (hoveredElement.type === 'vertex') cursorClass = 'cursor-move'; // Grab logic
            else if (hoveredElement.type === 'move-shape' || hoveredElement.type === 'shape') cursorClass = 'cursor-move';
            else cursorClass = 'cursor-default';
        }
    } else {
        cursorClass = 'cursor-crosshair';
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 md:pb-0 overflow-x-hidden w-full">
            {draggedPlayer && draggedPlayer.isBench && (
                <PlayerToken player={roster.find(p => p.id === draggedPlayer.id)!} isDragging={true} isBench={true} style={{ position: 'fixed', left: mousePos.x, top: mousePos.y }} />
            )}

            {/* --- DESKTOP/TABLET HEADER --- */}
            <header className="hidden md:block bg-slate-900 border-b border-slate-700 p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto relative flex items-center justify-between h-12">

                    {/* LEFT: LOGO & TITLE */}
                    <div className="flex-1 flex justify-start items-center gap-2 lg:gap-3">
                        <div className="bg-black p-2 rounded-lg text-red-600"><ClubLogo size={24} /></div>
                        <div>
                            <h1 className="text-lg lg:text-xl font-black tracking-tight text-white">ACADEMYVB <span className="text-red-500">v0.9.1</span></h1>
                            <div className="flex items-center gap-1 lg:gap-2 text-[10px] lg:text-xs text-slate-400 mt-1 max-w-[120px] lg:max-w-none truncate">
                                <span className="font-bold text-white cursor-pointer hover:text-blue-400 truncate" onClick={() => setIsTeamManagerOpen(true)}>{teams.find(t => t.id === currentTeamId)?.name}</span>
                                <ChevronRight size={10} />
                                <span className="font-bold text-slate-300 truncate">{lineups.find(l => l.id === currentLineupId)?.name || 'Untitled'}</span>
                            </div>
                        </div>
                    </div>

                    {/* CENTER: NAV ABSOLUTE POSITIONED */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                            <button onClick={() => setActiveTab('roster')} className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'roster' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                <Users size={16} />
                                <span className="hidden lg:inline">Roster</span>
                            </button>
                            <button onClick={() => setActiveTab('board')} className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'board' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                <CourtIcon size={16} />
                                <span className="hidden lg:inline">Court</span>
                            </button>
                            <button onClick={() => { setActiveTab('export'); saveCurrentState(); }} className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'export' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                <Trophy size={16} />
                                <span className="hidden lg:inline">Plan</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: ACTIONS */}
                    <div className="flex-1 flex justify-end items-center gap-2">
                        {/* AUTH BUTTON */}
                        {user ? (
                            <div className="flex items-center gap-2 mr-2 bg-slate-800 rounded-lg p-1 pr-3 border border-slate-700">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-md" />
                                ) : (
                                    <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white">{user.email?.[0].toUpperCase()}</div>
                                )}
                                <div className="text-xs text-right hidden lg:block">
                                    <div className="font-bold text-white leading-none">{user.displayName}</div>
                                    <button onClick={() => logout()} className="text-[10px] text-slate-400 hover:text-red-400 leading-none mt-1">Sign Out</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={signInWithGoogle} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors mr-2">
                                <LogIn size={16} />
                                <span>Sign In</span>
                            </button>
                        )}

                        <button onClick={() => setIsTeamManagerOpen(true)} className="p-2 lg:px-3 lg:py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title="Teams">
                            <span>Teams</span>
                        </button>
                        <button onClick={() => setIsLineupManagerOpen(true)} className="p-2 lg:px-3 lg:py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title="Lineups">
                            <span>Lineups</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* --- MOBILE HEADER --- */}
            {/* ADDED: pt-[calc(0.75rem+env(safe-area-inset-top))] to respect notch area */}
            <header className="md:hidden bg-slate-900 border-b border-slate-800 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sticky top-0 z-50 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="bg-black p-1.5 rounded-md text-red-600"><ClubLogo size={18} /></div>
                    <div className="leading-none">
                        <div className="font-black text-white text-sm tracking-tight">ACADEMYVB <span className="text-red-500">v0.9.1</span></div>
                        <div className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]" onClick={() => setIsTeamManagerOpen(true)}>{teams.find(t => t.id === currentTeamId)?.name}</div>
                    </div>
                </div>

                {activeTab === 'export' ? (
                    <div className="flex gap-2 items-center">
                        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                            <button onClick={() => setGameMode('offense')} className={`px-2 py-1 rounded text-[10px] font-bold ${gameMode === 'offense' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>OFF</button>
                            <button onClick={() => setGameMode('defense')} className={`px-2 py-1 rounded text-[10px] font-bold ${gameMode === 'defense' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>DEF</button>
                        </div>
                        <button onClick={() => handleExport('full-report-grid', `GamePlan-${gameMode}`)} disabled={isExporting} className={`${gameMode === 'offense' ? 'bg-red-600' : 'bg-blue-600'} text-white p-1.5 rounded border border-white/10 shadow-lg`}><Download size={16} /></button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center">
                        {user ? (
                            <button onClick={() => logout()} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 overflow-hidden">
                                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white">{user.email?.[0].toUpperCase()}</span>}
                            </button>
                        ) : (
                            <button onClick={signInWithGoogle} className="p-1.5 bg-blue-600 rounded text-white"><LogIn size={16} /></button>
                        )}
                        <button onClick={() => setIsTeamManagerOpen(true)} className="px-2 py-1.5 bg-slate-800 rounded text-slate-300 border border-slate-700 text-[10px] font-bold">Teams</button>
                        <button onClick={() => setIsLineupManagerOpen(true)} className="px-2 py-1.5 bg-slate-800 rounded text-slate-300 border border-slate-700 text-[10px] font-bold">Lineups</button>
                    </div>
                )}
            </header>

            {/* MODALS */}
            {/* MODALS */}
            <TeamManager
                isOpen={isTeamManagerOpen}
                onClose={() => setIsTeamManagerOpen(false)}
                teams={teams}
                currentTeamId={currentTeamId}
                onSwitchTeam={switchTeam}
                onCreateTeam={createTeam}
                onRenameTeam={renameTeam}
                onDeleteTeam={deleteTeam}
            />

            <LineupManager
                isOpen={isLineupManagerOpen}
                onClose={() => setIsLineupManagerOpen(false)}
                lineups={lineups}
                currentTeamId={currentTeamId}
                currentLineupId={currentLineupId}
                roster={roster}
                onSwitchLineup={loadLineup}
                onCreateLineup={createLineup}
                onDeleteLineup={deleteLineup}
            />

            <main className="max-w-7xl mx-auto md:p-6 h-full pb-48">
                {/* --- BOARD VIEW --- */}
                {activeTab === 'board' && (
                    <div className="flex flex-col min-h-full">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-4 md:p-0">
                            {/* Sidebar Controls (Desktop) */}
                            <div className="hidden lg:block lg:col-span-3 space-y-4">
                                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Rotation</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[1, 2, 3, 4, 5, 6].map(num => (
                                            <button key={num} onClick={() => handleViewChange(num, currentPhase)} className={`py-3 rounded-xl font-black text-lg transition-all ${currentRotation === num ? (gameMode === 'offense' ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-400' : 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400') : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}>{num}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Phase</h3>
                                        <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700">
                                            <button onClick={() => handleViewChange(currentRotation, 'receive1', 'offense')} className={`px-2 py-1 rounded text-[10px] font-bold ${gameMode === 'offense' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>OFF</button>
                                            <button onClick={() => handleViewChange(currentRotation, 'base', 'defense')} className={`px-2 py-1 rounded text-[10px] font-bold ${gameMode === 'defense' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>DEF</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 mb-4">
                                        {currentPhasesList.map(p => (
                                            <button key={p.id} onClick={() => handleViewChange(currentRotation, p.id)} className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentPhase === p.id ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}>
                                                {p.label}
                                                {currentPhase === p.id && <div className={`w-2 h-2 rounded-full ${gameMode === 'offense' ? 'bg-red-500' : 'bg-blue-500'}`} />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-2 border-t border-slate-700">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <FileText size={12} /> Phase Notes
                                        </h3>
                                        <textarea
                                            value={currentNotes}
                                            onChange={(e) => setCurrentNotes(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white resize-none h-24 focus:outline-none focus:border-slate-400"
                                            placeholder="Add notes for this phase..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MAIN COURT */}
                            <div className="lg:col-span-6 flex flex-col items-center w-full">
                                {/* Toolbar: order-2 on mobile (below court), order-1 on desktop (above court) */}
                                <div className="w-full flex flex-wrap gap-2 justify-between items-center mb-4 lg:mb-6 mt-4 lg:mt-0 px-1 relative z-0 order-2 lg:order-1">
                                    {/* Left Side: Camera, Undo/Redo, Tools */}
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleExport('court-capture-area', `Rotation-${currentRotation}-${currentPhase}`)} disabled={isExporting} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-white hover:bg-slate-700 shadow-sm">
                                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                        </button>

                                        <div className="flex gap-1">
                                            <button onClick={undo} disabled={history.length === 0} className={`p-2 rounded-lg border border-slate-700 ${history.length === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-white'}`}><Undo size={18} /></button>
                                            <button onClick={redo} disabled={future.length === 0} className={`p-2 rounded-lg border border-slate-700 ${future.length === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-white'}`}><Redo size={18} /></button>
                                        </div>

                                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
                                            <button onClick={() => setMode('move')} className={`p-1.5 rounded-md ${mode === 'move' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><Move size={18} /></button>
                                            <button onClick={() => setMode('draw')} className={`p-1.5 rounded-md ${mode === 'draw' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><Pencil size={18} /></button>
                                            <button onClick={() => setMode('line')} className={`p-1.5 rounded-md ${mode === 'line' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><DiagonalLineIcon size={18} /></button>
                                            <button onClick={() => setMode('arrow')} className={`p-1.5 rounded-md ${mode === 'arrow' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><CustomArrowIcon size={18} /></button>
                                            <button onClick={() => setMode('polygon')} className={`p-1.5 rounded-md ${mode === 'polygon' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><Hexagon size={18} /></button>
                                        </div>
                                    </div>

                                    {/* Right Side: Colors Only */}
                                    <div className="flex items-center gap-2">
                                        {['draw', 'arrow', 'line', 'rect', 'polygon'].includes(mode) && (
                                            <div className="flex items-center gap-1">
                                                {DRAWING_COLORS.map(c => (
                                                    <button key={c} onClick={() => setDrawColor(c)} className={`w-5 h-5 rounded-full border border-white transition-transform hover:scale-110 flex-shrink-0 ${drawColor === c ? 'ring-2 ring-offset-1 ring-white scale-110' : ''}`} style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Court Wrapper: order-1 on mobile (top), order-2 on desktop (below toolbar) */}
                                {/* Reduced margin to mt-4 and relying on robust touch/coordinate handling */}
                                <div className="w-full bg-slate-800 p-1 md:p-2 rounded-xl shadow-2xl ring-1 ring-slate-700 relative z-10 order-1 lg:order-2 mt-4 lg:mt-0">
                                    <Court courtRef={courtRef} paths={paths} currentPath={currentPath} onMouseDown={handleCourtDown} onDoubleClick={handleDoubleClick} playerPositions={playerPositions} attacker={currentAttacker} hoveredElement={hoveredElement} cursor={cursorClass}>
                                        {Object.entries(playerPositions).map(([id, pos]: [string, any]) => {
                                            const player = roster.find(p => p.id === id);
                                            if (!player) return null;
                                            return <PlayerToken key={id} player={player} x={pos.x} y={pos.y} isDragging={draggedPlayer?.id === id && !draggedPlayer?.isBench} isBench={false} isInteractive={mode === 'move'} onStartInteraction={handleTokenDown} />;
                                        })}
                                    </Court>

                                    {/* OVERLAY BUTTONS FOR COURT ACTIONS (Inside Court Container to be relative) */}
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-40">
                                        {['draw', 'line', 'arrow', 'polygon', 'rect', 'triangle'].includes(mode) && (
                                            <button onClick={() => { saveToHistory(); setPaths([]); }} className="text-[10px] md:text-xs text-rose-500 flex items-center gap-1 px-3 py-1.5 bg-white/90 rounded-full border border-slate-200 shadow-sm hover:bg-white"><Trash2 size={12} /> Clear Drawing</button>
                                        )}
                                        {mode === 'move' && (
                                            <button onClick={handleResetPositions} className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 px-3 py-1.5 bg-white/90 rounded-full border border-slate-200 shadow-sm hover:bg-white"><RefreshCw size={12} /> Reset Pos</button>
                                        )}
                                    </div>
                                </div>

                                {/* MOBILE & TABLET: BENCH STRIP (Visible below lg screens) - order-3 */}
                                <div className="lg:hidden w-full bg-slate-900 border-b border-slate-800 py-4 px-2 overflow-x-auto no-scrollbar flex items-center gap-3 mt-4 min-h-[80px] order-3">
                                    {roster.filter(p => !activePlayerIds.includes(p.id)).map(player => (
                                        <div key={player.id} className={`flex-none w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center relative ${selectedBenchPlayerId === player.id ? 'ring-4 ring-blue-500 z-10' : ''} ${getRoleColor(player.role)} touch-none`} onMouseDown={(e) => handleTokenDown(e, player.id, true)} onTouchStart={(e) => handleTokenDown(e, player.id, true)}>
                                            <span className="text-[10px] font-black leading-none">{player.number}</span>
                                            <span className="text-[7px] font-bold uppercase leading-none opacity-90">{player.role}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* MOBILE & TABLET: CONTROL CENTER (Visible below lg screens) - order-4 */}
                                <MobileControls
                                    currentRotation={currentRotation}
                                    handleViewChange={handleViewChange}
                                    currentPhase={currentPhase}
                                    gameMode={gameMode}
                                    currentPhasesList={currentPhasesList}
                                    currentNotes={currentNotes}
                                    setCurrentNotes={setCurrentNotes}
                                />
                            </div>

                            {/* Sidebar Bench (Desktop) */}
                            <Sidebar
                                roster={roster}
                                activePlayerIds={activePlayerIds}
                                handleTokenDown={handleTokenDown}
                            />
                        </div>
                    </div>
                )}

                {/* Export View Container */}
                <div className={activeTab === 'export' ? 'block' : 'hidden'}>
                    <div className="bg-slate-950 min-h-screen pb-40">
                        <div className="max-w-7xl mx-auto p-4 md:p-6">
                            {/* PLAN SETTINGS HEADER */}
                            <div className="hidden md:flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 max-w-[850px] mx-auto shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Start Rotation:</div>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5, 6].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setPrintViewStartRotation(r)}
                                                className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center transition-all ${printViewStartRotation === r ? 'bg-red-600 text-white shadow-lg scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-white'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Offense/Defense Toggle */}
                                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                        <button
                                            onClick={() => setGameMode('offense')}
                                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${gameMode === 'offense' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            OFF
                                        </button>
                                        <button
                                            onClick={() => setGameMode('defense')}
                                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${gameMode === 'defense' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            DEF
                                        </button>
                                    </div>

                                    {/* Phase Selection Toggles */}
                                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 gap-1">
                                        {currentPhasesList.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setVisiblePhasesMap(prev => {
                                                        const currentList = prev[gameMode];
                                                        let newList;
                                                        if (currentList.includes(p.id)) {
                                                            const filtered = currentList.filter(id => id !== p.id);
                                                            newList = filtered.length ? filtered : [p.id];
                                                        } else {
                                                            newList = [...currentList, p.id];
                                                        }
                                                        return { ...prev, [gameMode]: newList };
                                                    });
                                                }}
                                                className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all ${printViewVisiblePhases.includes(p.id) ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
                                                title={p.label}
                                            >
                                                {p.label.split(' ')[0].substring(0, 1) + (p.label.split(' ')[1] || '').substring(0, 1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Download Button */}
                                    <button
                                        onClick={() => handleExport('full-report-grid', `Start_Rot_${printViewStartRotation}_${gameMode.toUpperCase()}_Plan`)}
                                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all text-white shadow-lg border border-white/10 ${gameMode === 'offense' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                                        title="Download Plan"
                                    >
                                        <Download size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* DESKTOP/TABLET PREVIEW */}
                            <div className="hidden md:flex justify-center">
                                <div className="relative overflow-hidden shadow-2xl border border-slate-700 rounded-lg bg-white" style={{ width: '100%', maxWidth: '850px', aspectRatio: '1224/1584' }}>
                                    <div className="w-full h-full transform origin-top-left scale-[0.55] lg:scale-[0.69]">
                                        <GamePlanPrintView
                                            teams={teams}
                                            currentTeamId={currentTeamId}
                                            lineups={lineups}
                                            currentLineupId={currentLineupId}
                                            roster={roster}
                                            savedRotations={savedRotations}
                                            currentRotation={currentRotation}
                                            currentPhase={currentPhase}
                                            playerPositions={playerPositions}
                                            paths={paths}
                                            activePlayerIds={activePlayerIds}
                                            gameMode={gameMode}
                                            startRotation={printViewStartRotation}
                                            visiblePhases={printViewVisiblePhases}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MOBILE PREVIEW */}
                            <div className="md:hidden space-y-6">
                                {/* NEW: Report Start Selector */}
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Report Start Rotation</div>
                                    <div className="flex gap-2 justify-between">
                                        {[1, 2, 3, 4, 5, 6].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setPrintViewStartRotation(r)}
                                                className={`w-10 h-10 rounded-lg font-black text-lg flex items-center justify-center transition-all ${printViewStartRotation === r ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>



                                {/* NEW: Mobile Phase Selection for Report */}
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Include in Report</div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentPhasesList.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setVisiblePhasesMap(prev => {
                                                        const currentList = prev[gameMode];
                                                        let newList;
                                                        if (currentList.includes(p.id)) {
                                                            const filtered = currentList.filter(id => id !== p.id);
                                                            newList = filtered.length ? filtered : [p.id];
                                                        } else {
                                                            newList = [...currentList, p.id];
                                                        }
                                                        return { ...prev, [gameMode]: newList };
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${printViewVisiblePhases.includes(p.id) ? 'bg-slate-700 text-white border border-slate-500 shadow-md' : 'bg-slate-950 text-slate-600 border border-slate-900'}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${printViewVisiblePhases.includes(p.id) ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mobile Rotation Selector (Existing Preview) */}
                                <div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Preview Rotation</div>
                                    <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex justify-between gap-1 overflow-x-auto">
                                        {[1, 2, 3, 4, 5, 6].map(r => (
                                            <button key={r} onClick={() => setMobilePlanRotation(r)} className={`flex-1 min-w-[40px] h-10 rounded-lg font-black text-lg flex items-center justify-center ${mobilePlanRotation === r ? (gameMode === 'offense' ? 'bg-red-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') : 'bg-slate-900 text-slate-500'}`}>{r}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mobile Single Rotation View */}
                                <div key={mobilePlanRotation} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                                    <div className="bg-slate-800 p-3 flex items-center justify-between border-b border-slate-700">
                                        <h3 className="font-black text-white text-lg">Rotation {mobilePlanRotation}</h3>
                                        <div className="w-20 h-20 bg-white rounded overflow-hidden"><RotationSquare rotation={mobilePlanRotation} roster={roster} /></div>
                                    </div>
                                    <div className="p-3 grid grid-cols-2 gap-3">
                                        {currentPhasesList.map(phase => {
                                            const key = getStorageKey(mobilePlanRotation, phase.id, gameMode);
                                            let data = savedRotations[key];
                                            if (mobilePlanRotation === currentRotation && phase.id === currentPhase && gameMode === gameMode) {
                                                data = { positions: playerPositions, paths: paths, activePlayers: activePlayerIds, notes: currentNotes };
                                            }
                                            let validData = true;
                                            if (data && data.positions) {
                                                const savedIDs = Object.keys(data.positions);
                                                const existingCount = savedIDs.filter(id => roster.find(p => p.id === id)).length;
                                                if (existingCount < 6) validData = false;
                                            } else validData = false;
                                            if (!validData) data = { positions: calculateDefaultPositions(mobilePlanRotation, roster), paths: [], activePlayers: [] };

                                            return (
                                                <div key={phase.id} className="flex flex-col">
                                                    <div className="aspect-square bg-white rounded-lg border border-slate-700 relative overflow-hidden mb-2">
                                                        <Court small={true} paths={data.paths || []} readOnly={true} playerPositions={data.positions || {}} attacker={phase.attacker}>
                                                            {Object.entries(data.positions || {}).map(([id, pos]: [string, any]) => {
                                                                const player = roster.find(p => p.id === id);
                                                                if (!player) return null;
                                                                return <PlayerToken key={id} player={player} x={pos.x} y={pos.y} small={true} />;
                                                            })}
                                                        </Court>
                                                    </div>
                                                    <div className="text-center font-bold text-xs text-slate-400 uppercase">{phase.label}</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>


                        </div>

                        {/* HIDDEN EXPORT CANVAS */}
                        <div className="fixed -left-[9999px] top-0 overflow-hidden">
                            <div id="full-report-grid">
                                <GamePlanPrintView
                                    teams={teams}
                                    currentTeamId={currentTeamId}
                                    lineups={lineups}
                                    currentLineupId={currentLineupId}
                                    roster={roster}
                                    savedRotations={savedRotations}
                                    currentRotation={currentRotation}
                                    currentPhase={currentPhase}
                                    playerPositions={playerPositions}
                                    paths={paths}
                                    activePlayerIds={activePlayerIds}
                                    gameMode={gameMode}
                                    startRotation={printViewStartRotation}
                                    visiblePhases={printViewVisiblePhases}
                                />
                            </div>
                        </div>
                    </div>
                </div >

                {/* --- ROSTER VIEW --- */}
                {activeTab === 'roster' && (
                    <RosterView
                        roster={roster}
                        setRoster={setRoster}
                        updateRoster={updateRoster}
                    />
                )}

            </main >

            {/* --- MOBILE BOTTOM NAVIGATION --- */}
            < div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe z-50" >
                <div className="flex justify-around items-center h-16">
                    <button onClick={() => setActiveTab('roster')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'roster' ? 'text-red-500' : 'text-slate-500'}`}><Users size={20} className={activeTab === 'roster' ? 'fill-current' : ''} /><span className="text-[10px] font-bold mt-1">Roster</span></button>
                    <button onClick={() => setActiveTab('board')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'board' ? 'text-red-500' : 'text-slate-500'}`}><CourtIcon size={20} /><span className="text-[10px] font-bold mt-1">Court</span></button>
                    <button onClick={() => { setActiveTab('export'); saveCurrentState(); }} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'export' ? 'text-red-500' : 'text-slate-500'}`}><Trophy size={20} /><span className="text-[10px] font-bold mt-1">Plan</span></button>
                </div>
            </div >
            {/* Ghost Player Token for Dragging */}
            {
                draggedPlayer && (
                    <PlayerToken
                        player={roster.find(p => p.id === draggedPlayer.id) || DEFAULT_ROSTER[0]}
                        style={{
                            position: 'fixed',
                            left: mousePos.x,
                            top: mousePos.y,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            zIndex: 9999
                        }}
                        isDragging={true}
                        small={false}
                    />
                )
            }
        </div >
    );
}