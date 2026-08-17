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
   Continuous Dynamic Real-Time Live Cricket Stream Engine
   ========================================================================== */

const CRIC_API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';

let matchState = {
  isRealLiveConnected: false,
  matches: [],
  slRuns: 244,
  slWickets: 7,
  indScore: 462,
  overs: 67,
  balls: 1,
  day: 3,
  strikerRuns: 6,
  strikerBalls: 18,
  recentBalls: ['0', '1', '4', '0', 'W', '1'],
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

  // Try fetching external API stream
  fetchLiveApiData();

  // Continuous Dynamic Live Stream (Updates live every 3.5 seconds)
  setInterval(() => {
    processLiveStreamUpdate();
  }, 3500);
});

async function fetchLiveApiData() {
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

    if (res && res.ok) {
      const data = await res.json();
      const matches = data.matches || data.data || [];
      if (matches && matches.length > 0) {
        matchState.isRealLiveConnected = true;
        matchState.matches = matches;
        renderScorecardMatches(matches);
      }
    }
  } catch (err) {
    console.warn('API fetch notice:', err.message);
  }
}

function processLiveStreamUpdate() {
  if (matchState.slWickets >= 10) return;

  // Increment ball in live stream
  matchState.balls += 1;
  if (matchState.balls > 6) {
    matchState.balls = 1;
    matchState.overs += 1;
  }

  // Live ball event pool
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
    addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>WICKET!</strong> Prasidh Krishna bowls a beauty! Edged behind!`);
  } else {
    matchState.slRuns += outcome;
    if (outcome > 0) {
      matchState.strikerRuns += outcome;
    }
    matchState.strikerBalls += 1;
    matchState.recentBalls.shift();
    matchState.recentBalls.push(String(outcome));

    if (outcome === 4) {
      newDotType = 'dot-boundary';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>FOUR!</strong> Keshara Nuwantha drives through covers!`);
    } else if (outcome > 0) {
      newDotType = 'dot-runs';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Krishna to Nuwantha, ${outcome} run(s). Pushed into deep point.`);
    } else {
      newDotType = 'dot-dot';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Krishna to Nuwantha, NO RUN. Defended solidly.`);
    }
  }

  // Plot new pitch scatter dot
  const activeBowler = matchState.bowlersData[matchState.activePitchBowlerIdx];
  const newX = Math.floor(Math.random() * 40) + 30;
  const newY = Math.floor(Math.random() * 50) + 28;
  activeBowler.dots.push({ x: newX, y: newY, type: newDotType });

  renderHawkEyePitchDots();
  updateLiveHUDUI();
}

function updateLiveHUDUI() {
  // Update Scores
  const heroTeamEl = document.querySelector('.team-hero');
  if (heroTeamEl) {
    heroTeamEl.innerHTML = `SL <strong class="score-emerald" id="score-sl">${matchState.slRuns}/${matchState.slWickets}</strong>`;
  }

  const oppTeamEl = document.querySelector('.team-opp');
  if (oppTeamEl) {
    oppTeamEl.innerHTML = `IND <strong class="score-cyan" id="score-ind">${matchState.indScore}</strong>`;
  }

  const overBadge = document.getElementById('hud-over-status');
  if (overBadge) {
    overBadge.textContent = `DAY ${matchState.day} • ${matchState.overs}.${matchState.balls} OV`;
  }

  // Trail Calculation
  const trailRuns = matchState.indScore - matchState.slRuns;
  const eqEl = document.getElementById('equation-text');

  if (eqEl) {
    if (trailRuns > 0) {
      eqEl.innerHTML = `SL trail by <strong>${trailRuns}</strong> runs`;
    } else {
      const lead = Math.abs(trailRuns);
      eqEl.innerHTML = `SL lead by <strong>${lead}</strong> runs`;
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
}

function renderScorecardMatches(matches) {
  const scPane = document.getElementById('view-scorecard');
  if (!scPane) return;

  let html = `
    <div class="simple-card">
      <div class="card-title">SL VS IND • LIVE TEST STREAM</div>
      <div class="score-item highlight"><span>SL 1st Inns</span><span>${matchState.slRuns}/${matchState.slWickets} (${matchState.overs}.${matchState.balls} ov)</span></div>
      <div class="score-item"><span>IND 1st Inns</span><span>462 (116.4 ov)</span></div>
      <div class="card-title mt-3">EXTERNAL LIVESCORES FEED</div>
  `;
  matches.slice(0, 3).forEach((m) => {
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
  module.exports = { DPAD, moveFocus, matchState, fetchLiveApiData };
}
