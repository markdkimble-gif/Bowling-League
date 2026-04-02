import './TrophyRoom.css';

const BANNERS = [
  { title: '2023/24 League Champions', subtitle: 'Season 48 - Undefeated in T3' },
  { title: '2022/23 Trimester 2 Champions', subtitle: 'Season 47 - 28-2 Record' },
  { title: '2021/22 League Champions', subtitle: 'Season 46 - Back-to-Back' },
  { title: '2019/20 Trimester 1 Champions', subtitle: 'Season 44 - Wire to Wire' },
];

const MANAGERS = [
  { year: '2023/24', name: 'TBD', stars: 5 },
  { year: '2022/23', name: 'TBD', stars: 4 },
  { year: '2021/22', name: 'TBD', stars: 5 },
  { year: '2020/21', name: 'TBD', stars: 3 },
];

const RECORDS = [
  { label: 'Highest Game', value: '289', holder: 'TBD', date: '2023' },
  { label: 'Highest Series', value: '742', holder: 'TBD', date: '2022' },
  { label: 'Highest Team Game', value: '1,087', holder: 'Healthy Ball Movement', date: '2023' },
  { label: 'Highest Average (Season)', value: '221', holder: 'TBD', date: '2023/24' },
  { label: 'Most Wins (Trimester)', value: '38/40', holder: 'TBD', date: '2022/23 T2' },
  { label: 'Longest Win Streak', value: '14 weeks', holder: 'Healthy Ball Movement', date: '2023' },
];

export default function TrophyRoom() {
  return (
    <div className="trophy-room">
      {/* Scrolling Marquee */}
      <div className="marquee-container">
        <div className="marquee-track">
          <span>
            {'\u{1F3B3}'} HEALTHY BALL MOVEMENT - CHAMPIONS {'\u{1F3B3}'} &nbsp;&nbsp;&nbsp;
            {'\u{1F3C6}'} ROLL WITH THE BEST {'\u{1F3C6}'} &nbsp;&nbsp;&nbsp;
            {'\u{1F3B3}'} STRIKE CITY {'\u{1F3B3}'} &nbsp;&nbsp;&nbsp;
            {'\u{1F3C6}'} PINS FEAR US {'\u{1F3C6}'} &nbsp;&nbsp;&nbsp;
            {'\u{1F3B3}'} HEALTHY BALL MOVEMENT - CHAMPIONS {'\u{1F3B3}'} &nbsp;&nbsp;&nbsp;
            {'\u{1F3C6}'} ROLL WITH THE BEST {'\u{1F3C6}'} &nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>

      {/* Championship Banners */}
      <h2 className="trophy-section-title">Championship Banners</h2>
      <div className="banner-grid">
        {BANNERS.map((banner, idx) => (
          <div className="card banner" key={idx}>
            <div className="glow trophy-emoji">{'\u{1F3C6}'}</div>
            <div className="banner-title">{banner.title}</div>
            <div className="banner-subtitle">{banner.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Manager of the Year */}
      <h2 className="trophy-section-title">Manager of the Year</h2>
      <div className="manager-grid">
        {MANAGERS.map((mgr, idx) => (
          <div className="card manager-card" key={idx}>
            <div className="manager-year">{mgr.year}</div>
            <div className="manager-badge">{'\u{2B50}'}</div>
            <div className="manager-name">{mgr.name}</div>
            <div className="manager-stars">
              {Array.from({ length: mgr.stars }, (_, i) => (
                <span key={i} className="star-filled">{'\u{2605}'}</span>
              ))}
              {Array.from({ length: 5 - mgr.stars }, (_, i) => (
                <span key={i} className="star-empty">{'\u{2606}'}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* All-Time Records */}
      <h2 className="trophy-section-title">All-Time Records</h2>
      <div className="records-section">
        {RECORDS.map((rec, idx) => (
          <div className="card record-row" key={idx}>
            <div className="record-label">{rec.label}</div>
            <div className="record-value">{rec.value}</div>
            <div className="record-detail">{rec.holder} &middot; {rec.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
