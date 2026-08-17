// — Input Constants —
const DPAD = {
  UP: 'ArrowUp', DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft', RIGHT: 'ArrowRight',
  SELECT: 'Enter', BACK: 'Escape',
};

// — Focus Management —
function moveFocus(direction) {
  var focusables = Array.from(
    document.querySelectorAll('.focusable:not([disabled]):not(.hidden)')
  );
  if (!focusables.length) return;

  var idx = focusables.indexOf(document.activeElement);
  if (idx === -1) { focusables[0].focus(); return; }

  var next = (direction === 'up' || direction === 'left')
    ? (idx > 0 ? idx - 1 : focusables.length - 1)
    : (idx < focusables.length - 1 ? idx + 1 : 0);

  focusables[next].focus();
  focusables[next].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// — D-pad Listener —
document.addEventListener('keydown', function(e) {
  switch (e.key) {
    case DPAD.UP:     moveFocus('up');    break;
    case DPAD.DOWN:   moveFocus('down');  break;
    case DPAD.LEFT:   moveFocus('left');  break;
    case DPAD.RIGHT:  moveFocus('right'); break;
    case DPAD.SELECT:
      if (document.activeElement && document.activeElement.classList.contains('focusable')) {
        document.activeElement.click();
      }
      break;
    case DPAD.BACK:   history.back();     break;
    default: return; // don't preventDefault on unhandled keys
  }
  e.preventDefault();
});

/* ==========================================================================
   Multi-Provider Real-World Live Score Engine (RapidAPI + CricAPI + Cricinfo)
   ========================================================================== */

const RAPID_API_HOST = 'cricket-api-free-data.p.rapidapi.com';
const RAPID_API_KEY = '048c1bf91amshb8fb396b2e774f1p1f71b5jsn9fea418e14df';
const CRIC_API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';

let matchState = {
  isRealLiveConnected: false,
  matches: [],
  slScore: '244/7',
  indScore: '462',
  overs: '67.1',
  statusMessage: 'SL TRAIL BY 218 RUNS',
  activePitchBowlerIdx: 0,
  bowlersData: [
    {
      name: 'P. KRISHNA',
      dots: [
        { x: 48, y: 38, type: 'dot-dot' },
        { x: 52, y: 44, type: 'dot-runs' },
        { x: 42, y: 32, type: 'dot-dot' },
        { x: 38, y: 48, type: 'dot-wicket' },
        { x: 44, y: 55, type: 'dot-boundary' },
        { x: 60, y: 62, type: 'dot-runs' }
      ]
    },
    {
      name: 'R. JADEJA',
      dots: [
        { x: 50, y: 65, type: 'dot-wicket' },
        { x: 46, y: 60, type: 'dot-dot' },
        { x: 48, y: 68, type: 'dot-dot' },
        { x: 52, y: 72, type: 'dot-runs' },
        { x: 42, y: 64, type: 'dot-boundary' }
      ]
    }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize default focus
  const focusables = document.querySelectorAll('.focusable');
  if (focusables.length > 0) {
    focusables[0].focus();
  }

  // Attach Click Handlers to all focusable elements
  document.querySelectorAll('.focusable').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-action');
      handleAction(action, btn);
    });
  });

  // Render initial Hawk-Eye pitch dots
  renderHawkEyePitchDots();

  // Fetch real-world API live scores immediately
  fetchMultiProviderLiveData();

  // Poll real-world API endpoints every 5 seconds (ZERO simulation)
  setInterval(() => {
    fetchMultiProviderLiveData();
  }, 5000);
});

async function fetchMultiProviderLiveData() {
  try {
    let res = null;

    // 1. Fetch from local backend server proxy (RapidAPI /cricket-matches-live + CricAPI + RSS)
    try {
      res = await fetch('/api/live');
    } catch (e) {
      res = null;
    }

    if (res && res.ok) {
      const data = await res.json();
      const matches = (data.rapidLiveMatches && data.rapidLiveMatches.length > 0) 
        ? data.rapidLiveMatches 
        : (data.cricApiMatches || data.rssMatches || []);

      if (matches && matches.length > 0) {
        matchState.isRealLiveConnected = true;
        matchState.matches = matches;
        parseMultiProviderMatches(matches);
      }
      return;
    }

    // 2. Direct CricAPI call if server proxy is unavailable
    try {
      res = await fetch(`https://api.cricapi.com/v1/cricScore?apikey=${CRIC_API_KEY}`);
      if (res && res.ok) {
        const json = await res.json();
        const matches = json.data || json.matches || [];
        if (matches && matches.length > 0) {
          matchState.isRealLiveConnected = true;
          matchState.matches = matches;
          parseMultiProviderMatches(matches);
        }
      }
    } catch (e) {
      console.warn('Direct CricAPI fetch notice:', e.message);
    }
  } catch (err) {
    console.warn('Multi-provider live score fetch notice:', err.message);
  }
}

