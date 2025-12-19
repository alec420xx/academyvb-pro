
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