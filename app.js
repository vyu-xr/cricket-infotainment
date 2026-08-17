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
   Real-World CricAPI Engine & UI State
   ========================================================================== */

const CRIC_API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';

let matchState = {
  isApiActive: false,
  matches: [],
  activeMatchIdx: 0,
  slScore: '148/4',
  indScore: '425',
  overs: 42,
  balls: 4,
  day: 4,
  strikerRuns: 64,
  recentBalls: ['0', '1', '4', '0', 'W', '0'],
  timerId: null,
  activePitchBowlerIdx: 0,
  bowlersData: [
    {
      name: 'J. BUMRAH',
      dots: [
        { x: 48, y: 38, type: 'dot-wicket' },
        { x: 52, y: 44, type: 'dot-wicket' },
        { x: 42, y: 32, type: 'dot-dot' },
        { x: 38, y: 48, type: 'dot-dot' },
        { x: 44, y: 55, type: 'dot-dot' },
        { x: 60, y: 62, type: 'dot-runs' },
        { x: 65, y: 35, type: 'dot-boundary' }
      ]
    },
    {
      name: 'R. ASHWIN',
      dots: [
        { x: 50, y: 65, type: 'dot-wicket' },
        { x: 46, y: 60, type: 'dot-wicket' },
        { x: 48, y: 68, type: 'dot-dot' },
        { x: 52, y: 72, type: 'dot-dot' },
        { x: 42, y: 64, type: 'dot-runs' }
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

  // Fetch real CricAPI data immediately
  fetchCricApiData();

  // Poll CricAPI backend endpoint every 8 seconds
  setInterval(() => {
    fetchCricApiData();
  }, 8000);
});

async function fetchCricApiData() {
  try {
    const res = await fetch('/api/live');
    if (!res.ok) throw new Error('CricAPI offline');
    const data = await res.json();
    if (data.success && data.matches && data.matches.length > 0) {
      matchState.isApiActive = true;
      matchState.matches = data.matches;
      updateHUDWithCricApiData();
    }
  } catch (err) {
    console.warn('CricAPI fetch warning:', err.message);
  }
}

function updateHUDWithCricApiData() {
  if (!matchState.matches || matchState.matches.length === 0) return;

  // Pick India / Sri Lanka match if active, else top live/result match
  const matches = matchState.matches;
  const currentMatch = matches.find(m => 
    (m.t1 && (m.t1.includes('India') || m.t1.includes('Sri Lanka'))) || 
    (m.t2 && (m.t2.includes('India') || m.t2.includes('Sri Lanka')))
  ) || matches.find(m => m.t1s || m.t2s) || matches[0];

  if (!currentMatch) return;

  // Extract Short Team Names (e.g. "Sri Lanka [SL]" -> "SL")
  const t1Name = formatTeamShortName(currentMatch.t1 || 'SL');
  const t2Name = formatTeamShortName(currentMatch.t2 || 'IND');
  const t1Score = currentMatch.t1s || '148/4';
  const t2Score = currentMatch.t2s || '425';
  const statusText = currentMatch.status || 'Match in progress';

  // Update Hero Card Elements
  const heroTeamEl = document.querySelector('.team-hero');
  if (heroTeamEl) {
    heroTeamEl.innerHTML = `${t1Name} <strong class="score-emerald" id="score-sl">${t1Score}</strong>`;
  }

  const oppTeamEl = document.querySelector('.team-opp');
  if (oppTeamEl) {
    oppTeamEl.innerHTML = `${t2Name} <strong class="score-cyan" id="score-ind">${t2Score}</strong>`;
  }

  // Update Status Equation Pill
  const eqEl = document.getElementById('equation-text');
  if (eqEl) {
    eqEl.innerHTML = `<strong>${statusText.toUpperCase()}</strong>`;
  }

  // Update Top Badge
  const overBadge = document.getElementById('hud-over-status');
  if (overBadge) {
    overBadge.textContent = `CRICAPI LIVE`;
  }

  // Update Scorecard View Summary
  renderScorecardMatches(matches);
}

function formatTeamShortName(name) {
  if (!name) return 'TEAM';
  const bracketMatch = name.match(/\[(.*?)\]/);
  if (bracketMatch) return bracketMatch[1];
  return name.split(' ')[0].toUpperCase();
}

function renderScorecardMatches(matches) {
  const scPane = document.getElementById('view-scorecard');
  if (!scPane) return;

  let html = `<div class="simple-card"><div class="card-title">REAL-WORLD CRICAPI MATCHES</div>`;
  matches.slice(0, 4).forEach((m, idx) => {
    const t1 = formatTeamShortName(m.t1);
    const t2 = formatTeamShortName(m.t2);
    const s1 = m.t1s || 'Yet to bat';
    const s2 = m.t2s || '';
    const isHighlight = idx === 0 ? 'highlight' : '';

    html += `
      <div class="score-item ${isHighlight}">
        <span>${t1} vs ${t2}</span>
        <span>${s1} ${s2 ? '/ ' + s2 : ''}</span>
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
  module.exports = { DPAD, moveFocus, matchState, fetchCricApiData, CRIC_API_KEY };
}
