// Real historical data for Player 1 (2023/24 season)
export const PLAYER1_2023_24 = [
  { week: 1, date: '09/06', g1: 141, g2: 127, g3: 191, hcp: 42, avgBefore: 153, avgAfter: 153 },
  { week: 2, date: '09/13', g1: 147, g2: 159, g3: 159, hcp: 42, avgBefore: 153, avgAfter: 154 },
  { week: 3, date: '09/20', g1: 225, g2: 172, g3: 138, hcp: 41, avgBefore: 154, avgAfter: 162 },
  { week: 4, date: '09/27', g1: 172, g2: 138, g3: 216, hcp: 34, avgBefore: 162, avgAfter: 165 },
  { week: 5, date: '10/04', g1: 182, g2: 170, g3: 226, hcp: 31, avgBefore: 165, avgAfter: 170 },
  { week: 6, date: '10/11', g1: 175, g2: 122, g3: 169, hcp: 27, avgBefore: 170, avgAfter: 168 },
  { week: 7, date: '10/18', g1: 164, g2: 195, g3: 174, hcp: 28, avgBefore: 168, avgAfter: 169 },
  { week: 8, date: '10/25', g1: 156, g2: 181, g3: 188, hcp: 27, avgBefore: 169, avgAfter: 170 },
  { week: 9, date: '11/01', g1: 179, g2: 207, g3: 193, hcp: 27, avgBefore: 170, avgAfter: 172 },
  { week: 11, date: '11/15', g1: 155, g2: 157, g3: 174, hcp: 25, avgBefore: 172, avgAfter: 171 },
  { week: 12, date: '11/22', g1: 157, g2: 161, g3: 193, hcp: 26, avgBefore: 171, avgAfter: 171 },
  { week: 13, date: '11/29', g1: 175, g2: 133, g3: 171, hcp: 26, avgBefore: 171, avgAfter: 170 },
  { week: 14, date: '12/06', g1: 195, g2: 176, g3: 207, hcp: 27, avgBefore: 170, avgAfter: 172 },
  { week: 15, date: '12/13', g1: 176, g2: 191, g3: 210, hcp: 25, avgBefore: 172, avgAfter: 173 },
  { week: 16, date: '12/20', g1: 204, g2: 145, g3: 159, hcp: 24, avgBefore: 173, avgAfter: 173 },
  { week: 17, date: '12/27', g1: 201, g2: 211, g3: 181, hcp: 24, avgBefore: 173, avgAfter: 174 },
  { week: 18, date: '01/03', g1: 177, g2: 145, g3: 243, hcp: 23, avgBefore: 174, avgAfter: 175 },
  { week: 19, date: '01/10', g1: 125, g2: 174, g3: 181, hcp: 22, avgBefore: 175, avgAfter: 174 },
  { week: 20, date: '01/17', g1: 211, g2: 199, g3: 213, hcp: 23, avgBefore: 174, avgAfter: 176 },
  { week: 21, date: '01/24', g1: 136, g2: 152, g3: 181, hcp: 21, avgBefore: 176, avgAfter: 175 },
  { week: 22, date: '01/31', g1: 168, g2: 221, g3: 188, hcp: 22, avgBefore: 175, avgAfter: 176 },
  { week: 23, date: '02/07', g1: 148, g2: 152, g3: 176, hcp: 21, avgBefore: 176, avgAfter: 175 },
  { week: 24, date: '02/14', g1: 178, g2: 167, g3: 166, hcp: 22, avgBefore: 175, avgAfter: 175 },
  { week: 25, date: '02/21', g1: 252, g2: 256, g3: 230, hcp: 22, avgBefore: 175, avgAfter: 178 },
  { week: 26, date: '02/28', g1: 194, g2: 228, g3: 146, hcp: 19, avgBefore: 178, avgAfter: 178 },
  { week: 27, date: '03/06', g1: 180, g2: 168, g3: 203, hcp: 19, avgBefore: 178, avgAfter: 178 },
  { week: 28, date: '03/20', g1: 157, g2: 170, g3: 200, hcp: 19, avgBefore: 178, avgAfter: 178 },
  { week: 29, date: '03/27', g1: 168, g2: 168, g3: 168, hcp: 19, avgBefore: 178, avgAfter: 178 },
];

export function getHistoricalSeries(weekData) {
  return weekData.g1 + weekData.g2 + weekData.g3;
}

export function getHistoricalHigh(weekData) {
  return Math.max(weekData.g1, weekData.g2, weekData.g3);
}
