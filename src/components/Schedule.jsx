import { useState, useMemo, useCallback } from 'react';
import { generateSchedule, TRIMESTERS, PTS_PER_GAME_WIN, PTS_FOR_SERIES_WIN } from '../data/constants';
import { loadData, saveData } from '../data/storage';

const STORAGE_KEY = (season) => `schedule_results_${season}`;

export default function Schedule({ currentSeason: season }) {
  const [selectedTrimester, setSelectedTrimester] = useState(0);
  const [results, setResults] = useState(() =>
    loadData(STORAGE_KEY(season), {})
  );

  const schedule = useMemo(() => generateSchedule(season), [season]);

  const trimesterWeeks = useMemo(() => {
    const start = selectedTrimester * 10 + 1;
    const end = start + 9;
    return schedule.filter((w) => w.week >= start && w.week <= end);
  }, [schedule, selectedTrimester]);

  const nextUnplayed = useMemo(() => {
    return schedule.find((w) => !results[w.week]);
  }, [schedule, results]);

  const persist = useCallback(
    (updated) => {
      setResults(updated);
      saveData(STORAGE_KEY(season), updated);
    },
    [season]
  );

  const toggleGame = useCallback(
    (weekNum, game) => {
      const updated = { ...results };
      if (!updated[weekNum]) {
        updated[weekNum] = { g1: null, g2: null, g3: null, series: null };
      }
      updated[weekNum] = {
        ...updated[weekNum],
        [game]: updated[weekNum][game] === 'W' ? 'L' : 'W',
      };
      persist(updated);
    },
    [results, persist]
  );

  const calcPoints = (weekResult) => {
    if (!weekResult) return 0;
    let pts = 0;
    if (weekResult.g1 === 'W') pts += PTS_PER_GAME_WIN;
    if (weekResult.g2 === 'W') pts += PTS_PER_GAME_WIN;
    if (weekResult.g3 === 'W') pts += PTS_PER_GAME_WIN;
    if (weekResult.series === 'W') pts += PTS_FOR_SERIES_WIN;
    return pts;
  };

  const trimesterPoints = useMemo(() => {
    return trimesterWeeks.reduce((sum, w) => sum + calcPoints(results[w.week]), 0);
  }, [trimesterWeeks, results]);

  const renderResultCell = (weekNum, game) => {
    const weekResult = results[weekNum];
    const value = weekResult ? weekResult[game] : null;
    const isWin = value === 'W';
    const isLoss = value === 'L';
    const pts =
      game === 'series'
        ? isWin
          ? PTS_FOR_SERIES_WIN
          : 0
        : isWin
          ? PTS_PER_GAME_WIN
          : 0;

    return (
      <td
        onClick={() => toggleGame(weekNum, game)}
        style={{
          cursor: 'pointer',
          color: isWin ? '#e8a020' : isLoss ? '#666' : '#888',
          fontWeight: isWin ? 'bold' : 'normal',
          textAlign: 'center',
        }}
      >
        {value ? `${value}(${pts})` : '-'}
      </td>
    );
  };

  return (
    <div className="card">
      {nextUnplayed && (
        <div className="glow" style={{ textAlign: 'center', marginBottom: 16 }}>
          Next Up: Week {nextUnplayed.week} ({nextUnplayed.date}) vs{' '}
          {nextUnplayed.opponent}
        </div>
      )}

      <div className="trimester-tabs">
        {TRIMESTERS.map((label, idx) => (
          <button
            key={idx}
            className={`sub-tab${selectedTrimester === idx ? ' active' : ''}`}
            onClick={() => setSelectedTrimester(idx)}
          >
            T{idx + 1}
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Wk</th>
            <th>Date</th>
            <th>Opponent</th>
            <th>G1</th>
            <th>G2</th>
            <th>G3</th>
            <th>Series</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {trimesterWeeks.map((w) => {
            const pts = calcPoints(results[w.week]);
            return (
              <tr key={w.week}>
                <td style={{ textAlign: 'center' }}>{w.week}</td>
                <td style={{ textAlign: 'center' }}>{w.date}</td>
                <td>{w.opponent}</td>
                {renderResultCell(w.week, 'g1')}
                {renderResultCell(w.week, 'g2')}
                {renderResultCell(w.week, 'g3')}
                {renderResultCell(w.week, 'series')}
                <td
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: pts > 0 ? '#e8a020' : '#666',
                  }}
                >
                  {pts}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={7}
              style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: 8 }}
            >
              {TRIMESTERS[selectedTrimester]} Total:
            </td>
            <td
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#e8a020',
              }}
            >
              {trimesterPoints}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
