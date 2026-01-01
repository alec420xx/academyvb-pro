import { Point, Player } from './types';

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