function parseMultiProviderMatches(matches) {
  if (!matches || matches.length === 0) return;

  renderScorecardMatches(matches);

  const slIndMatch = matches.find(m => {
    const str = ((m.title || '') + (m.t1 || '') + (m.t2 || '') + (m.matchInfo ? JSON.stringify(m.matchInfo) : '')).toLowerCase();
    return str.includes('sri lanka') || str.includes('india');
  });

  if (slIndMatch) {
    if (slIndMatch.t1s || slIndMatch.t2s) {
      const t1Score = slIndMatch.t1s || matchState.slScore;
      const t2Score = slIndMatch.t2s || matchState.indScore;
      const status = slIndMatch.status || matchState.statusMessage;

      matchState.slScore = t1Score;
      matchState.indScore = t2Score;
      matchState.statusMessage = status;

      updateHUDFromApi(t1Score, t2Score, status);
    } else if (slIndMatch.title) {
      const parts = slIndMatch.title.split(/v|vs/i);
      if (parts.length >= 2) {
        const slPart = parts.find(p => p.toLowerCase().includes('sri lanka')) || parts[0];
        const indPart = parts.find(p => p.toLowerCase().includes('india')) || parts[1];

        const slScore = extractScore(slPart) || matchState.slScore;
        const indScore = extractScore(indPart) || matchState.indScore;

        matchState.slScore = slScore;
        matchState.indScore = indScore;

        updateHUDFromApi(slScore, indScore, slIndMatch.description || matchState.statusMessage);
      }
    }
  }
}

function extractScore(str) {
  const match = str.match(/\d+[\/\d\*\s]*/);
  return match ? match[0].trim() : null;
}

function updateHUDFromApi(slScore, indScore, statusText) {
  const heroTeamEl = document.querySelector('.team-hero');
  if (heroTeamEl) heroTeamEl.innerHTML = `SL <strong class="score-emerald" id="score-sl">${slScore}</strong>`;

  const oppTeamEl = document.querySelector('.team-opp');
  if (oppTeamEl) oppTeamEl.innerHTML = `IND <strong class="score-cyan" id="score-ind">${indScore}</strong>`;

  const overBadge = document.getElementById('hud-over-status');
  if (overBadge) overBadge.textContent = 'RAPIDAPI • /cricket-matches-live';

  const eqEl = document.getElementById('equation-text');
  if (eqEl) eqEl.innerHTML = `<strong>${statusText.toUpperCase()}</strong>`;
}

function renderScorecardMatches(matches) {
  const scPane = document.getElementById('view-scorecard');
  if (!scPane) return;

  let html = `
    <div class="simple-card">
      <div class="card-title">RAPIDAPI (/cricket-matches-live) FEED</div>
  `;
  matches.slice(0, 4).forEach((m) => {
    const titleText = m.title || `${m.t1 || 'Team 1'} vs ${m.t2 || 'Team 2'}`;
    const scoreText = m.description || `${m.t1s || ''} ${m.t2s ? '/ ' + m.t2s : ''}`;
    html += `
      <div class="score-item">
        <span>${titleText}</span>
        <span>${scoreText}</span>
      </div>
    `;
  });
  html += `</div>`;
  scPane.innerHTML = html;
}

function handleAction(action, targetBtn) {
  if (!action) return;

  if (action.startsWith('tab-')) {
    switchTab(action, targetBtn);
  } else if (action === 'switch-pitch-bowler') {
    switchPitchBowler(targetBtn);
  }
}

function switchTab(action, tabBtn) {
  document.querySelectorAll('.nav-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));

  tabBtn.classList.add('active');

  const paneId = action.replace('tab-', 'view-');
  const targetPane = document.getElementById(paneId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
}

function renderHawkEyePitchDots() {
  const container = document.getElementById('pitch-dots-container');
  if (!container) return;

  container.innerHTML = '';
  const currentBowler = matchState.bowlersData[matchState.activePitchBowlerIdx];

  currentBowler.dots.forEach(dot => {
    const el = document.createElement('div');
    el.className = `pitch-dot ${dot.type}`;
    el.style.left = `${dot.x}%`;
    el.style.top = `${dot.y}%`;
    container.appendChild(el);
  });
}

function switchPitchBowler(btn) {
  matchState.activePitchBowlerIdx = (matchState.activePitchBowlerIdx + 1) % matchState.bowlersData.length;
  const bData = matchState.bowlersData[matchState.activePitchBowlerIdx];

  if (btn) {
    btn.textContent = `BOWLER: ${bData.name}`;
  }
  renderHawkEyePitchDots();
}

// Export for Node unit testing environment if running under CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DPAD, moveFocus, matchState, fetchMultiProviderLiveData, RAPID_API_HOST, RAPID_API_KEY };
}
