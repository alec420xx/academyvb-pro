import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { ScoutPlayer } from '../../types';

interface ScoutLineupSheetProps {
    players: ScoutPlayer[];
    onLineupComplete: (playerIds: string[], declaredRotation: number) => void;
}

/**
 * A visual lineup sheet where users input jersey numbers into zone positions.
 * Users declare what rotation they're observing, and the system calculates the rest.
 *
 * Layout mirrors a volleyball court from the opponent's perspective:
 *   Zone 4 | Zone 3 | Zone 2   (front row - near the net)
 *   Zone 5 | Zone 6 | Zone 1   (back row - far from net)
 */
export const ScoutLineupSheet: React.FC<ScoutLineupSheetProps> = ({
    players,
    onLineupComplete
}) => {
    // Zone inputs - store jersey numbers, not player IDs
    const [zoneInputs, setZoneInputs] = useState<Record<number, string>>({
        1: '', 2: '', 3: '', 4: '', 5: '', 6: ''
    });
    const [declaredRotation, setDeclaredRotation] = useState(1);
    const [error, setError] = useState<string | null>(null);

    // Zone layout: visual positions on the grid
    // Top row: zones 4, 3, 2 (left to right, front court)
    // Bottom row: zones 5, 6, 1 (left to right, back court)
    const topRow = [4, 3, 2];
    const bottomRow = [5, 6, 1];

    const handleInputChange = (zone: number, value: string) => {
        setZoneInputs(prev => ({ ...prev, [zone]: value }));
        setError(null);
    };

    const handleSubmit = () => {
        // Validate all zones are filled
        const filledZones = Object.values(zoneInputs).filter(v => v.trim() !== '');
        if (filledZones.length !== 6) {
            setError('Please fill in all 6 positions');
            return;
        }

        // Map jersey numbers to player IDs
        const playerIds: (string | null)[] = [];
        const usedPlayerIds = new Set<string>();

        // Order: zone 1, 6, 5, 4, 3, 2 (standard volleyball lineup order)
        const zoneOrder = [1, 6, 5, 4, 3, 2];

        for (const zone of zoneOrder) {
            const jerseyNumber = zoneInputs[zone].trim();
            const player = players.find(p => p.number === jerseyNumber && !usedPlayerIds.has(p.id));

            if (!player) {
                setError(`Player #${jerseyNumber} not found in roster. Add them first.`);
                return;
            }

            usedPlayerIds.add(player.id);
            playerIds.push(player.id);
        }

        // All valid - submit
        onLineupComplete(playerIds as string[], declaredRotation);
    };

    const renderZoneInput = (zone: number) => {
        const value = zoneInputs[zone];
        const player = value ? players.find(p => p.number === value.trim()) : null;

        return (
            <div
                key={zone}
                className="flex flex-col items-center justify-center bg-slate-800 border-2 border-slate-600 rounded-lg p-3 min-w-[80px] min-h-[80px]"
            >
                <span className="text-xs text-slate-500 mb-1">Zone {zone}</span>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(zone, e.target.value)}
                    placeholder="#"
                    className="w-12 h-12 text-center text-xl font-bold bg-slate-700 border border-slate-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={3}
                />
                {player && (
                    <span className={`text-xs mt-1 ${player.isWeakPasser ? 'text-amber-400' : 'text-slate-400'}`}>
                        {player.name || `#${player.number}`}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6 bg-slate-900 rounded-xl max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">Enter Starting Lineup</h2>

            {/* Rotation selector */}
            <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">This is rotation:</span>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(rot => (
                        <button
                            key={rot}
                            onClick={() => setDeclaredRotation(rot)}
                            className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${declaredRotation === rot
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            R{rot}
                        </button>
                    ))}
                </div>
            </div>

            {/* Net indicator */}
            <div className="w-full flex items-center gap-2">
                <div className="flex-1 h-1 bg-white rounded"></div>
                <span className="text-xs text-slate-400 uppercase px-2">Net</span>
                <div className="flex-1 h-1 bg-white rounded"></div>
            </div>

            {/* Zone grid - opponent's view */}
            <div className="flex flex-col gap-2">
                {/* Front row: 4, 3, 2 */}
                <div className="flex gap-2">
                    {topRow.map(zone => renderZoneInput(zone))}
                </div>
                {/* Back row: 5, 6, 1 */}
                <div className="flex gap-2">
                    {bottomRow.map(zone => renderZoneInput(zone))}
                </div>
            </div>

            {/* Service direction indicator */}
            <div className="text-xs text-slate-500 flex items-center gap-1">
                <RotateCcw size={12} />
                <span>Server in Zone 1 (bottom right)</span>
            </div>

            {/* Error message */}
            {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Available players hint */}
            <div className="text-xs text-slate-500 text-center">
                <p>Available players: {players.map(p => `#${p.number}`).join(', ') || 'None'}</p>
            </div>

            {/* Submit button */}
            <button
                onClick={handleSubmit}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors"
            >
                Start Scouting
            </button>
        </div>
    );
};
