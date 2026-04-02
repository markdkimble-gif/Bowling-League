import { useState, useMemo } from 'react';
import {
  SEASONS,
  TRIMESTERS,
  TOTAL_WEEKS,
  TRIMESTER_WEEKS,
  generateSchedule,
} from '../data/constants';
import {
  PLAYER1_2023_24,
  getHistoricalSeries,
  getHistoricalHigh,
} from '../data/historicalData';
import { loadData, getScoresKey, getImportKey } from '../data/storage';

/* ─── Helpers ─── */

function calcAvg(games) {
  if (!games.length) return 0;
  return Math.round(games.reduce((s, g) => s + g, 0) / games.length);
}

function calcSeries(g1, g2, g3) {
  return (g1 || 0) + (g2 || 0) + (g3 || 0);
}

function getHighGame(w) {
  return Math.max(w.g1 || 0, w.g2 || 0, w.g3 || 0);
}

function buildRollingAvg(games, window = 9) {
  const rolling = [];
  for (let i = 0; i < games.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = games.slice(start, i + 1);
    rolling.push(calcAvg(slice));
  }
  return rolling;
}

function toNum(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Load all stored scores for a season keyed by week number */
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

/** Get weekly detail rows for a player in a season (historical or imported or stored) */
function getPlayerWeekData(season, playerId) {
  if (playerId === 1 && season === '2023/24') {
    return PLAYER1_2023_24;
  }
  const imported = loadData(getImportKey(season, playerId), null);
  if (imported && Array.isArray(imported)) {
    return imported.filter((w) => w && w.g1);
  }
  if (imported && typeof imported === 'object') {
    return Object.values(imported).filter((w) => w && w.g1);
  }
  // Fall back to stored scores
  const scores = getSeasonScores(season);
  const schedule = generateSchedule(season);
  const rows = [];
  let runSum = 0;
  let runCount = 0;
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const ps = scores[w]?.[playerId];
    if (!ps) continue;
    const g1 = toNum(ps.g1), g2 = toNum(ps.g2), g3 = toNum(ps.g3);
    if (!g1 && !g2 && !g3) continue;
    const avgBefore = runCount > 0 ? Math.round(runSum / runCount) : 0;
    runSum += g1 + g2 + g3;
    runCount += 3;
    const avgAfter = Math.round(runSum / runCount);
    const sched = schedule.find((s) => s.week === w);
    rows.push({
      week: w,
      date: sched ? sched.date : '',
      g1, g2, g3,
      hcp: toNum(ps.hcp),
      avgBefore,
      avgAfter,
    });
  }
  return rows;
}

/** Get flat array of all games for a player in a season */
function getPlayerGames(season, playerId) {
  const weeks = getPlayerWeekData(season, playerId);
  return weeks.flatMap((w) => [w.g1, w.g2, w.g3]).filter((g) => g > 0);
}

