import { Point, Player, PlayerPosition, ScoutOpponent, PassGrade } from './types';
import { SCOUT_ZONE_POSITIONS } from './constants';

export const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getStorageKey = (rot: number, phase: string, mode: string) => `${rot}_${phase}_${mode}`;

export const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export const isPointInPolygon = (point: Point, vs: Point[]) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return getDistance(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return getDistance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
};

export const getCentroid = (points: Point[]) => {
    if (points.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    points.forEach(p => { x += p.x; y += p.y; });
    return { x: x / points.length, y: y / points.length };
};

export const getPlayerZone = (playerIndex: number, rotationNumber: number) => {
    const zoneSequence = [1, 6, 5, 4, 3, 2];
    const startIdx = (rotationNumber - 1) % 6;
    let seqIndex = (startIdx - playerIndex) % 6;
    if (seqIndex < 0) seqIndex += 6;
    return zoneSequence[seqIndex];
};

export const isFrontRow = (zoneId: number) => [2, 3, 4].includes(zoneId);

export const calculateDefaultPositions = (rotNum: number, currentRoster: Player[]) => {
    const starters = currentRoster.slice(0, 6);
    const newPositions: Record<string, { x: number, y: number }> = {};
    if (starters.length === 0) return newPositions;

    const courtZones = [
        { id: 1, x: 75, y: 75 },
        { id: 2, x: 75, y: 35 },
        { id: 3, x: 50, y: 35 },
        { id: 4, x: 25, y: 35 },
        { id: 5, x: 25, y: 75 },
        { id: 6, x: 50, y: 75 },
    ];

    starters.forEach((player, index) => {
        const zoneId = getPlayerZone(index, rotNum);
        const zone = courtZones.find(z => z.id === zoneId);
        if (zone) {
            newPositions[player.id] = { x: zone.x, y: zone.y };
        }
    });
    return newPositions;
};

// --- DATA INTEGRITY & MIGRATION ---
export const CURRENT_STORAGE_VERSION = 1;

export const sanitizeData = (data: any, type: 'team' | 'lineup' | 'roster') => {
    if (!data) return null;

    // fix: ensure roster exists on teams/lineups
    if (type === 'team' || type === 'lineup') {
        if (!Array.isArray(data.roster)) {
            data.roster = []; // Reset roster if corrupt
        }
    }

    // fix: ensure rotations object exists on lineup
    if (type === 'lineup') {
        if (!data.rotations || typeof data.rotations !== 'object') {
            data.rotations = {};
        }
    }

    return data;
};

export const migrateStorage = () => {
    const version = localStorage.getItem('avb_storage_version');
    const currentVersion = parseInt(version || '0', 10);

    if (currentVersion < CURRENT_STORAGE_VERSION) {
        console.log(`Migrating storage from v${currentVersion} to v${CURRENT_STORAGE_VERSION}...`);

        try {
            // 1. Sanitize Teams
            const teamsRaw = localStorage.getItem('avb_teams');
            if (teamsRaw) {
                let teams = JSON.parse(teamsRaw);
                if (Array.isArray(teams)) {
                    teams = teams.map(t => sanitizeData(t, 'team')).filter(Boolean);
                    localStorage.setItem('avb_teams', JSON.stringify(teams));
                }
            }

            // 2. Sanitize Lineups
            const lineupsRaw = localStorage.getItem('avb_lineups');
            if (lineupsRaw) {
                let lineups = JSON.parse(lineupsRaw);
                if (Array.isArray(lineups)) {
                    lineups = lineups.map(l => sanitizeData(l, 'lineup')).filter(Boolean);
                    localStorage.setItem('avb_lineups', JSON.stringify(lineups));
                }
            }

            // Mark as upgraded
            localStorage.setItem('avb_storage_version', String(CURRENT_STORAGE_VERSION));
            console.log("Migration complete.");
        } catch (e) {
            console.error("Migration failed:", e);
            // Optional: Backup reset code could go here, but risky to auto-wipe
        }
    }
};

// === SCOUT UTILITIES ===

/**
 * Calculate positions for a given rotation based on starting lineup
 * Players rotate clockwise through zones: 1 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1
 *
 * @param startingLineup - Array of 6 player IDs in their R1 order (index 0 = zone 1 in R1)
 * @param targetRotation - Target rotation number (1-6)
 * @returns Record of playerId -> position
 */
export const calculateScoutRotationPositions = (
    startingLineup: string[],
    targetRotation: number
): Record<string, PlayerPosition> => {
    const positions: Record<string, PlayerPosition> = {};

    if (startingLineup.length !== 6) return positions;

    // Zone sequence for clockwise rotation
    const zoneSequence = [1, 6, 5, 4, 3, 2];

    // Calculate rotation offset (how many positions to shift)
    const rotationOffset = (targetRotation - 1) % 6;

    startingLineup.forEach((playerId, lineupIndex) => {
        // In R1, player at lineupIndex 0 is in zone 1, index 1 is in zone 6, etc.
        // This follows the standard volleyball lineup order
        const baseZoneIdx = lineupIndex;

        // Apply rotation offset to get new zone index
        const newZoneIdx = (baseZoneIdx + rotationOffset) % 6;
        const newZone = zoneSequence[newZoneIdx];

        // Get position for this zone
        const zonePos = SCOUT_ZONE_POSITIONS[newZone];
        positions[playerId] = { x: zonePos.x, y: zonePos.y };
    });

    return positions;
};

/**
 * Calculate aggregate statistics for an opponent across all sets
 */
export const calculateOpponentStats = (opponent: ScoutOpponent) => {
    const allPassEvents = opponent.sets.flatMap(s => s.passEvents);
    const allAttackEvents = opponent.sets.flatMap(s => s.attackEvents);
    const allDots = opponent.sets.flatMap(s => s.courtDots);

    // Pass stats per player
    const passerStats: Record<string, { total: number; sum: number; avg: number }> = {};
    allPassEvents.forEach(event => {
        if (!passerStats[event.playerId]) {
            passerStats[event.playerId] = { total: 0, sum: 0, avg: 0 };
        }
        passerStats[event.playerId].total++;
        passerStats[event.playerId].sum += event.grade;
    });
    Object.values(passerStats).forEach(stats => {
        stats.avg = stats.total > 0 ? stats.sum / stats.total : 0;
    });

    // Attack stats per hitter
    const hitterStats: Record<string, { kills: number; errors: number; total: number; killPct: number }> = {};
    allAttackEvents.forEach(event => {
        if (!hitterStats[event.hitterId]) {
            hitterStats[event.hitterId] = { kills: 0, errors: 0, total: 0, killPct: 0 };
        }
        hitterStats[event.hitterId].total++;
        if (event.outcome === 'kill') hitterStats[event.hitterId].kills++;
        if (event.outcome === 'error') hitterStats[event.hitterId].errors++;
    });
    Object.values(hitterStats).forEach(stats => {
        stats.killPct = stats.total > 0 ? (stats.kills / stats.total) * 100 : 0;
    });

    // Overall attack stats
    const totalAttacks = allAttackEvents.length;
    const totalKills = allAttackEvents.filter(e => e.outcome === 'kill').length;
    const totalErrors = allAttackEvents.filter(e => e.outcome === 'error').length;

    return {
        totalSets: opponent.sets.length,
        passStats: {
            total: allPassEvents.length,
            avgGrade: allPassEvents.length > 0
                ? allPassEvents.reduce((sum, e) => sum + e.grade, 0) / allPassEvents.length
                : 0,
            byPlayer: passerStats
        },
        attackStats: {
            total: totalAttacks,
            kills: totalKills,
            errors: totalErrors,
            killPct: totalAttacks > 0 ? (totalKills / totalAttacks) * 100 : 0,
            errorPct: totalAttacks > 0 ? (totalErrors / totalAttacks) * 100 : 0,
            byHitter: hitterStats
        },
        dots: {
            kills: allDots.filter(d => d.type === 'kill'),
            errors: allDots.filter(d => d.type === 'error'),
            aces: allDots.filter(d => d.type === 'ace'),
            serviceErrors: allDots.filter(d => d.type === 'serviceError'),
            blocks: allDots.filter(d => d.type === 'block'),
            total: allDots.length
        }
    };
};