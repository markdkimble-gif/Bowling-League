export const TEAM_NAME = 'Healthy Ball Movement';

export const PLAYERS = [
  { id: 1, name: 'Player 1', avatar: '🎳', startingAvg: 178 },
  { id: 2, name: 'Player 2', avatar: '🎯', startingAvg: 165 },
  { id: 3, name: 'Player 3', avatar: '🏆', startingAvg: 192 },
  { id: 4, name: 'Player 4', avatar: '⚡', startingAvg: 155 },
  { id: 5, name: 'Player 5', avatar: '🔥', startingAvg: 183 },
  { id: 6, name: 'Player 6', avatar: '💥', startingAvg: 171 },
  { id: 7, name: 'Player 7', avatar: '🌟', startingAvg: 168 },
  { id: 8, name: 'Player 8', avatar: '🎱', startingAvg: 160 },
];

export const LEAGUE_TEAMS = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  name: i === 0 ? TEAM_NAME : `Team ${i + 1}`,
}));

export const TOTAL_WEEKS = 30;
export const TRIMESTER_WEEKS = 10;
export const TRIMESTERS = ['Trimester 1', 'Trimester 2', 'Trimester 3'];

export const SEASONS = ['2023/24', '2024/25', '2025/26'];

// Generate 30-week schedule with placeholder opponents
export function generateSchedule(season) {
  const weeks = [];
  const startYear = parseInt(season.split('/')[0]);
  const startMonth = 8; // September
  const startDate = new Date(startYear, startMonth, 6); // First Wednesday of Sept

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (w - 1) * 7);
    const opponentIdx = ((w - 1) % 13) + 2; // rotate through teams 2-14
    weeks.push({
      week: w,
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      isoDate: date.toISOString().split('T')[0],
      opponent: LEAGUE_TEAMS[opponentIdx - 1].name,
      trimester: Math.ceil(w / TRIMESTER_WEEKS),
    });
  }
  return weeks;
}

// Points system
export const PTS_PER_GAME_WIN = 2;
export const PTS_FOR_SERIES_WIN = 3;
export const MAX_WEEKLY_PTS = 9;
