import { Phase, PlayerRole, Player } from './types';

export const OFFENSE_PHASES: Phase[] = [
  { id: 'receive1', label: 'Receive 1' },
  { id: 'receive2', label: 'Receive 2' },
  { id: 'transition', label: 'Transition' },
  { id: 'freeball', label: 'Free Ball' },
];

export const DEFENSE_PHASES: Phase[] = [
  { id: 'base', label: 'Base' },
  { id: 'def_outside', label: 'Outside', attacker: 'left' }, 
  { id: 'def_middle', label: 'Middle', attacker: 'middle' },
  { id: 'def_opp', label: 'Opposite', attacker: 'right' }, 
];

export const DEFAULT_ROSTER: Player[] = [
  { id: 'p1', role: 'S', name: 'Setter', number: '1' },
  { id: 'p2', role: 'OH1', name: 'Outside 1', number: '2' },
  { id: 'p3', role: 'M1', name: 'Middle 1', number: '3' },
  { id: 'p4', role: 'OPP', name: 'Opposite', number: '4' },
  { id: 'p5', role: 'OH2', name: 'Outside 2', number: '5' },
  { id: 'p6', role: 'M2', name: 'Middle 2', number: '6' },
  { id: 'p7', role: 'L', name: 'Libero', number: '9' },
  { id: 'p8', role: 'DS', name: 'Def. Spec', number: '10' },
  { id: 'p9', role: 'DS', name: 'Def. Spec 2', number: '11' },
  { id: 'p10', role: 'OH', name: 'Sub OH', number: '12' },
  { id: 'p11', role: 'S', name: 'Sub Setter', number: '13' },
  { id: 'p12', role: 'M', name: 'Sub Middle', number: '14' },
];

// Define colors in one place to ensure drawing tools match tokens
export const COLOR_PALETTE = {
  Red: '#dc2626',    // OPP
  Orange: '#f97316', // L
  Yellow: '#facc15', // S
  Green: '#10b981',  // OH
  Blue: '#4f46e5',   // M
  Pink: '#ec4899',   // DS
  Black: '#000000',
  Gray: '#9ca3af',
  White: '#ffffff'
};

export const getRoleColor = (role: string): string => {
  if (role === 'S') return 'bg-yellow-400 text-yellow-950 border-yellow-500'; // Yellow
  if (role === 'L') return 'bg-orange-500 text-white border-orange-700'; // Orange
  if (role === '?' || role === 'Open') return 'bg-slate-200 text-slate-400 border-slate-300 border-dashed';
  if (role.startsWith('M')) return 'bg-indigo-600 text-white border-indigo-700'; // Blue/Indigo
  if (role.startsWith('OH')) return 'bg-emerald-500 text-white border-emerald-700'; // Green
  if (role === 'OPP') return 'bg-red-600 text-white border-red-700'; // Red
  if (role === 'DS') return 'bg-pink-500 text-white border-pink-700'; // Pink
  return 'bg-slate-500 text-white border-slate-600';
};

export const DRAWING_COLORS = [
  COLOR_PALETTE.Red,    // OPP
  COLOR_PALETTE.Orange, // L
  COLOR_PALETTE.Yellow, // S
  COLOR_PALETTE.Green,  // OH
  COLOR_PALETTE.Blue,   // M
  COLOR_PALETTE.Pink,   // DS
  COLOR_PALETTE.Black,
  COLOR_PALETTE.Gray
];