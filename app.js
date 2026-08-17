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
   Sri Lanka vs India, 1st Test 2026 Live Engine & CricAPI Connector
   ========================================================================== */

const CRIC_API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';

let matchState = {
  isApiActive: false,
  matches: [],
  slScore: 148,
  slWickets: 4,
  slInns1: 312,
  indInns1: 425,
  overs: 42,
  balls: 4,
  day: 4,
  strikerRuns: 64,
  strikerBalls: 112,
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
    },
    {
      name: 'M. SIRAJ',
      dots: [
        { x: 50, y: 40, type: 'dot-wicket' },
        { x: 45, y: 36, type: 'dot-dot' },
        { x: 55, y: 44, type: 'dot-dot' },
        { x: 38, y: 62, type: 'dot-runs' }
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

  // Try fetching CricAPI data for CARDS view
  fetchCricApiData();

  // Auto-simulate live Test match balls for SL vs IND 1st Test 2026 every 3 seconds
  setInterval(() => {
    simulateNextBall();
  }, 3000);
});

async function fetchCricApiData() {
  try {
    let res = null;
    try {
      res = await fetch('/api/live');
    } catch (e) {
      res = null;
    }

    if (!res || !res.ok) {
      res = await fetch(`https://api.cricapi.com/v1/cricScore?apikey=${CRIC_API_KEY}`);
    }

    if (!res || !res.ok) throw new Error('API offline');

    const data = await res.json();
    const matches = data.matches || data.data || [];
    if (matches && matches.length > 0) {
      matchState.isApiActive = true;
      matchState.matches = matches;
      renderScorecardMatches(matches);
    }
  } catch (err) {
    console.warn('CricAPI fetch warning:', err.message);
  }
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

  let html = `
    <div class="simple-card">
      <div class="card-title">SL VS IND • 1ST TEST 2026</div>
      <div class="score-item"><span>SL 1st Inns</span><span>312 (94.2 ov)</span></div>
      <div class="score-item"><span>IND 1st Inns</span><span>425 (118.0 ov)</span></div>
      <div class="score-item highlight"><span>SL 2nd Inns</span><span>${matchState.slScore}/${matchState.slWickets} (${matchState.overs}.${matchState.balls} ov)</span></div>
      <div class="card-title mt-3">OTHER CRICAPI MATCHES</div>
  `;
  matches.slice(0, 3).forEach((m) => {
    const t1 = formatTeamShortName(m.t1);
    const t2 = formatTeamShortName(m.t2);
    const s1 = m.t1s || 'Scheduled';
    const s2 = m.t2s || '';
    html += `
      <div class="score-item">
        <span>${t1} vs ${t2}</span>
        <span>${s1} ${s2 ? '/ ' + s2 : ''}</span>
      </div>
    `;
  });
  html += `</div>`;
  scPane.innerHTML = html;
}

function simulateNextBall() {
  if (matchState.slWickets >= 10) return;

  // Increment ball
  matchState.balls += 1;
  if (matchState.balls > 6) {
    matchState.balls = 1;
    matchState.overs += 1;
  }

  // Event outcome pool for Test match
  const outcomes = [0, 0, 1, 0, 4, 0, 'W', 0, 2];
  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
  let newDotType = 'dot-dot';

  if (outcome === 'W') {
    matchState.slWickets += 1;
    matchState.strikerRuns = 0;
    matchState.strikerBalls = 0;
    matchState.recentBalls.shift();
    matchState.recentBalls.push('W');
    newDotType = 'dot-wicket';
    addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>WICKET!</strong> Bumrah produces a beauty to edge behind!`);
  } else {
    matchState.slScore += outcome;
    if (outcome > 0) {
      matchState.strikerRuns += outcome;
    }
    matchState.strikerBalls += 1;
    matchState.recentBalls.shift();
    matchState.recentBalls.push(String(outcome));

    if (outcome === 4) {
      newDotType = 'dot-boundary';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>FOUR!</strong> Driven through covers with elegance!`);
    } else if (outcome > 0) {
      newDotType = 'dot-runs';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Bumrah to Mendis, ${outcome} run(s). Pushed into midwicket.`);
    } else {
      newDotType = 'dot-dot';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Bumrah to Mendis, NO RUN. Defended cleanly.`);
    }
  }

  // Add new pitch scatter dot to current bowler dataset
  const activeBowler = matchState.bowlersData[matchState.activePitchBowlerIdx];
  const newX = Math.floor(Math.random() * 40) + 30; // 30% to 70% width across narrow pitch
  const newY = Math.floor(Math.random() * 50) + 28; // 28% to 78% height
  activeBowler.dots.push({ x: newX, y: newY, type: newDotType });

  renderHawkEyePitchDots();
  updateHUDUI();
}

function updateHUDUI() {
  // Update Score
  const heroTeamEl = document.querySelector('.team-hero');
  if (heroTeamEl) {
    heroTeamEl.innerHTML = `SL <strong class="score-emerald" id="score-sl">${matchState.slScore}/${matchState.slWickets}</strong>`;
  }

  const oppTeamEl = document.querySelector('.team-opp');
  if (oppTeamEl) {
    oppTeamEl.innerHTML = `IND <strong class="score-cyan" id="score-ind">425</strong>`;
  }
  
  const overEl = document.getElementById('hud-over-status');
  if (overEl) {
    overEl.textContent = `DAY ${matchState.day} • ${matchState.overs}.${matchState.balls} OV`;
  }

  // Lead / Trail Calculation
  const totalSL = matchState.slInns1 + matchState.slScore;
  const leadDiff = totalSL - matchState.indInns1;
  const leadEl = document.getElementById('lead-runs');
  const eqEl = document.getElementById('equation-text');

  if (eqEl) {
    if (leadDiff >= 0) {
      eqEl.innerHTML = `SL lead by <strong>${leadDiff}</strong> runs (1st Inns: SL ${matchState.slInns1})`;
    } else {
      const trail = Math.abs(leadDiff);
      eqEl.innerHTML = `SL trail by <strong>${trail}</strong> runs (1st Inns: SL ${matchState.slInns1})`;
    }
  }

  // Batters
  const strikerEl = document.getElementById('striker-runs');
  if (strikerEl) strikerEl.textContent = matchState.strikerRuns;

  // Recent Balls Ribbon
  const recentContainer = document.getElementById('recent-balls');
  if (recentContainer) {
    recentContainer.innerHTML = '';
    matchState.recentBalls.forEach((b, idx) => {
      const span = document.createElement('span');
      span.className = 'ball-tag';
      if (b === '4') span.classList.add('ball-four');
      else if (b === '6') span.classList.add('ball-six');
      else if (b === 'W') span.classList.add('ball-wicket');
      if (idx === matchState.recentBalls.length - 1) span.classList.add('ball-current');
      span.textContent = b;
      recentContainer.appendChild(span);
    });
  }

  // Refresh Cards View if matchState matches exist
  if (matchState.matches && matchState.matches.length > 0) {
    renderScorecardMatches(matchState.matches);
  }
}

function addCommentary(over, text) {
  const commContainer = document.getElementById('comm-list-container');
  if (!commContainer) return;

  const item = document.createElement('div');
  item.className = 'comm-box';
  if (text.includes('FOUR') || text.includes('WICKET')) {
    item.classList.add('highlight-six');
  }
  item.innerHTML = `<span class="comm-over">${over}</span><span class="comm-txt">${text}</span>`;
  commContainer.insertBefore(item, commContainer.firstChild);

  // Keep max 2 items to strictly avoid scrolling
  while (commContainer.children.length > 2) {
    commContainer.removeChild(commContainer.lastChild);
  }
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
