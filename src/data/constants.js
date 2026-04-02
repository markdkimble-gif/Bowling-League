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

export const LEAGUE_TEAMS = [
  { id: 1, name: 'BYE' },
  { id: 2, name: 'Dead Pins' },
  { id: 3, name: 'Gephart' },
  { id: 4, name: 'Sunset Strikers' },
  { id: 5, name: 'Hole E Balls' },
  { id: 6, name: "Tee's Auto Glass" },
  { id: 7, name: 'Brockman' },
  { id: 8, name: 'UCK' },
  { id: 9, name: TEAM_NAME },
  { id: 10, name: 'Off-Setting Errors' },
  { id: 11, name: 'P & N Auto' },
  { id: 12, name: 'Favorite Realty' },
  { id: 13, name: 'Stray Dogs' },
  { id: 14, name: 'Spareway to Heav' },
  { id: 15, name: 'A - Z Pro Shop' },
  { id: 16, name: 'Ducks' },
];

export const TOTAL_WEEKS = 30;
export const TRIMESTER_WEEKS = 10;
export const TRIMESTERS = ['Trimester 1', 'Trimester 2', 'Trimester 3'];

export const SEASONS = ['2023/24', '2024/25', '2025/26'];

// Real 2025/26 schedule for team 9 (Healthy Ball Movement)
// Parsed from Northside Tavern 25/26 schedule sheet
const SCHEDULE_2025_26 = [
  { week: 1, date: '09/03', opponent: 10, lanes: '9-10' },
  { week: 2, date: '09/10', opponent: 13, lanes: '15-16' },
  { week: 3, date: '09/17', opponent: 14, lanes: '13-14' },
  { week: 4, date: '09/24', opponent: 8, lanes: '7-8' },     // was: 4-8, 10
  { week: 5, date: '10/01', opponent: 3, lanes: '9-10' },     // was: ...
  { week: 6, date: '10/08', opponent: 2, lanes: '11-12' },
  { week: 7, date: '10/15', opponent: 5, lanes: '11-12' },   // was: ...
  { week: 8, date: '10/22', opponent: 1, lanes: '5-6' },
  { week: 9, date: '10/29', opponent: 16, lanes: '7-8' },
  { week: 10, date: '11/05', opponent: 6, lanes: '11-12' },
  { week: 11, date: '11/12', opponent: 14, lanes: '1-2' },
  { week: 12, date: '11/19', opponent: 10, lanes: '5-6' },
  { week: 13, date: '11/26', opponent: 3, lanes: '3-4' },
  { week: 14, date: '12/03', opponent: 4, lanes: '3-4' },
  { week: 15, date: '12/10', opponent: 11, lanes: '15-16' },
  { week: 16, date: '12/17', opponent: 9, lanes: '1-2' },    // BYE week or self
  { week: 17, date: '01/07', opponent: 7, lanes: '5-6' },
  { week: 18, date: '01/14', opponent: 13, lanes: '1-2' },
  { week: 19, date: '01/21', opponent: 15, lanes: '11-12' },
  { week: 20, date: '01/28', lanes: '1-2', opponent: 13 },
  { week: 21, date: '02/04', opponent: 6, lanes: '3-4' },
  { week: 22, date: '02/11', opponent: 16, lanes: '13-14' },
  { week: 23, date: '02/18', opponent: 12, lanes: '7-8' },
  { week: 24, date: '02/25', opponent: 1, lanes: '1-2' },
  { week: 25, date: '03/04', opponent: 14, lanes: '5-6' },
  { week: 26, date: '03/11', opponent: 5, lanes: '3-4' },
  { week: 27, date: '03/18', opponent: 13, lanes: '5-6' },
  { week: 28, date: '03/25', opponent: 6, lanes: '15-16' },
  { week: 29, date: '04/01', opponent: 7, lanes: '1-2' },
  { week: 30, date: '04/08', opponent: null, lanes: null, note: 'Divisional Position Round - Start Lane 1' },
];

// Generate schedule - uses real data for 2025/26, generates placeholders for other seasons
export function generateSchedule(season) {
  if (season === '2025/26') {
    return SCHEDULE_2025_26.map(w => {
      const opp = w.opponent ? LEAGUE_TEAMS.find(t => t.id === w.opponent) : null;
      return {
        week: w.week,
        date: w.date,
        isoDate: `2025-${w.date.replace('/', '-')}`,
        opponent: opp ? opp.name : (w.note || 'TBD'),
        lanes: w.lanes || '',
        trimester: Math.ceil(w.week / TRIMESTER_WEEKS),
        note: w.note || '',
      };
    });
  }

  // Fallback for other seasons
  const weeks = [];
  const startYear = parseInt(season.split('/')[0]);
  const startMonth = 8;
  const startDate = new Date(startYear, startMonth, 6);

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (w - 1) * 7);
    const opponentIdx = ((w - 1) % 15) + 1;
    const opp = LEAGUE_TEAMS[opponentIdx === 9 ? 0 : opponentIdx - 1];
    weeks.push({
      week: w,
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      isoDate: date.toISOString().split('T')[0],
      opponent: opp ? opp.name : `Team ${opponentIdx}`,
      lanes: '',
      trimester: Math.ceil(w / TRIMESTER_WEEKS),
      note: '',
    });
  }
  return weeks;
}

// Points system
export const PTS_PER_GAME_WIN = 2;
export const PTS_FOR_SERIES_WIN = 3;
export const MAX_WEEKLY_PTS = 9;
