import { useState } from 'react';
import { AVATAR_OPTIONS } from '../hooks/usePlayers';

export default function RosterEditor({ players, onUpdate, onAdd, onRemove, onClose }) {
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🎳');
  const [newAvg, setNewAvg] = useState('150');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newAvatar, parseInt(newAvg) || 150);
    setNewName('');
    setNewAvg('150');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500, maxHeight: '85vh',
          overflow: 'auto', position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Roster</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#999',
              fontSize: 24, cursor: 'pointer', padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Player list */}
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 0', borderBottom: '1px solid #3a2000',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar picker */}
            <select
              value={player.avatar}
              onChange={(e) => onUpdate(player.id, { avatar: e.target.value })}
              style={{
                width: 44, height: 36, fontSize: 20, textAlign: 'center',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, cursor: 'pointer', padding: 0,
              }}
            >
              {AVATAR_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Name */}
            <input
              type="text"
              value={player.name}
              onChange={(e) => onUpdate(player.id, { name: e.target.value })}
              style={{
                flex: 1, minWidth: 120, padding: '6px 10px',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, color: '#f5e6d0', fontSize: 15,
              }}
            />

            {/* Starting avg */}
            <input
              type="number"
              value={player.startingAvg}
              onChange={(e) => onUpdate(player.id, { startingAvg: parseInt(e.target.value) || 0 })}
              style={{
                width: 60, padding: '6px 6px', textAlign: 'center',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, color: '#f5e6d0', fontSize: 14,
              }}
              title="Starting average"
            />

            {/* Delete */}
            {confirmDelete === player.id ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => { onRemove(player.id); setConfirmDelete(null); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: 'none',
                    background: '#f44336', color: '#fff', fontSize: 12,
                    cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid #555',
                    background: 'none', color: '#999', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(player.id)}
                style={{
                  padding: '4px 8px', borderRadius: 4, border: '1px solid #555',
                  background: 'none', color: '#999', fontSize: 14, cursor: 'pointer',
                }}
                title="Remove player"
              >
                🗑
              </button>
            )}
          </div>
        ))}

        {/* Add new player */}
        <div style={{
          marginTop: 16, padding: '16px 0 0',
          borderTop: '2px solid #3a2000',
        }}>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Add Player</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value)}
              style={{
                width: 44, height: 36, fontSize: 20, textAlign: 'center',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, cursor: 'pointer', padding: 0,
              }}
            >
              {AVATAR_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{
                flex: 1, minWidth: 100, padding: '6px 10px',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, color: '#f5e6d0', fontSize: 15,
              }}
            />

            <input
              type="number"
              value={newAvg}
              onChange={(e) => setNewAvg(e.target.value)}
              placeholder="Avg"
              style={{
                width: 60, padding: '6px 6px', textAlign: 'center',
                background: '#1a0a00', border: '1px solid #3a2000',
                borderRadius: 6, color: '#f5e6d0', fontSize: 14,
              }}
            />

            <button
              onClick={handleAdd}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: 'linear-gradient(135deg, #e8a020, #c4841d)',
                color: '#1a0a00', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
