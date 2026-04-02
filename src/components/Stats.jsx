import { useState, useMemo } from 'react';
import { PLAYERS, SEASONS, TRIMESTERS, TOTAL_WEEKS, TRIMESTER_WEEKS } from '../data/constants';
import { PLAYER1_2023_24, getHistoricalSeries, getHistoricalHigh } from '../data/historicalData';
import { loadData, getScoresKey, getImportKey } from '../data/storage';

const SUB_TABS = ['This Season', 'Season Compare', 'Player Career'];

function getPlayerWeekData(season, playerId) {
  // For Player 1, 2023/24 season, use hardcoded data
  if (playerId === 1 && season === '2023/24') {
    return PLAYER1_2023_24;
  }
  // Otherwise load from imported data
  const imported = loadData(getImportKey(season, playerId), null);
  if (imported) {
    return Object.values(imported).filter(w => w && w.g1);
  }
  return [];
}

function getSeasonScores(season) {
  const allScores = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const data = loadData(getScoresKey(season, w), null);
    if (data && data.players) {
      allScores[w] = data.players;
    }
  }
  return allScores;
}

function calcAvg(games) {
  if (!games.length) return 0;
  return Math.round(games.reduce((s, g) => s + g, 0) / games.length);
}

export default function Stats({ currentSeason: season }) {
  const [subTab, setSubTab] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(1);

  // This Season data
  const seasonData = useMemo(() => {
    const scores = getSeasonScores(season);
    const playerStats = PLAYERS.map(p => {
      const games = [];
      const weekAvgs = { t1: [], t2: [], t3: [] };
      for (let w = 1; w <= TOTAL_WEEKS; w++) {
        const ws = scores[w]?.[p.id];
        if (ws) {
          const g1 = parseInt(ws.g1) || 0;
          const g2 = parseInt(ws.g2) || 0;
          const g3 = parseInt(ws.g3) || 0;
          if (g1 > 0) games.push(g1);
          if (g2 > 0) games.push(g2);
          if (g3 > 0) games.push(g3);
          const tri = w <= 10 ? 't1' : w <= 20 ? 't2' : 't3';
          [g1, g2, g3].filter(g => g > 0).forEach(g => weekAvgs[tri].push(g));
        }
      }
      return {
        ...p,
        games,
        avg: calcAvg(games),
        high: games.length ? Math.max(...games) : 0,
        gamesPlayed: games.length,
        t1Avg: calcAvg(weekAvgs.t1),
        t2Avg: calcAvg(weekAvgs.t2),
        t3Avg: calcAvg(weekAvgs.t3),
      };
    });

    const allGames = playerStats.flatMap(p => p.games);
    const teamHigh = allGames.length ? Math.max(...allGames) : 0;
    const teamHighPlayer = playerStats.find(p => p.high === teamHigh);

    // Series
    let bestSeries = 0, bestSeriesPlayer = null;
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      for (const p of PLAYERS) {
        const ws = scores[w]?.[p.id];
        if (ws) {
          const s = (parseInt(ws.g1) || 0) + (parseInt(ws.g2) || 0) + (parseInt(ws.g3) || 0);
          if (s > bestSeries) {
            bestSeries = s;
            bestSeriesPlayer = p;
          }
        }
      }
    }

    return { playerStats, teamHigh, teamHighPlayer, bestSeries, bestSeriesPlayer };
  }, [season]);

  // Season Compare data
  const compareData = useMemo(() => {
    return SEASONS.map(s => {
      const playerAvgs = PLAYERS.map(p => {
        const weeks = getPlayerWeekData(s, p.id);
        const allGames = weeks.flatMap(w => [w.g1, w.g2, w.g3]).filter(g => g > 0);
        return { ...p, avg: calcAvg(allGames), games: allGames.length };
      });
      const allGames = playerAvgs.flatMap(p => {
        const weeks = getPlayerWeekData(s, p.id);
        return weeks.flatMap(w => [w.g1, w.g2, w.g3]).filter(g => g > 0);
      });
      return { season: s, playerAvgs, teamAvg: calcAvg(allGames) };
    });
  }, []);

  // Player Career data
  const careerData = useMemo(() => {
    const allWeeks = [];
    const seasonBreakdown = [];
    for (const s of SEASONS) {
      const weeks = getPlayerWeekData(s, selectedPlayer);
      allWeeks.push(...weeks);
      const games = weeks.flatMap(w => [w.g1, w.g2, w.g3]).filter(g => g > 0);
      seasonBreakdown.push({
        season: s,
        avg: calcAvg(games),
        high: games.length ? Math.max(...games) : 0,
        games: games.length,
        weeks,
      });
    }
    const allGames = allWeeks.flatMap(w => [w.g1, w.g2, w.g3]).filter(g => g > 0);
    return {
      careerAvg: calcAvg(allGames),
      careerHigh: allGames.length ? Math.max(...allGames) : 0,
      totalGames: allGames.length,
      seasonBreakdown,
    };
  }, [selectedPlayer]);

  const barStyle = (value, max, color = '#e8a020') => ({
    height: 20,
    width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '2%',
    background: color,
    borderRadius: 3,
    transition: 'width 0.3s',
  });

  return (
    <div className="card">
      <div className="trimester-tabs" style={{ marginBottom: 16 }}>
        {SUB_TABS.map((label, idx) => (
          <button
            key={idx}
            className={`sub-tab${subTab === idx ? ' active' : ''}`}
            onClick={() => setSubTab(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* This Season */}
      {subTab === 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="glow" style={{ padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#999' }}>Team High Game</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>{seasonData.teamHigh || '—'}</div>
              <div style={{ fontSize: 13 }}>{seasonData.teamHighPlayer?.name || ''}</div>
            </div>
            <div className="glow" style={{ padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#999' }}>Best Series</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>{seasonData.bestSeries || '—'}</div>
              <div style={{ fontSize: 13 }}>{seasonData.bestSeriesPlayer?.name || ''}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e8a020' }}>Trimester Averages</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
                  <th style={{ padding: '6px 8px' }}>T1 Avg</th>
                  <th style={{ padding: '6px 8px' }}>T2 Avg</th>
                  <th style={{ padding: '6px 8px' }}>T3 Avg</th>
                  <th style={{ padding: '6px 8px' }}>Season Avg</th>
                  <th style={{ padding: '6px 8px' }}>High</th>
                </tr>
              </thead>
              <tbody>
                {seasonData.playerStats.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '6px 8px' }}>{p.avatar} {p.name}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{p.t1Avg || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{p.t2Avg || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{p.t3Avg || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 'bold', color: '#e8a020' }}>{p.avg || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{p.high || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e8a020' }}>Player Averages</h3>
          {seasonData.playerStats.map(p => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, marginBottom: 2 }}>{p.avatar} {p.name} — {p.avg || '—'}</div>
              <div style={{ background: '#2a1500', borderRadius: 3, overflow: 'hidden' }}>
                <div style={barStyle(p.avg, 250)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Season Compare */}
      {subTab === 1 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: '#e8a020' }}>Team Average by Season</h3>
          <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 500, display: 'block', margin: '0 auto 20px' }}>
            <rect width="400" height="200" fill="#1a0a00" rx="8" />
            {/* Grid lines */}
            {[50, 100, 150].map(y => (
              <line key={y} x1="40" y1={y} x2="380" y2={y} stroke="#333" strokeWidth="0.5" />
            ))}
            {/* Line chart */}
            {compareData.length > 1 && (() => {
              const maxAvg = 220;
              const minAvg = 100;
              const xStep = 320 / (compareData.length - 1);
              const points = compareData.map((d, i) => {
                const x = 40 + i * xStep;
                const y = 180 - ((d.teamAvg - minAvg) / (maxAvg - minAvg)) * 160;
                return `${x},${y}`;
              }).join(' ');
              return (
                <>
                  <polyline points={points} fill="none" stroke="#e8a020" strokeWidth="2.5" />
                  {compareData.map((d, i) => {
                    const x = 40 + i * xStep;
                    const y = 180 - ((d.teamAvg - minAvg) / (maxAvg - minAvg)) * 160;
                    return (
                      <g key={d.season}>
                        <circle cx={x} cy={y} r="4" fill="#e8a020" />
                        <text x={x} y={y - 10} textAnchor="middle" fill="#e8a020" fontSize="12" fontWeight="bold">{d.teamAvg}</text>
                        <text x={x} y="196" textAnchor="middle" fill="#999" fontSize="10">{d.season}</text>
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>

          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e8a020' }}>Player Averages Across Seasons</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
                  {SEASONS.map(s => (
                    <th key={s} style={{ padding: '6px 8px' }}>{s}</th>
                  ))}
                  <th style={{ padding: '6px 8px' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map(p => {
                  const avgs = compareData.map(d => d.playerAvgs.find(pa => pa.id === p.id)?.avg || 0);
                  const lastTwo = avgs.filter(a => a > 0);
                  let trend = '→';
                  let trendColor = '#999';
                  if (lastTwo.length >= 2) {
                    const diff = lastTwo[lastTwo.length - 1] - lastTwo[lastTwo.length - 2];
                    if (diff > 2) { trend = '↑'; trendColor = '#4caf50'; }
                    else if (diff < -2) { trend = '↓'; trendColor = '#f44336'; }
                  }
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '6px 8px' }}>{p.avatar} {p.name}</td>
                      {avgs.map((avg, i) => (
                        <td key={i} style={{ textAlign: 'center', padding: '6px 8px' }}>{avg || '—'}</td>
                      ))}
                      <td style={{ textAlign: 'center', fontSize: 18, color: trendColor }}>{trend}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player Career */}
      {subTab === 2 && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 'bold', marginRight: 8 }}>Player:</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(Number(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #555', background: '#2a1500', color: '#f5e6d0', fontSize: 15 }}
            >
              {PLAYERS.map(p => (
                <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="glow" style={{ padding: 12, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Career Avg</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>{careerData.careerAvg || '—'}</div>
            </div>
            <div className="glow" style={{ padding: 12, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Career High</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>{careerData.careerHigh || '—'}</div>
            </div>
            <div className="glow" style={{ padding: 12, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Total Games</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>{careerData.totalGames || '—'}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e8a020' }}>Season Breakdown</h3>
          {careerData.seasonBreakdown.map(s => (
            <div key={s.season} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, marginBottom: 2 }}>{s.season} — Avg: {s.avg || '—'}, High: {s.high || '—'}, Games: {s.games}</div>
              <div style={{ background: '#2a1500', borderRadius: 3, overflow: 'hidden' }}>
                <div style={barStyle(s.avg, 250)} />
              </div>
            </div>
          ))}

          {/* Rolling avg sparkline per season */}
          {careerData.seasonBreakdown.filter(s => s.weeks.length > 0).map(s => {
            const games = s.weeks.flatMap(w => [w.g1, w.g2, w.g3]).filter(g => g > 0);
            if (games.length < 3) return null;
            const rolling = [];
            for (let i = 0; i < games.length; i++) {
              const start = Math.max(0, i - 8);
              const slice = games.slice(start, i + 1);
              rolling.push(calcAvg(slice));
            }
            const min = Math.min(...rolling) - 10;
            const max = Math.max(...rolling) + 10;
            const w = 300, h = 60;
            const xStep = w / (rolling.length - 1);
            const pts = rolling.map((v, i) => `${i * xStep},${h - ((v - min) / (max - min)) * h}`).join(' ');
            return (
              <div key={s.season} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>Rolling Avg — {s.season}</div>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 400, display: 'block' }}>
                  <polyline points={pts} fill="none" stroke="#e8a020" strokeWidth="1.5" />
                </svg>
              </div>
            );
          })}

          {/* Week-by-week table */}
          {careerData.seasonBreakdown.filter(s => s.weeks.length > 0).map(s => (
            <div key={s.season} style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 14, color: '#e8a020', marginBottom: 6 }}>{s.season} Week-by-Week</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 6px' }}>Wk</th>
                      <th style={{ padding: '4px 6px' }}>Date</th>
                      <th style={{ padding: '4px 6px' }}>Gm1</th>
                      <th style={{ padding: '4px 6px' }}>Gm2</th>
                      <th style={{ padding: '4px 6px' }}>Gm3</th>
                      <th style={{ padding: '4px 6px' }}>Series</th>
                      <th style={{ padding: '4px 6px' }}>HCP</th>
                      <th style={{ padding: '4px 6px' }}>HS</th>
                      <th style={{ padding: '4px 6px' }}>Avg Before</th>
                      <th style={{ padding: '4px 6px' }}>Avg After</th>
                      <th style={{ padding: '4px 6px' }}>+/- Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.weeks.map((w, i) => {
                      const series = w.g1 + w.g2 + w.g3;
                      const hs = Math.max(w.g1, w.g2, w.g3);
                      const diff = (w.avgAfter || 0) - (w.avgBefore || 0);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.week}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.date}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.g1}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.g2}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.g3}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 'bold' }}>{series}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.hcp}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{hs}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.avgBefore || '—'}</td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>{w.avgAfter || '—'}</td>
                          <td style={{
                            textAlign: 'center',
                            padding: '4px 6px',
                            color: diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#999',
                            fontWeight: diff !== 0 ? 'bold' : 'normal',
                          }}>
                            {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
