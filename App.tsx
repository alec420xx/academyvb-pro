import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Menu, Download, Trash2, RotateCcw,
    Save, Plus, Grid, Users, Layout, Settings, FileText,
    MousePointer2, Move, Eraser, Pen, Edit3, X, ImageIcon,
    PenTool, Type, Circle, Square, Minus, LogIn, Trophy,
    ArrowUpFromLine, Layers, Share2, Camera, Loader2,
    Check, AlertTriangle, Info, Monitor, Smartphone,
    MenuSquare, UserPlus, LogOut, Link, Hexagon, RefreshCw,
    Cloud, CloudOff
} from 'lucide-react';
import { TeamManager } from './components/managers/TeamManager';
import { LineupManager } from './components/managers/LineupManager';
import { useBoardInteraction } from './hooks/useBoardInteraction';
import { Player, DrawingPath, PlayerPosition, Team, Lineup, SavedRotationData, GameMode } from './types';
import { OFFENSE_PHASES, DEFENSE_PHASES, DEFAULT_ROSTER, getRoleColor, DRAWING_COLORS } from './constants';
import { generateId, getStorageKey, calculateDefaultPositions, migrateStorage } from './utils';
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


export default function App() {
    const [activeTab, setActiveTab] = useState<'roster' | 'board' | 'export'>('board');
    const [gameMode, setGameMode] = useState<GameMode>('offense');
    const [currentRotation, setCurrentRotation] = useState(1);
    const [currentPhase, setCurrentPhase] = useState('receive1');
    const [mode, setMode] = useState<'move' | 'draw' | 'line' | 'arrow' | 'polygon' | 'rect' | 'triangle'>('move');
    const [drawColor, setDrawColor] = useState('#000000');
    const [isExporting, setIsExporting] = useState(false);

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

    // --- DATA LOADING & SYNC ---
    const { saveRoster, saveRotations, loadInitialData, isSyncing, user } = useCloudData();
    const { signInWithGoogle, logout } = useAuth();

    const [roster, setRoster] = useState<Player[]>(DEFAULT_ROSTER);
    const [savedRotations, setSavedRotations] = useState<Record<string, SavedRotationData>>({});
    const [activePlayerIds, setActivePlayerIds] = useState<string[]>([]);
    const [currentNotes, setCurrentNotes] = useState('');

    // --- BOARD INTERACTION HOOK ---
    // We pass the "saved" data for the current view into the hook.
    // The hook will initialize its state from that.
    const currentStorageKey = getStorageKey(currentRotation, currentPhase, gameMode);
    const currentSavedData = savedRotations[currentStorageKey];

    const {
        playerPositions, setPlayerPositions,
        paths, setPaths,
        currentPath,
        hoveredElement,
        mousePos,
        isDrawing,
        draggedPlayer, setDraggedPlayer,
        selectedBenchPlayerId, setSelectedBenchPlayerId,
        handlers,

        undo, redo, history, future,
        saveToHistory, resetHistory,
        swapPlayers
    } = useBoardInteraction({
        mode,
        drawColor,
        roster,

        activePlayerIds,
        setActivePlayerIds,
        currentRotation,
        gameMode,
        savedPaths: currentSavedData?.paths,
        savedPositions: currentSavedData?.positions
    });

    // UI Refs
    const courtRef = useRef<HTMLDivElement>(null);

    // Bench Handler

    const handleTokenDown = (e: React.MouseEvent | React.TouchEvent, player: Player) => {
        e.stopPropagation();

        const isCourtPlayer = activePlayerIds.includes(player.id);

        if (!isCourtPlayer) {
            // Bench Interaction
            if (selectedBenchPlayerId === player.id) {
                setSelectedBenchPlayerId(null);
            } else {
                setSelectedBenchPlayerId(player.id);
                // Also set dragging for visual feedback or immediate drag
                setDraggedPlayer({ id: player.id, isBench: true });
            }
        } else {
            // Court Interaction
            if (selectedBenchPlayerId) {
                // Perform Swap
                swapPlayers(selectedBenchPlayerId, player.id);
            } else {
                // Start Dragging Court Player
                setDraggedPlayer({ id: player.id, isBench: false });
            }
        }
    };

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

    // --- HELPERS (Layout defaults) ---


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
    const createTeam = (name: string) => {
        const newTeam: Team = { id: generateId('team'), name: name || 'New Team', roster: DEFAULT_ROSTER };
        saveTeamsToStorage([...teams, newTeam]);
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
        setCurrentPhase('receive1');
        resetHistory();
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
        setGameMode(newMode);
        resetHistory();
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











    const updateRoster = (index: number, field: keyof Player, value: string) => {
        if (field === 'number' && value.length > 4) return;
        const newRoster = [...roster];
        // @ts-ignore
        newRoster[index] = { ...newRoster[index], [field]: value };
        setRoster(newRoster);
    };

    const currentPhasesList = gameMode === 'offense' ? OFFENSE_PHASES : DEFENSE_PHASES;
    const currentAttacker = currentPhasesList.find(p => p.id === currentPhase)?.attacker;



    // Dynamic cursor logic
    let cursorClass = 'cursor-default';
    if (mode === 'move') {
        if (draggedPlayer && !draggedPlayer.isBench) {
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
                                        <div className="w-px h-8 bg-slate-800 mx-1"></div>
                                        <button onClick={undo} disabled={history.length === 0} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-white hover:bg-slate-700 shadow-sm disabled:opacity-50"><RotateCcw size={18} /></button>
                                        <button onClick={redo} disabled={future.length === 0} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-white hover:bg-slate-700 shadow-sm disabled:opacity-50 rotate-180"><RotateCcw size={18} /></button>
                                        <div className="w-px h-8 bg-slate-800 mx-1"></div>
                                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                            <button onClick={() => setMode('move')} className={`p-2 rounded ${mode === 'move' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><MousePointer2 size={18} /></button>
                                            <button onClick={() => setMode('draw')} className={`p-2 rounded ${mode === 'draw' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><Pen size={18} /></button>
                                            <button onClick={() => setMode('line')} className={`p-2 rounded ${mode === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><Minus size={18} /></button>
                                            <button onClick={() => setMode('arrow')} className={`p-2 rounded ${mode === 'arrow' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><Move size={18} /></button>
                                            <button onClick={() => setMode('polygon')} className={`p-2 rounded ${mode === 'polygon' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><Hexagon size={18} /></button>
                                        </div>
                                    </div>
                                    {/* Right Side: Colors */}
                                    <div className="flex bg-slate-800 rounded-lg p-1.5 border border-slate-700 gap-1.5">
                                        {DRAWING_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setDrawColor(color)}
                                                className={`w-6 h-6 rounded-full border-2 transition-all ${drawColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Court Wrapper: order-1 on mobile (top), order-2 on desktop (below toolbar) */}
                                {/* Reduced margin to mt-4 and relying on robust touch/coordinate handling */}
                                <div className="w-full bg-slate-800 p-1 md:p-2 rounded-xl shadow-2xl ring-1 ring-slate-700 relative z-10 order-1 lg:order-2 mt-4 lg:mt-0">
                                    <Court courtRef={courtRef} paths={paths} currentPath={currentPath} onMouseDown={handlers.onMouseDown} onDoubleClick={handlers.onDoubleClick} playerPositions={playerPositions} attacker={currentAttacker} hoveredElement={hoveredElement} cursor={cursorClass}>
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
                                        <div key={player.id} className={`flex-none w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center relative ${selectedBenchPlayerId === player.id ? 'ring-4 ring-blue-500 z-10' : ''} ${getRoleColor(player.role)} touch-none`} onMouseDown={(e) => handleTokenDown(e, player)} onTouchStart={(e) => handleTokenDown(e, player)}>
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