
export type PlayerRole = 'S' | 'L' | 'M1' | 'M2' | 'OH1' | 'OH2' | 'OPP' | 'DS' | 'Bench' | 'OH' | 'M' | 'Open' | '?';

export interface Player {
  id: string;
  name: string;
  number: string;
  role: PlayerRole;
}

export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'move' | 'draw' | 'line' | 'arrow' | 'polygon' | 'rect' | 'triangle';

export interface DrawingPath {
  points: Point[];
  color: string;
  type: 'draw' | 'line' | 'arrow' | 'polygon' | 'rect' | 'triangle';
  anchorId?: string | null;
  modifiers?: { shift?: boolean };
  widthFactor?: number;
}

export interface DrawingShape {
  id: string;
  type: 'path' | 'line' | 'arrow' | 'polygon' | 'rect' | 'triangle';
  color: string;
  strokeWidth: number;
  points: Point[];
}

export interface PlayerPosition {
  x: number; // percentage
  y: number; // percentage
}

export interface SavedRotationData {
    positions: Record<string, PlayerPosition>;
    paths: DrawingPath[];
    activePlayers: string[];
    notes?: string;
}

export interface Lineup {
  id: string;
  teamId: string;
  name: string;
  roster: Player[];
  rotations: Record<string, SavedRotationData>;
}

export interface Team {
  id: string;
  name: string;
  roster: Player[];
}

export type GameMode = 'offense' | 'defense';

export interface Phase {
    id: string;
    label: string;
    attacker?: 'left' | 'middle' | 'right';
}

// === SCOUT TYPES ===

// Opponent player (for scouting)
export interface ScoutPlayer {
    id: string;
    number: string;
    name?: string;
    isWeakPasser: boolean;
}

// Pass grade (0-3 scale standard in volleyball)
export type PassGrade = 0 | 1 | 2 | 3;

// Attack outcome types
export type AttackOutcome = 'kill' | 'error' | 'blocked' | 'dug';

// Court dot types for tracking where points are scored/lost
export type DotType = 'kill' | 'error' | 'ace' | 'serviceError' | 'block';

// Pass event during a set
export interface PassEvent {
    id: string;
    timestamp: number;
    playerId: string;
    grade: PassGrade;
}

// Attack event during a set
export interface AttackEvent {
    id: string;
    timestamp: number;
    hitterId: string;
    attackFromPosition: PlayerPosition;
    attackToPosition: PlayerPosition;
    outcome: AttackOutcome;
}

// Court dot (point scored/lost location)
export interface CourtDot {
    id: string;
    timestamp: number;
    position: PlayerPosition;
    type: DotType;
    rotation?: number;
}

// Rotation positions for opponent team
export interface ScoutRotationData {
    positions: Record<string, PlayerPosition>;
    manuallyAdjusted: boolean;
}

// A single scouting session (one set of a match)
export interface ScoutSet {
    id: string;
    opponentId: string;
    date: number;
    setNumber: number;
    matchId?: string;
    startingLineup: string[]; // Array of 6 ScoutPlayer IDs in rotation order
    currentRotation: number;
    rotations: Record<number, ScoutRotationData>;
    passEvents: PassEvent[];
    attackEvents: AttackEvent[];
    courtDots: CourtDot[];
    notes?: string;
}

// Opponent team (for scouting)
export interface ScoutOpponent {
    id: string;
    name: string;
    players: ScoutPlayer[];
    sets: ScoutSet[];
    createdAt: number;
    updatedAt: number;
}