/* ─── Bar helper ─── */
function barStyle(value, max, color = '#e8a020') {
  return {
    height: 20,
    width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '2%',
    background: color,
    borderRadius: 3,
    transition: 'width 0.3s',
  };
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export default function Stats({ currentSeason: season, players: PLAYERS }) {
  const [subTab, setSubTab] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(1);

  /* ── This Season data ── */
  const seasonData = useMemo(() => {
    const playerStats = PLAYERS.map((p) => {
      const weeks = getPlayerWeekData(season, p.id);
      const games = [];
      const weekSeries = [];
      const triGames = { t1: [], t2: [], t3: [] };
      for (const w of weeks) {
        const g1 = toNum(w.g1), g2 = toNum(w.g2), g3 = toNum(w.g3);
        if (g1) games.push(g1);
        if (g2) games.push(g2);
        if (g3) games.push(g3);
        if (g1 || g2 || g3) weekSeries.push(g1 + g2 + g3);
        const wk = w.week || 0;
        const tri = wk <= TRIMESTER_WEEKS ? 't1' : wk <= TRIMESTER_WEEKS * 2 ? 't2' : 't3';
        [g1, g2, g3].filter((g) => g > 0).forEach((g) => triGames[tri].push(g));
      }
      const avg = calcAvg(games);
      const high = games.length ? Math.max(...games) : 0;
      // Improvement: last-3-game avg minus first-3-game avg
      let improvement = null;
      if (games.length >= 6) {
        improvement = calcAvg(games.slice(-3)) - calcAvg(games.slice(0, 3));
      }
      // Consistency: standard deviation
      let stdDev = null;
      if (games.length >= 3) {
        const mean = games.reduce((s, g) => s + g, 0) / games.length;
        const variance = games.reduce((s, g) => s + (g - mean) ** 2, 0) / games.length;
        stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
      }
      return {
        ...p, games, avg, high,
        gamesPlayed: games.length,
        t1Avg: calcAvg(triGames.t1),
        t2Avg: calcAvg(triGames.t2),
        t3Avg: calcAvg(triGames.t3),
        improvement,
        stdDev,
        highSeries: weekSeries.length ? Math.max(...weekSeries) : 0,
      };
    });

    // Team high game
    const withGames = playerStats.filter((p) => p.high > 0);
    const teamHighPlayer = withGames.length
      ? withGames.reduce((a, b) => (a.high > b.high ? a : b))
      : null;

    // Best series
    let bestSeries = 0;
    let bestSeriesPlayer = null;
    for (const ps of playerStats) {
      if (ps.highSeries > bestSeries) {
        bestSeries = ps.highSeries;
        bestSeriesPlayer = ps;
      }
    }

    // Most improved
    const improvable = playerStats.filter((p) => p.improvement !== null);
    const mostImproved = improvable.length
      ? improvable.reduce((a, b) => (a.improvement > b.improvement ? a : b))
      : null;

    // Most consistent (lowest std dev)
    const consistent = playerStats.filter((p) => p.stdDev !== null);
    const mostConsistent = consistent.length
      ? consistent.reduce((a, b) => (a.stdDev < b.stdDev ? a : b))
      : null;

    return {
      playerStats,
      teamHigh: teamHighPlayer ? teamHighPlayer.high : 0,
      teamHighPlayer,
      bestSeries,
      bestSeriesPlayer,
      mostImproved,
      mostConsistent,
      hasData: withGames.length > 0,
    };
  }, [season]);

  /* ── Season Compare data ── */
  const compareData = useMemo(() => {
    return SEASONS.map((s) => {
      const playerAvgs = PLAYERS.map((p) => {
        const games = getPlayerGames(s, p.id);
        return { ...p, avg: calcAvg(games), games: games.length };
      });
      const allGames = PLAYERS.flatMap((p) => getPlayerGames(s, p.id));
      return { season: s, playerAvgs, teamAvg: calcAvg(allGames), gameCount: allGames.length };
    });
  }, []);

  /* ── Player Career data ── */
  const careerData = useMemo(() => {
    const seasonBreakdown = SEASONS.map((s) => {
      const weeks = getPlayerWeekData(s, selectedPlayer);
      const games = weeks.flatMap((w) => [w.g1, w.g2, w.g3]).filter((g) => g > 0);
      return {
        season: s,
        avg: calcAvg(games),
        high: games.length ? Math.max(...games) : 0,
        games: games.length,
        weeks,
        allGames: games,
      };
    });
    const allGames = seasonBreakdown.flatMap((s) => s.allGames);
    return {
      careerAvg: calcAvg(allGames),
      careerHigh: allGames.length ? Math.max(...allGames) : 0,
      totalGames: allGames.length,
      seasonBreakdown,
    };
  }, [selectedPlayer]);

  /* ══════════ RENDER ══════════ */

  return (
    <div className="fade-in">
      <div className="sub-tabs">
        {['This Season', 'Season Compare', 'Player Career'].map((label, idx) => (
          <button
            key={label}
            className={`sub-tab${subTab === idx ? ' active' : ''}`}
            onClick={() => setSubTab(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ SUB-VIEW 1: THIS SEASON ═══ */}
      {subTab === 0 && (
        <div>
          {!seasonData.hasData ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>No score data entered yet for {season}. Enter scores first!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Fun stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#999' }}>Team High Game</div>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>
                    {seasonData.teamHigh || '\u2014'}
                  </div>
                  <div style={{ fontSize: 13 }}>{seasonData.teamHighPlayer?.name || ''}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#999' }}>Team High Series</div>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>
                    {seasonData.bestSeries || '\u2014'}
                  </div>
                  <div style={{ fontSize: 13 }}>{seasonData.bestSeriesPlayer?.name || ''}</div>
                </div>
                {seasonData.mostImproved && seasonData.mostImproved.improvement !== null && (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#999' }}>Most Improved</div>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>
                      {seasonData.mostImproved.improvement > 0 ? '+' : ''}
                      {Math.round(seasonData.mostImproved.improvement)}
                    </div>
                    <div style={{ fontSize: 13 }}>{seasonData.mostImproved.name}</div>
                  </div>
                )}
                {seasonData.mostConsistent && seasonData.mostConsistent.stdDev !== null && (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#999' }}>Most Consistent</div>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e8a020' }}>
                      {seasonData.mostConsistent.stdDev} SD
                    </div>
                    <div style={{ fontSize: 13 }}>{seasonData.mostConsistent.name}</div>
                  </div>
                )}
              </div>

              {/* Trimester breakdown table */}
              <div className="card">
                <h3>Trimester Averages</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Player</th>
                        <th>T1 Avg</th>
                        <th>T2 Avg</th>
                        <th>T3 Avg</th>
                        <th>Season Avg</th>
                        <th>High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonData.playerStats.map((p) => (
                        <tr key={p.id}>
                          <td>{p.avatar} {p.name}</td>
                          <td style={{ textAlign: 'center' }}>{p.t1Avg || '\u2014'}</td>
                          <td style={{ textAlign: 'center' }}>{p.t2Avg || '\u2014'}</td>
                          <td style={{ textAlign: 'center' }}>{p.t3Avg || '\u2014'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e8a020' }}>{p.avg || '\u2014'}</td>
                          <td style={{ textAlign: 'center' }}>{p.high || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bar chart: avg + high per player */}
              <div className="card">
                <h3>Player Average &amp; High Game</h3>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 13 }}>
                  <span>
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: '#e8a020', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                    Average
                  </span>
                  <span>
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: '#5ba3d9', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                    High Game
                  </span>
                </div>
                {seasonData.playerStats.filter((p) => p.avg > 0).map((p) => (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, marginBottom: 2 }}>{p.avatar} {p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={barStyle(p.avg, 300, '#e8a020')} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.avg}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={barStyle(p.high, 300, '#5ba3d9')} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.high}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SUB-VIEW 2: SEASON COMPARE ═══ */}
      {subTab === 1 && (
        <div>
          {/* Team avg bar chart */}
          <div className="card">
            <h3>Team Average by Season</h3>
            {compareData.filter((d) => d.teamAvg > 0).length === 0 ? (
              <p style={{ color: '#999' }}>No data across seasons yet.</p>
            ) : (
              compareData.filter((d) => d.teamAvg > 0).map((d) => (
                <div key={d.season} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 2 }}>{d.season}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={barStyle(d.teamAvg, 250)} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{d.teamAvg}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Player avg table with trend arrows */}
          <div className="card">
            <h3>Player Averages Across Seasons</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Player</th>
                    {SEASONS.map((s) => (
                      <th key={s}>{s}</th>
                    ))}
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAYERS.map((p) => {
                    const avgs = compareData.map(
                      (d) => d.playerAvgs.find((pa) => pa.id === p.id)?.avg || 0
                    );
                    const nonZero = avgs.filter((a) => a > 0);
                    let trend = '\u2192';
                    let trendColor = '#999';
                    if (nonZero.length >= 2) {
                      const diff = nonZero[nonZero.length - 1] - nonZero[nonZero.length - 2];
                      if (diff > 2) { trend = '\u2191'; trendColor = '#4caf50'; }
                      else if (diff < -2) { trend = '\u2193'; trendColor = '#f44336'; }
                    }
                    return (
                      <tr key={p.id}>
                        <td>{p.avatar} {p.name}</td>
                        {avgs.map((avg, i) => (
                          <td key={i} style={{ textAlign: 'center' }}>{avg || '\u2014'}</td>
                        ))}
                        <td style={{ textAlign: 'center', fontSize: 18, color: trendColor, fontWeight: 'bold' }}>
                          {trend}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SVG line chart: team average over time */}
          {(() => {
            const valid = compareData.filter((d) => d.teamAvg > 0);
            if (valid.length < 2) return null;
            const chartW = 400;
            const chartH = 200;
            const pad = { top: 25, right: 20, bottom: 30, left: 45 };
            const plotW = chartW - pad.left - pad.right;
            const plotH = chartH - pad.top - pad.bottom;
            const maxA = Math.max(...valid.map((d) => d.teamAvg)) + 10;
            const minA = Math.min(...valid.map((d) => d.teamAvg)) - 10;
            const range = maxA - minA || 1;
            const xStep = valid.length > 1 ? plotW / (valid.length - 1) : 0;
            const points = valid.map((d, i) => ({
              x: pad.left + i * xStep,
              y: pad.top + plotH - ((d.teamAvg - minA) / range) * plotH,
              label: d.season,
              value: d.teamAvg,
            }));
            const polyStr = points.map((pt) => `${pt.x},${pt.y}`).join(' ');

            return (
              <div className="card">
                <h3>Team Average Trend</h3>
                <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', maxWidth: 500, display: 'block', margin: '0 auto' }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = pad.top + plotH - frac * plotH;
                    const val = Math.round(minA + frac * range);
                    return (
                      <g key={frac}>
                        <line x1={pad.left} y1={y} x2={chartW - pad.right} y2={y} stroke="#333" strokeWidth={0.5} />
                        <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#999">{val}</text>
                      </g>
                    );
                  })}
                  {/* Line */}
                  <polyline fill="none" stroke="#e8a020" strokeWidth={2.5} points={polyStr} />
                  {/* Dots + labels */}
                  {points.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r={5} fill="#e8a020" />
                      <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#e8a020">
                        {pt.value}
                      </text>
                      <text x={pt.x} y={chartH - 5} textAnchor="middle" fontSize={10} fill="#999">
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ SUB-VIEW 3: PLAYER CAREER ═══ */}
      {subTab === 2 && (
        <div>
          {/* Player picker */}
          <div className="card">
            <label style={{ fontWeight: 'bold', marginRight: 8 }}>Player:</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#2a1500',
                color: '#f5e6d0',
                fontSize: 15,
              }}
            >
              {PLAYERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.avatar} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Career summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Career Average</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>
                {careerData.careerAvg || '\u2014'}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Career High Game</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>
                {careerData.careerHigh || '\u2014'}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Total Games</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e8a020' }}>
                {careerData.totalGames || '\u2014'}
              </div>
            </div>
          </div>

          {/* Season-by-season bars */}
          <div className="card">
            <h3>Season Breakdown</h3>
            {careerData.seasonBreakdown.map((s) => (
              <div key={s.season} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>
                  {s.season} \u2014 Avg: {s.avg || '\u2014'}, High: {s.high || '\u2014'}, Games: {s.games}
                </div>
                <div style={{ background: '#2a1500', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={barStyle(s.avg, 250)} />
                </div>
              </div>
            ))}
          </div>

          {/* Rolling average sparkline per season */}
          {careerData.seasonBreakdown
            .filter((s) => s.allGames.length >= 3)
            .map((s) => {
              const rolling = buildRollingAvg(s.allGames);
              const min = Math.min(...rolling) - 10;
              const max = Math.max(...rolling) + 10;
              const range = max - min || 1;
              const w = 300;
              const h = 60;
              const pts = rolling
                .map((v, i) => {
                  const x = (i / (rolling.length - 1)) * w;
                  const y = h - ((v - min) / range) * h;
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <div className="card" key={s.season}>
                  <h3>Rolling Avg \u2014 {s.season}</h3>
                  <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 400, display: 'block' }}>
                    <polyline points={pts} fill="none" stroke="#e8a020" strokeWidth="1.5" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', maxWidth: 400 }}>
                    <span>{Math.round(rolling[0])}</span>
                    <span>{Math.round(rolling[rolling.length - 1])}</span>
                  </div>
                </div>
              );
            })}

          {/* Week-by-week detail tables */}
          {careerData.seasonBreakdown
            .filter((s) => s.weeks.length > 0)
            .map((s) => (
              <div className="card" key={s.season}>
                <h3>{s.season} Week-by-Week</h3>
                <div className="table-wrap">
                  <table style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Wk</th>
                        <th>Date</th>
                        <th>Gm1</th>
                        <th>Gm2</th>
                        <th>Gm3</th>
                        <th>Series</th>
                        <th>HCP</th>
                        <th>HS</th>
                        <th>Avg Before</th>
                        <th>Avg After</th>
                        <th>+/- Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.weeks.map((w, i) => {
                        const series = (w.g1 || 0) + (w.g2 || 0) + (w.g3 || 0);
                        const hs = Math.max(w.g1 || 0, w.g2 || 0, w.g3 || 0);
                        const diff = (w.avgAfter || 0) - (w.avgBefore || 0);
                        return (
                          <tr key={i}>
                            <td style={{ textAlign: 'center' }}>{w.week}</td>
                            <td style={{ textAlign: 'center' }}>{w.date}</td>
                            <td style={{ textAlign: 'center' }}>{w.g1}</td>
                            <td style={{ textAlign: 'center' }}>{w.g2}</td>
                            <td style={{ textAlign: 'center' }}>{w.g3}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{series}</td>
                            <td style={{ textAlign: 'center' }}>{w.hcp}</td>
                            <td style={{ textAlign: 'center' }}>{hs}</td>
                            <td style={{ textAlign: 'center' }}>{w.avgBefore || '\u2014'}</td>
                            <td style={{ textAlign: 'center' }}>{w.avgAfter || '\u2014'}</td>
                            <td
                              style={{
                                textAlign: 'center',
                                color: diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#999',
                                fontWeight: diff !== 0 ? 'bold' : 'normal',
                              }}
                            >
                              {diff > 0 ? `+${diff}` : diff === 0 ? '\u2014' : diff}
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
