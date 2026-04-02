import { useState, useCallback } from 'react';
import { loadData, saveData } from '../data/storage';

const STORAGE_KEY = 'roster';

const DEFAULT_PLAYERS = [
  { id: 1, name: 'Player 1', avatar: '🎳', startingAvg: 178 },
  { id: 2, name: 'Player 2', avatar: '🎯', startingAvg: 165 },
  { id: 3, name: 'Player 3', avatar: '🏆', startingAvg: 192 },
  { id: 4, name: 'Player 4', avatar: '⚡', startingAvg: 155 },
  { id: 5, name: 'Player 5', avatar: '🔥', startingAvg: 183 },
  { id: 6, name: 'Player 6', avatar: '💥', startingAvg: 171 },
  { id: 7, name: 'Player 7', avatar: '🌟', startingAvg: 168 },
  { id: 8, name: 'Player 8', avatar: '🎱', startingAvg: 160 },
];

const AVATAR_OPTIONS = ['🎳', '🎯', '🏆', '⚡', '🔥', '💥', '🌟', '🎱', '🎲', '🏅', '💎', '🦅', '🐻', '🦁', '🐉', '👑'];

export { AVATAR_OPTIONS };

export default function usePlayers() {
  const [players, setPlayers] = useState(() => {
    return loadData(STORAGE_KEY, DEFAULT_PLAYERS);
  });

  const persist = useCallback((updated) => {
    setPlayers(updated);
    saveData(STORAGE_KEY, updated);
  }, []);

  const updatePlayer = useCallback((id, changes) => {
    persist(players.map(p => p.id === id ? { ...p, ...changes } : p));
  }, [players, persist]);

  const addPlayer = useCallback((name, avatar, startingAvg) => {
    const maxId = players.reduce((max, p) => Math.max(max, p.id), 0);
    const newPlayer = {
      id: maxId + 1,
      name: name || `Player ${maxId + 1}`,
      avatar: avatar || '🎳',
      startingAvg: startingAvg || 150,
    };
    persist([...players, newPlayer]);
    return newPlayer;
  }, [players, persist]);

  const removePlayer = useCallback((id) => {
    persist(players.filter(p => p.id !== id));
  }, [players, persist]);

  return { players, updatePlayer, addPlayer, removePlayer };
}
