import { useState, useMemo, useCallback, useRef } from 'react';
import { LEAGUE_TEAMS, TRIMESTERS, TEAM_NAME } from '../data/constants';
import { loadData, saveData, getStandingsKey } from '../data/storage';

const UPLOAD_KEY = (season) => `standings_upload_${season}`;

function initTeamData() {
  return LEAGUE_TEAMS.map((team) => ({
    id: team.id,
    name: team.name,
    t1: 0,
    t2: 0,
    t3: 0,
    wins: 0,
    losses: 0,
  }));
}

export default function Standings({ currentSeason: season }) {
  const [selectedTrimester, setSelectedTrimester] = useState(0);
  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState(() =>
    loadData(UPLOAD_KEY(season), null)
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [teams, setTeams] = useState(() => {
    const saved = loadData(getStandingsKey(season), null);
    return saved || initTeamData();
  });

  const persist = useCallback(
    (updated) => {
      setTeams(updated);
      saveData(getStandingsKey(season), updated);
    },
    [season]
  );

  const sorted = useMemo(() => {
    const withTotals = teams.map((t) => ({
      ...t,
      total: t.t1 + t.t2 + t.t3,
    }));
    return [...withTotals].sort((a, b) => b.total - a.total);
  }, [teams]);

  const startEdit = (teamId, field) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    setEditCell({ teamId, field });
    setEditValue(String(team[field]));
  };

  const commitEdit = () => {
    if (!editCell) return;
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) {
      setEditCell(null);
      return;
    }
    const updated = teams.map((t) =>
      t.id === editCell.teamId ? { ...t, [editCell.field]: val } : t
    );
    persist(updated);
    setEditCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditCell(null);
    }
  };

  const renderEditableCell = (teamId, field, value) => {
    const isEditing = editCell && editCell.teamId === teamId && editCell.field === field;
    const trimesterIdx = { t1: 0, t2: 1, t3: 2 }[field];
    const isHighlightedTrimester = trimesterIdx === selectedTrimester;

    if (isEditing) {
      return (
        <td style={{ textAlign: 'center', padding: 0 }}>
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: 48,
              textAlign: 'center',
              background: '#1a1a2e',
              color: '#e8a020',
              border: '1px solid #e8a020',
              borderRadius: 3,
              padding: '2px 4px',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </td>
      );
    }

    return (
      <td
        onClick={() => startEdit(teamId, field)}
        style={{
          textAlign: 'center',
          cursor: 'pointer',
          fontWeight: isHighlightedTrimester ? 'bold' : 'normal',
          color: isHighlightedTrimester ? '#e8a020' : undefined,
          background: isHighlightedTrimester ? 'rgba(232, 160, 32, 0.06)' : undefined,
        }}
      >
        {value}
      </td>
    );
  };

  const renderWLCell = (teamId, field, value) => {
    const isEditing = editCell && editCell.teamId === teamId && editCell.field === field;

    if (isEditing) {
      return (
        <td style={{ textAlign: 'center', padding: 0 }}>
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: 40,
              textAlign: 'center',
              background: '#1a1a2e',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: 3,
              padding: '2px 4px',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </td>
      );
    }

    return (
      <td
        onClick={() => startEdit(teamId, field)}
        style={{ textAlign: 'center', cursor: 'pointer' }}
      >
        {value}
      </td>
    );
  };

  // File upload handling
  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        return;
      }

      // Limit to 2MB for localStorage
      if (file.size > 2 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          uploadedAt: new Date().toISOString(),
        };
        setUploadedFile(data);
        saveData(UPLOAD_KEY(season), data);
      };
      reader.readAsDataURL(file);
    },
    [season]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    saveData(UPLOAD_KEY(season), null);
  };

  return (
    <div className="card">
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
            <th style={{ textAlign: 'center', width: 40 }}>Rank</th>
            <th style={{ textAlign: 'left' }}>Team</th>
            <th
              style={{
                textAlign: 'center',
                color: selectedTrimester === 0 ? '#e8a020' : undefined,
              }}
            >
              T1 Pts
            </th>
            <th
              style={{
                textAlign: 'center',
                color: selectedTrimester === 1 ? '#e8a020' : undefined,
              }}
            >
              T2 Pts
            </th>
            <th
              style={{
                textAlign: 'center',
                color: selectedTrimester === 2 ? '#e8a020' : undefined,
              }}
            >
              T3 Pts
            </th>
            <th style={{ textAlign: 'center' }}>Total Pts</th>
            <th style={{ textAlign: 'center' }}>W</th>
            <th style={{ textAlign: 'center' }}>L</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, idx) => {
            const isOurTeam = team.name === TEAM_NAME;
            return (
              <tr
                key={team.id}
                style={{
                  background: isOurTeam ? 'rgba(232, 160, 32, 0.15)' : undefined,
                  borderLeft: isOurTeam ? '3px solid #e8a020' : '3px solid transparent',
                }}
              >
                <td
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: isOurTeam ? '#e8a020' : '#888',
                  }}
                >
                  {idx + 1}
                </td>
                <td
                  style={{
                    textAlign: 'left',
                    fontWeight: isOurTeam ? 'bold' : 'normal',
                    color: isOurTeam ? '#e8a020' : undefined,
                  }}
                >
                  {team.name}
                </td>
                {renderEditableCell(team.id, 't1', team.t1)}
                {renderEditableCell(team.id, 't2', team.t2)}
                {renderEditableCell(team.id, 't3', team.t3)}
                <td
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: isOurTeam ? '#e8a020' : '#ccc',
                  }}
                >
                  {team.total}
                </td>
                {renderWLCell(team.id, 'wins', team.wins)}
                {renderWLCell(team.id, 'losses', team.losses)}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* File Upload Zone */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#ccc' }}>
          Upload Standings Sheet
        </h3>
        <div
          className="upload-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#e8a020' : '#444'}`,
            borderRadius: 8,
            padding: uploadedFile ? 12 : 32,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
            background: isDragging ? 'rgba(232, 160, 32, 0.08)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          {uploadedFile ? (
            <div>
              {uploadedFile.type.startsWith('image/') ? (
                <img
                  src={uploadedFile.data}
                  alt={uploadedFile.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(232, 160, 32, 0.1)',
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                >
                  PDF: {uploadedFile.name}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#888' }}>
                {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearUpload();
                }}
                style={{
                  marginTop: 8,
                  padding: '4px 12px',
                  background: 'transparent',
                  border: '1px solid #666',
                  borderRadius: 4,
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ color: '#888', fontSize: 14 }}>
                Drag & drop standings sheet here
              </div>
              <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                or click to browse (image/PDF, max 2MB)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
