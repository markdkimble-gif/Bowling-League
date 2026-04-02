import { useState } from 'react';
import { TEAM_NAME, SEASONS } from './data/constants';
import Schedule from './components/Schedule';
import Availability from './components/Availability';
import Scores from './components/Scores';
import Stats from './components/Stats';
import Standings from './components/Standings';
import TrophyRoom from './components/TrophyRoom';
import Import from './components/Import';
import './App.css';

const TABS = [
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'availability', label: 'Availability', icon: '✋' },
  { id: 'scores', label: 'Scores', icon: '🎳' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'standings', label: 'Standings', icon: '🏅' },
  { id: 'trophy', label: 'Trophy Room', icon: '🏆' },
  { id: 'import', label: 'Import', icon: '📥' },
];

function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [currentSeason, setCurrentSeason] = useState('2025/26');

  const renderTab = () => {
    switch (activeTab) {
      case 'schedule':
        return <Schedule currentSeason={currentSeason} />;
      case 'availability':
        return <Availability currentSeason={currentSeason} />;
      case 'scores':
        return <Scores currentSeason={currentSeason} />;
      case 'stats':
        return <Stats currentSeason={currentSeason} />;
      case 'standings':
        return <Standings currentSeason={currentSeason} />;
      case 'trophy':
        return <TrophyRoom currentSeason={currentSeason} />;
      case 'import':
        return <Import currentSeason={currentSeason} />;
      default:
        return <Schedule currentSeason={currentSeason} />;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="team-name">{TEAM_NAME}</h1>
        <div className="season-selector">
          <label htmlFor="season-select">Season:</label>
          <select
            id="season-select"
            value={currentSeason}
            onChange={(e) => setCurrentSeason(e.target.value)}
          >
            {SEASONS.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="content">
        {renderTab()}
      </main>

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
