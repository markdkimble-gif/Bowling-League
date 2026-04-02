import { useState, useRef, useMemo, useCallback } from 'react';
import { TOTAL_WEEKS, SEASONS } from '../data/constants';
import { loadData, saveData, getImportKey } from '../data/storage';

function toNum(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function buildEmptyWeekRow() {
  return { date: '', g1: '', g2: '', g3: '', hcp: '', hs: '', avgBefore: '', avgAfter: '' };
}

function calcSeries(row) {
  return toNum(row.g1) + toNum(row.g2) + toNum(row.g3);
}

function calcHighScratch(row) {
  return Math.max(toNum(row.g1), toNum(row.g2), toNum(row.g3));
}

const MODES = ['Manual Entry', 'Paste from Site', 'Upload File'];

export default function Import({ currentSeason: season, players: PLAYERS }) {
  const [mode, setMode] = useState(MODES[0]);
  const [selectedSeason, setSelectedSeason] = useState(season || SEASONS[SEASONS.length - 1]);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // --- Manual Entry State ---
  const [manualWeek, setManualWeek] = useState(1);
  const [manualPlayer, setManualPlayer] = useState('all');
  const [manualData, setManualData] = useState(() => {
    const d = {};
    PLAYERS.forEach((p) => {
      d[p.id] = buildEmptyWeekRow();
    });
    return d;
  });

  // --- Paste State ---
  const [pasteText, setPasteText] = useState('');
  const [pastePlayer, setPastePlayer] = useState(PLAYERS[0].id);
  const [parsedPasteData, setParsedPasteData] = useState(null);

  // --- Upload State ---
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPlayer, setUploadPlayer] = useState(PLAYERS[0].id);
  const [parsedUploadData, setParsedUploadData] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Load existing data for manual entry when week/season/player changes
  const loadManualWeek = useCallback(() => {
    const d = {};
    PLAYERS.forEach((p) => {
      const stored = loadData(getImportKey(selectedSeason, p.id), {});
      d[p.id] = stored[manualWeek] || buildEmptyWeekRow();
    });
    setManualData(d);
  }, [selectedSeason, manualWeek]);

  // Reload when week or season changes
  const prevLoadRef = useRef('');
  const loadKey = `${selectedSeason}_${manualWeek}`;
  if (prevLoadRef.current !== loadKey) {
    prevLoadRef.current = loadKey;
    // Defer to avoid setting state during render on subsequent calls
    if (prevLoadRef.current !== '') {
      setTimeout(loadManualWeek, 0);
    }
  }

  // --- Manual Entry Handlers ---
  const updateManualField = useCallback((playerId, field, value) => {
    setManualData((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  }, []);

  const saveManualEntry = useCallback(() => {
    const playersToSave = manualPlayer === 'all'
      ? PLAYERS
      : PLAYERS.filter((p) => p.id === Number(manualPlayer));

    let savedCount = 0;
    playersToSave.forEach((p) => {
      const row = manualData[p.id];
      const g1 = toNum(row.g1);
      const g2 = toNum(row.g2);
      const g3 = toNum(row.g3);
      if (g1 === 0 && g2 === 0 && g3 === 0) return;

      const series = g1 + g2 + g3;
      const hs = calcHighScratch(row);
      const entry = {
        date: row.date || '',
        g1, g2, g3,
        series,
        hcp: toNum(row.hcp),
        hs: toNum(row.hs) || hs,
        avgBefore: toNum(row.avgBefore),
        avgAfter: toNum(row.avgAfter),
      };

      const key = getImportKey(selectedSeason, p.id);
      const existing = loadData(key, {});
      existing[manualWeek] = entry;
      saveData(key, existing);
      savedCount++;
    });

    if (savedCount > 0) {
      showMessage('success', `Saved week ${manualWeek} data for ${savedCount} player(s).`);
    } else {
      showMessage('error', 'No data to save. Enter at least one game score.');
    }
  }, [manualData, manualWeek, manualPlayer, selectedSeason, showMessage]);

  // --- Paste Parser ---
  const parsePastedData = useCallback(() => {
    if (!pasteText.trim()) {
      showMessage('error', 'Paste some data first.');
      return;
    }

    try {
      const lines = pasteText.trim().split('\n').filter((l) => l.trim());
      const result = {};

      for (const line of lines) {
        // Skip known non-data lines
        const trimmed = line.trim();
        if (/^(league|page|bowler|team|\s*$)/i.test(trimmed)) continue;
        if (/^[-=]+$/.test(trimmed)) continue;

        // Try tab-separated first, then multiple spaces, then single spaces
        let parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
        if (parts.length < 4) {
          parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
        }
        if (parts.length < 4) {
          parts = line.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        }

        // Skip header-like rows (Week, Date, Gm1, etc.)
        if (parts[0] && isNaN(parseInt(parts[0], 10))) continue;

        const weekNum = toNum(parts[0]);
        if (weekNum < 1 || weekNum > TOTAL_WEEKS) continue;

        // Detect if field[1] is a date (contains / or -) or a score
        let dateVal = '';
        let scoreStart = 1;
        if (parts[1] && /[\/\-]/.test(parts[1])) {
          dateVal = parts[1];
          scoreStart = 2;
        }

        const g1 = toNum(parts[scoreStart]);
        const g2 = toNum(parts[scoreStart + 1]);
        const g3 = toNum(parts[scoreStart + 2]);
        const series = parts[scoreStart + 3] !== undefined ? toNum(parts[scoreStart + 3]) : g1 + g2 + g3;
        const hcp = toNum(parts[scoreStart + 4]);
        const hs = toNum(parts[scoreStart + 5]) || Math.max(g1, g2, g3);
        // League Secretary format: Avg Before, Avg After (or Avg Today)
        const avgBefore = toNum(parts[scoreStart + 6]);
        // "Avg After" could be in column 8 or 9 depending on format
        // Some PDFs have: AvgBefore, AvgAfter, AvgToday, +/-
        const avgAfter = toNum(parts[scoreStart + 7]) || toNum(parts[scoreStart + 8]);

        if (g1 === 0 && g2 === 0 && g3 === 0) continue; // skip empty/summary rows

        result[weekNum] = { date: dateVal, g1, g2, g3, series, hcp, hs, avgBefore, avgAfter };
      }

      if (Object.keys(result).length === 0) {
        showMessage('error', 'Could not parse any valid rows. Expected format: Week Date G1 G2 G3 ...');
        return;
      }

      setParsedPasteData(result);
      showMessage('success', `Parsed ${Object.keys(result).length} week(s). Review below and click Import.`);
    } catch (err) {
      showMessage('error', `Parse error: ${err.message}`);
    }
  }, [pasteText, showMessage]);

  const importPastedData = useCallback(() => {
    if (!parsedPasteData) return;
    const key = getImportKey(selectedSeason, pastePlayer);
    const existing = loadData(key, {});
    Object.assign(existing, parsedPasteData);
    saveData(key, existing);
    const player = PLAYERS.find((p) => p.id === Number(pastePlayer));
    showMessage('success', `Imported ${Object.keys(parsedPasteData).length} week(s) for ${player?.name || 'player'}.`);
    setParsedPasteData(null);
    setPasteText('');
  }, [parsedPasteData, selectedSeason, pastePlayer, showMessage]);

  // --- Upload Parser ---
  const parseFile = useCallback((file) => {
    if (!file) return;
    setUploadFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    // PDF files can't be parsed as text - direct user to Paste mode
    if (ext === 'pdf') {
      showMessage('error', 'PDF files cannot be parsed directly. Open the PDF, select all the data rows, copy them, then use the "Paste from Site" tab to import.');
      setParsedUploadData(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      try {
        let result = {};

        if (ext === 'json') {
          const arr = JSON.parse(text);
          const rows = Array.isArray(arr) ? arr : [arr];
          rows.forEach((row, idx) => {
            const weekNum = toNum(row.Week || row.week || idx + 1);
            result[weekNum] = {
              date: row.Date || row.date || '',
              g1: toNum(row.G1 || row.g1 || row.Gm1),
              g2: toNum(row.G2 || row.g2 || row.Gm2),
              g3: toNum(row.G3 || row.g3 || row.Gm3),
              series: toNum(row.Series || row.series || row.SS) || (toNum(row.G1 || row.g1 || row.Gm1) + toNum(row.G2 || row.g2 || row.Gm2) + toNum(row.G3 || row.g3 || row.Gm3)),
              hcp: toNum(row.HCP || row.hcp || row.HCF),
              hs: toNum(row.HS || row.hs) || Math.max(toNum(row.G1 || row.g1 || row.Gm1), toNum(row.G2 || row.g2 || row.Gm2), toNum(row.G3 || row.g3 || row.Gm3)),
              avgBefore: toNum(row.AvgBefore || row.avgBefore || row['Avg Before'] || row['Avg Befo']),
              avgAfter: toNum(row.AvgAfter || row.avgAfter || row['Avg After'] || row['Avg Today'] || row['Avg Toda']),
            };
          });
        } else {
          // CSV or TXT
          const lines = text.trim().split('\n').filter((l) => l.trim());
          // Skip header
          const startIdx = lines[0] && isNaN(parseInt(lines[0].split(/[,\t]/)[0], 10)) ? 1 : 0;

          for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(/[,\t]/).map((s) => s.trim());
            const weekNum = toNum(parts[0]);
            if (weekNum < 1 || weekNum > TOTAL_WEEKS) continue;

            const g1 = toNum(parts[2]);
            const g2 = toNum(parts[3]);
            const g3 = toNum(parts[4]);
            result[weekNum] = {
              date: parts[1] || '',
              g1, g2, g3,
              series: toNum(parts[5]) || (g1 + g2 + g3),
              hcp: toNum(parts[6]),
              hs: toNum(parts[7]) || Math.max(g1, g2, g3),
              avgBefore: toNum(parts[8]),
              avgAfter: toNum(parts[9]),
            };
          }
        }

        if (Object.keys(result).length === 0) {
          showMessage('error', 'No valid data found in file. For PDF files, use the "Paste from Site" tab instead.');
          return;
        }

        setParsedUploadData(result);
        showMessage('success', `Parsed ${Object.keys(result).length} week(s) from ${file.name}. Review and click Import.`);
      } catch (err) {
        showMessage('error', `File parse error: ${err.message}`);
      }
    };

    reader.readAsText(file);
  }, [showMessage]);

  const importUploadData = useCallback(() => {
    if (!parsedUploadData) return;
    const key = getImportKey(selectedSeason, uploadPlayer);
    const existing = loadData(key, {});
    Object.assign(existing, parsedUploadData);
    saveData(key, existing);
    const player = PLAYERS.find((p) => p.id === Number(uploadPlayer));
    showMessage('success', `Imported ${Object.keys(parsedUploadData).length} week(s) for ${player?.name || 'player'}.`);
    setParsedUploadData(null);
    setUploadFileName('');
  }, [parsedUploadData, selectedSeason, uploadPlayer, showMessage]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  // --- Visible players for manual entry ---
  const visiblePlayers = manualPlayer === 'all'
    ? PLAYERS
    : PLAYERS.filter((p) => p.id === Number(manualPlayer));

  // --- Render preview table ---
  const renderPreviewTable = (data) => {
    const weeks = Object.keys(data).map(Number).sort((a, b) => a - b);
    return (
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Wk', 'Date', 'G1', 'G2', 'G3', 'Series', 'HCP', 'HS', 'Avg Before', 'Avg After'].map((h) => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '2px solid var(--border)', fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((wk) => {
              const r = data[wk];
              return (
                <tr key={wk} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{wk}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.date || '-'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.g1}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.g2}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.g3}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{r.series}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.hcp}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.hs}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.avgBefore}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.avgAfter}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Season selector shared across modes ---
  const seasonSelector = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 'bold' }}>Season:</span>
      <select
        value={selectedSeason}
        onChange={(e) => setSelectedSeason(e.target.value)}
        style={{
          padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text-h)', fontSize: 14,
        }}
      >
        {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );

  // --- Input style helper ---
  const inputStyle = {
    width: 60, padding: '4px 6px', textAlign: 'center',
    border: '1px solid var(--border)', borderRadius: 4,
    background: 'var(--code-bg)', color: 'var(--text-h)', fontSize: 14,
  };

  return (
    <div className="fade-in">
      <div className="card">
        <h2>Import Data</h2>

        {/* Message Banner */}
        {message && (
          <div
            style={{
              padding: '10px 16px', borderRadius: 6, marginBottom: 16,
              background: message.type === 'success' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: message.type === 'success' ? '#4caf50' : '#f44336',
              border: `1px solid ${message.type === 'success' ? '#4caf50' : '#f44336'}`,
              fontWeight: 'bold', fontSize: 14,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Sub-tabs */}
        <div className="sub-tabs" style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {MODES.map((m) => (
            <button
              key={m}
              className={`sub-tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
              style={{
                padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
                background: mode === m ? 'var(--accent)' : 'var(--code-bg)',
                color: mode === m ? '#16171d' : 'var(--text)',
                fontWeight: mode === m ? 'bold' : 'normal',
                cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ======================== MANUAL ENTRY ======================== */}
        {mode === 'Manual Entry' && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              {seasonSelector}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 'bold' }}>Week:</span>
                <select
                  value={manualWeek}
                  onChange={(e) => setManualWeek(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: 14,
                  }}
                >
                  {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 'bold' }}>Player:</span>
                <select
                  value={manualPlayer}
                  onChange={(e) => setManualPlayer(e.target.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: 14,
                  }}
                >
                  <option value="all">All Players</option>
                  {PLAYERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Player</th>
                    <th style={{ padding: '6px 8px', width: 70 }}>G1</th>
                    <th style={{ padding: '6px 8px', width: 70 }}>G2</th>
                    <th style={{ padding: '6px 8px', width: 70 }}>G3</th>
                    <th style={{ padding: '6px 8px', width: 70 }}>HCP</th>
                    <th style={{ padding: '6px 8px', width: 80 }}>Series</th>
                    <th style={{ padding: '6px 8px', width: 70 }}>HS</th>
                    <th style={{ padding: '6px 8px', width: 80 }}>Avg Before</th>
                    <th style={{ padding: '6px 8px', width: 80 }}>Avg After</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((player) => {
                    const row = manualData[player.id] || buildEmptyWeekRow();
                    const series = calcSeries(row);
                    const hs = calcHighScratch(row);
                    return (
                      <tr key={player.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ marginRight: 6 }}>{player.avatar}</span>
                          {player.name}
                        </td>
                        {['g1', 'g2', 'g3'].map((field) => (
                          <td key={field} style={{ padding: '4px', textAlign: 'center' }}>
                            <input
                              type="number" min={0} max={300}
                              value={row[field]}
                              onChange={(e) => updateManualField(player.id, field, e.target.value)}
                              style={inputStyle}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <input
                            type="number" min={0} max={100}
                            value={row.hcp}
                            onChange={(e) => updateManualField(player.id, 'hcp', e.target.value)}
                            style={{ ...inputStyle, width: 56 }}
                          />
                        </td>
                        <td style={{
                          textAlign: 'center', padding: '6px 8px', fontWeight: 'bold',
                          color: series > 0 ? 'var(--text-h)' : 'var(--text)',
                        }}>
                          {series > 0 ? series : '-'}
                        </td>
                        <td style={{
                          textAlign: 'center', padding: '6px 8px', fontWeight: 'bold',
                          color: hs > 0 ? 'var(--accent)' : 'var(--text)',
                        }}>
                          {hs > 0 ? hs : '-'}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <input
                            type="number" min={0} max={300}
                            value={row.avgBefore}
                            onChange={(e) => updateManualField(player.id, 'avgBefore', e.target.value)}
                            style={{ ...inputStyle, width: 56 }}
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <input
                            type="number" min={0} max={300}
                            value={row.avgAfter}
                            onChange={(e) => updateManualField(player.id, 'avgAfter', e.target.value)}
                            style={{ ...inputStyle, width: 56 }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn btn-gold" onClick={saveManualEntry} style={{
                padding: '10px 28px', borderRadius: 6, fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
              }}>
                Save Week {manualWeek}
              </button>
            </div>
          </div>
        )}

        {/* ======================== PASTE FROM SITE ======================== */}
        {mode === 'Paste from Site' && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              {seasonSelector}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 'bold' }}>Player:</span>
                <select
                  value={pastePlayer}
                  onChange={(e) => setPastePlayer(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: 14,
                  }}
                >
                  {PLAYERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text)' }}>
              Open your League Secretary PDF, select all the data rows, copy, and paste below.
              <br />
              Expected columns: <strong>Week | Date | Gm1 | Gm2 | Gm3 | SS | HCP | HS | Avg Before | Avg After</strong>
              <br />
              <span style={{ color: 'var(--accent)', fontSize: 12 }}>Tip: This is the best way to import from League Secretary PDFs!</span>
            </div>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={
                'Paste from League Secretary PDF:\n28  03/25/2025  161  174  159  494  40  614  155  156  164  9\n25  03/04/2025  147  231  176  554  44  686  151  155  184  33'
              }
              style={{
                width: '100%', minHeight: 160, padding: 12, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--code-bg)',
                color: 'var(--text-h)', fontSize: 13, fontFamily: 'monospace',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
              <button className="btn" onClick={parsePastedData} style={{
                padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
                border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)',
              }}>
                Parse Data
              </button>
              {parsedPasteData && (
                <button className="btn btn-gold" onClick={importPastedData} style={{
                  padding: '8px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 14,
                }}>
                  Import {Object.keys(parsedPasteData).length} Week(s)
                </button>
              )}
            </div>

            {parsedPasteData && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>Preview</h3>
                {renderPreviewTable(parsedPasteData)}
              </div>
            )}
          </div>
        )}

        {/* ======================== UPLOAD FILE ======================== */}
        {mode === 'Upload File' && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              {seasonSelector}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 'bold' }}>Player:</span>
                <select
                  value={uploadPlayer}
                  onChange={(e) => setUploadPlayer(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-h)', fontSize: 14,
                  }}
                >
                  {PLAYERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: '40px 20px', textAlign: 'center', borderRadius: 8,
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                background: dragOver ? 'rgba(232, 160, 32, 0.05)' : 'var(--code-bg)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div className="upload-icon" style={{ fontSize: 40, marginBottom: 8 }}>
                {uploadFileName ? '✅' : '📥'}
              </div>
              <div className="upload-text" style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-h)', marginBottom: 4 }}>
                {uploadFileName || 'Drop a file here or click to upload'}
              </div>
              <div className="upload-hint" style={{ fontSize: 13, color: 'var(--text)' }}>
                Accepts .csv, .txt, .json files (for PDFs, use "Paste from Site")
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text)' }}>
              <strong>CSV/TXT format:</strong> Week,Date,G1,G2,G3,Series,HCP,HS,AvgBefore,AvgAfter (header row optional)
              <br />
              <strong>JSON format:</strong> Array of objects with those fields
            </div>

            {parsedUploadData && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>Preview</h3>
                {renderPreviewTable(parsedUploadData)}
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button className="btn btn-gold" onClick={importUploadData} style={{
                    padding: '10px 28px', borderRadius: 6, fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
                  }}>
                    Import {Object.keys(parsedUploadData).length} Week(s)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
