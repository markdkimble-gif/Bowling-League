import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  PLAYERS,
  TOTAL_WEEKS,
  TRIMESTER_WEEKS,
  PTS_PER_GAME_WIN,
  PTS_FOR_SERIES_WIN,
  generateSchedule,
} from '../data/constants';
import { loadData, saveData, getScoresKey } from '../data/storage';

const EMPTY_PLAYER_SCORES = { g1: '', g2: '', g3: '', hcp: '' };
const EMPTY_OPPONENT = { g1: '', g2: '', g3: '' };

function buildDefault() {
  const players = {};
  PLAYERS.forEach((p) => {
    players[p.id] = { ...EMPTY_PLAYER_SCORES };
  });
  return { players, opponent: { ...EMPTY_OPPONENT } };
}

function toNum(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export default function Scores({ currentSeason: season }) {
  const [weekNum, setWeekNum] = useState(1);
  const [data, setData] = useState(() =>
    loadData(getScoresKey(season, 1), buildDefault())
  );

  const schedule = useMemo(() => generateSchedule(season), [season]);

  // Group weeks by trimester for the dropdown
  const trimesterGroups = useMemo(() => {
    const groups = [];
    const numTrimesters = Math.ceil(TOTAL_WEEKS / TRIMESTER_WEEKS);
    for (let t = 0; t < numTrimesters; t++) {
      const start = t * TRIMESTER_WEEKS + 1;
      const end = Math.min(start + TRIMESTER_WEEKS - 1, TOTAL_WEEKS);
      const weeks = schedule.filter((w) => w.week >= start && w.week <= end);
      groups.push({ label: `Trimester ${t + 1}`, weeks });
    }
    return groups;
  }, [schedule]);

  // Reload data when season or week changes
  useEffect(() => {
    const loaded = loadData(getScoresKey(season, weekNum), buildDefault());
    // Ensure all players exist in loaded data
    const players = { ...loaded.players };
    PLAYERS.forEach((p) => {
      if (!players[p.id]) players[p.id] = { ...EMPTY_PLAYER_SCORES };
    });
    setData({ players, opponent: loaded.opponent || { ...EMPTY_OPPONENT } });
  }, [season, weekNum]);

  // Auto-save on data change
  useEffect(() => {
    saveData(getScoresKey(season, weekNum), data);
  }, [data, season, weekNum]);

  const updatePlayer = useCallback((playerId, field, value) => {
    setData((prev) => ({
      ...prev,
      players: {
        ...prev.players,
        [playerId]: {
          ...prev.players[playerId],
          [field]: value,
        },
      },
    }));
  }, []);

  const updateOpponent = useCallback((field, value) => {
    setData((prev) => ({
      ...prev,
      opponent: {
        ...prev.opponent,
        [field]: value,
      },
    }));
  }, []);

  // Calculate team totals per game (sum of player scores + handicaps)
  const teamGameTotals = useMemo(() => {
    let g1 = 0, g2 = 0, g3 = 0;
    PLAYERS.forEach((p) => {
      const ps = data.players[p.id] || EMPTY_PLAYER_SCORES;
      const hcp = toNum(ps.hcp);
      g1 += toNum(ps.g1) + hcp;
      g2 += toNum(ps.g2) + hcp;
      g3 += toNum(ps.g3) + hcp;
    });
    return { g1, g2, g3, series: g1 + g2 + g3 };
  }, [data]);

  const oppTotals = useMemo(() => {
    const g1 = toNum(data.opponent.g1);
    const g2 = toNum(data.opponent.g2);
    const g3 = toNum(data.opponent.g3);
    return { g1, g2, g3, series: g1 + g2 + g3 };
  }, [data]);

  // 9-point calculation
  const points = useMemo(() => {
    const hasAnyInput =
      teamGameTotals.series > 0 || oppTotals.series > 0;
    if (!hasAnyInput) return { g1: 0, g2: 0, g3: 0, series: 0, total: 0 };

    const g1 = teamGameTotals.g1 > oppTotals.g1 ? PTS_PER_GAME_WIN : 0;
    const g2 = teamGameTotals.g2 > oppTotals.g2 ? PTS_PER_GAME_WIN : 0;
    const g3 = teamGameTotals.g3 > oppTotals.g3 ? PTS_PER_GAME_WIN : 0;
    const series =
      teamGameTotals.series > oppTotals.series ? PTS_FOR_SERIES_WIN : 0;
    return { g1, g2, g3, series, total: g1 + g2 + g3 + series };
  }, [teamGameTotals, oppTotals]);

  const currentWeek = schedule.find((w) => w.week === weekNum);

  const ptStyle = (won) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 'bold',
    color: won ? '#16171d' : '#666',
    background: won ? '#e8a020' : 'transparent',
    opacity: won ? 1 : 0.4,
  });

  return (
    <div className="card">
      {/* Week Picker */}
      <div className="week-picker" style={{ marginBottom: 16 }}>
        <label htmlFor="week-select" style={{ fontWeight: 'bold', marginRight: 8 }}>
          Week:
        </label>
        <select
          id="week-select"
          value={weekNum}
          onChange={(e) => setWeekNum(Number(e.target.value))}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-h)',
            fontSize: 16,
          }}
        >
          {trimesterGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.weeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Week {w.week} - {w.date} vs {w.opponent}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {currentWeek && (
        <div style={{ textAlign: 'center', marginBottom: 12, color: 'var(--text)' }}>
          vs <strong style={{ color: 'var(--text-h)' }}>{currentWeek.opponent}</strong>
          {' '}({currentWeek.date})
        </div>
      )}

      {/* Player Score Entry Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
              <th style={{ padding: '6px 8px', width: 70 }}>G1</th>
              <th style={{ padding: '6px 8px', width: 70 }}>G2</th>
              <th style={{ padding: '6px 8px', width: 70 }}>G3</th>
              <th style={{ padding: '6px 8px', width: 70 }}>Series</th>
              <th style={{ padding: '6px 8px', width: 70 }}>HCP</th>
              <th style={{ padding: '6px 8px', width: 90 }}>HCP Series</th>
            </tr>
          </thead>
          <tbody>
            {PLAYERS.map((player) => {
              const ps = data.players[player.id] || EMPTY_PLAYER_SCORES;
              const g1 = toNum(ps.g1);
              const g2 = toNum(ps.g2);
              const g3 = toNum(ps.g3);
              const series = g1 + g2 + g3;
              const hcp = toNum(ps.hcp);
              const hcpSeries = series + 3 * hcp;

              return (
                <tr key={player.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <span style={{ marginRight: 6 }}>{player.avatar}</span>
                    {player.name}
                  </td>
                  {['g1', 'g2', 'g3'].map((field) => (
                    <td key={field} style={{ padding: '4px 4px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={ps[field]}
                        onChange={(e) => updatePlayer(player.id, field, e.target.value)}
                        style={{
                          width: 56,
                          padding: '4px 6px',
                          textAlign: 'center',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          background: 'var(--code-bg)',
                          color: 'var(--text-h)',
                          fontSize: 15,
                        }}
                      />
                    </td>
                  ))}
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '6px 8px',
                      fontWeight: 'bold',
                      color: series > 0 ? 'var(--text-h)' : 'var(--text)',
                    }}
                  >
                    {series > 0 ? series : '-'}
                  </td>
                  <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ps.hcp}
                      onChange={(e) => updatePlayer(player.id, 'hcp', e.target.value)}
                      style={{
                        width: 56,
                        padding: '4px 6px',
                        textAlign: 'center',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        background: 'var(--code-bg)',
                        color: 'var(--text-h)',
                        fontSize: 15,
                      }}
                    />
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '6px 8px',
                      fontWeight: 'bold',
                      color: hcpSeries > 0 ? 'var(--accent)' : 'var(--text)',
                    }}
                  >
                    {hcpSeries > 0 ? hcpSeries : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Opponent Section */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--code-bg)',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Opponent Totals</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {['g1', 'g2', 'g3'].map((field, idx) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 'bold' }}>G{idx + 1}:</span>
              <input
                type="number"
                min={0}
                value={data.opponent[field]}
                onChange={(e) => updateOpponent(field, e.target.value)}
                style={{
                  width: 80,
                  padding: '4px 6px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--bg)',
                  color: 'var(--text-h)',
                  fontSize: 15,
                }}
              />
            </label>
          ))}
          <span style={{ fontWeight: 'bold', color: 'var(--text-h)' }}>
            Series: {oppTotals.series > 0 ? oppTotals.series : '-'}
          </span>
        </div>
      </div>

      {/* Team Totals Row */}
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--accent-bg)',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: 15,
        }}
      >
        <span style={{ fontWeight: 'bold', color: 'var(--text-h)' }}>
          Team Totals (w/ HCP):
        </span>
        <span>G1: {teamGameTotals.g1}</span>
        <span>G2: {teamGameTotals.g2}</span>
        <span>G3: {teamGameTotals.g3}</span>
        <span style={{ fontWeight: 'bold' }}>Series: {teamGameTotals.series}</span>
      </div>

      {/* Live 9-Point Calculator */}
      <div
        className="glow"
        style={{
          padding: '16px',
          borderRadius: 8,
          textAlign: 'center',
          fontSize: 16,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: 'var(--text-h)' }}>
          9-Point Breakdown
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={ptStyle(points.g1 > 0)}>
            G1: {points.g1}
          </span>
          <span style={{ color: 'var(--text)', alignSelf: 'center' }}>|</span>
          <span style={ptStyle(points.g2 > 0)}>
            G2: {points.g2}
          </span>
          <span style={{ color: 'var(--text)', alignSelf: 'center' }}>|</span>
          <span style={ptStyle(points.g3 > 0)}>
            G3: {points.g3}
          </span>
          <span style={{ color: 'var(--text)', alignSelf: 'center' }}>|</span>
          <span style={ptStyle(points.series > 0)}>
            Series: {points.series}
          </span>
          <span style={{ color: 'var(--text)', alignSelf: 'center' }}>=</span>
          <span
            style={{
              ...ptStyle(points.total > 0),
              fontSize: 20,
              padding: '2px 14px',
            }}
          >
            {points.total} pts
          </span>
        </div>
      </div>
    </div>
  );
}
