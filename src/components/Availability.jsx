import { useState, useCallback } from 'react';
import { PLAYERS, TOTAL_WEEKS, TRIMESTER_WEEKS } from '../data/constants';
import { loadData, saveData, getAvailabilityKey } from '../data/storage';

const STATUS_CYCLE = ['green', 'yellow', 'red'];
const STATUS_COLORS = {
  green: '#4caf50',
  yellow: '#ffc107',
  red: '#f44336',
};
const STATUS_LABELS = {
  green: 'Available',
  yellow: 'Maybe',
  red: 'Unavailable',
};

const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

function buildDefault() {
  const data = {};
  for (const player of PLAYERS) {
    data[player.id] = {};
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      data[player.id][w] = 'green';
    }
  }
  return data;
}

function Availability({ currentSeason: season }) {
  const storageKey = getAvailabilityKey(season);

  const [availability, setAvailability] = useState(() => {
    const saved = loadData(storageKey);
    if (saved) return saved;
    const def = buildDefault();
    saveData(storageKey, def);
    return def;
  });

  const cycleStatus = useCallback(
    (playerId, week) => {
      setAvailability((prev) => {
        const current = prev[playerId]?.[week] || 'green';
        const idx = STATUS_CYCLE.indexOf(current);
        const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        const updated = {
          ...prev,
          [playerId]: {
            ...prev[playerId],
            [week]: next,
          },
        };
        saveData(storageKey, updated);
        return updated;
      });
    },
    [storageKey]
  );

  return (
    <div className="card" style={{ padding: 0 }}>
      <style>{`
        .avail-legend {
          display: flex;
          gap: 16px;
          padding: 12px 16px;
          flex-wrap: wrap;
          align-items: center;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
        }
        .avail-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .avail-legend-dot {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .avail-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .avail-table {
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          width: max-content;
          min-width: 100%;
        }
        .avail-table th,
        .avail-table td {
          padding: 0;
          text-align: center;
          border-bottom: 1px solid var(--border);
        }
        .avail-table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: var(--bg);
          font-weight: 600;
          font-size: 11px;
          color: var(--text);
          height: 32px;
          min-width: 30px;
          width: 30px;
        }
        .avail-table thead th:first-child {
          position: sticky;
          left: 0;
          z-index: 3;
          background: var(--bg);
          min-width: 120px;
          width: 120px;
          text-align: left;
          padding-left: 10px;
          font-size: 12px;
        }
        .avail-player-cell {
          position: sticky;
          left: 0;
          z-index: 1;
          background: var(--bg);
          min-width: 120px;
          width: 120px;
          text-align: left;
          padding: 4px 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
        }
        .avail-player-cell .avatar {
          margin-right: 4px;
        }
        .avail-cell {
          padding: 3px;
          cursor: pointer;
        }
        .avail-dot {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          margin: 0 auto;
          transition: background-color 0.15s;
        }
        .avail-dot:hover {
          opacity: 0.8;
        }
        .avail-dot:active {
          transform: scale(0.9);
        }
        .avail-tri-sep {
          border-right: 2px solid var(--text) !important;
        }
      `}</style>

      <div className="avail-legend">
        {STATUS_CYCLE.map((status) => (
          <div className="avail-legend-item" key={status}>
            <div
              className="avail-legend-dot"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      <div className="avail-scroll">
        <table className="avail-table">
          <thead>
            <tr>
              <th>Player</th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className={
                    w % TRIMESTER_WEEKS === 0 && w < TOTAL_WEEKS
                      ? 'avail-tri-sep'
                      : ''
                  }
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAYERS.map((player) => (
              <tr key={player.id}>
                <td className="avail-player-cell">
                  <span className="avatar">{player.avatar}</span>
                  {player.name}
                </td>
                {weeks.map((w) => {
                  const status =
                    availability[player.id]?.[w] || 'green';
                  return (
                    <td
                      key={w}
                      className={`avail-cell${
                        w % TRIMESTER_WEEKS === 0 && w < TOTAL_WEEKS
                          ? ' avail-tri-sep'
                          : ''
                      }`}
                      onClick={() => cycleStatus(player.id, w)}
                    >
                      <div
                        className="avail-dot"
                        style={{
                          backgroundColor: STATUS_COLORS[status],
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Availability;
