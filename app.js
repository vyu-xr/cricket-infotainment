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
   Exact Cricbuzz SL vs IND 1st Test 2026 Match Engine
   ========================================================================== */

let matchState = {
  isApiActive: false,
  matches: [],
  slScore: 235,
  slWickets: 5,
  indInns1: 462,
  overs: 61,
  balls: 1,
  day: 3,
  strikerRuns: 73,
  strikerBalls: 129,
  recentBalls: ['1', '0', '4', '1', '0', '1'],
  timerId: null,
  activePitchBowlerIdx: 0,
  bowlersData: [
    {
      name: 'P. KRISHNA',
      dots: [
        { x: 48, y: 38, type: 'dot-dot' },
        { x: 52, y: 44, type: 'dot-runs' },
        { x: 42, y: 32, type: 'dot-dot' },
        { x: 38, y: 48, type: 'dot-dot' },
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

  // Auto-simulate live Test match balls for SL vs IND 1st Test 2026 every 3 seconds
  setInterval(() => {
    simulateNextBall();
  }, 3000);
});

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
    addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>WICKET!</strong> Prasidh Krishna gets the breakthrough! Caught behind!`);
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
      addCommentary(`${matchState.overs}.${matchState.balls}`, `<strong>FOUR!</strong> Sonal Dinusha drives through covers with sweet timing!`);
    } else if (outcome > 0) {
      newDotType = 'dot-runs';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Krishna to Dinusha, ${outcome} run(s). Pushed into deep point.`);
    } else {
      newDotType = 'dot-dot';
      addCommentary(`${matchState.overs}.${matchState.balls}`, `Krishna to Dinusha, NO RUN. Defended back to bowler.`);
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
    oppTeamEl.innerHTML = `IND <strong class="score-cyan" id="score-ind">462</strong>`;
  }
  
  const overEl = document.getElementById('hud-over-status');
  if (overEl) {
    overEl.textContent = `DAY ${matchState.day} • ${matchState.overs}.${matchState.balls} OV`;
  }

  // Trail Calculation
  const trailRuns = matchState.indInns1 - matchState.slScore;
  const eqEl = document.getElementById('equation-text');

  if (eqEl) {
    if (trailRuns > 0) {
      eqEl.innerHTML = `Sri Lanka trail by <strong>${trailRuns}</strong> runs`;
    } else {
      const lead = Math.abs(trailRuns);
      eqEl.innerHTML = `Sri Lanka lead by <strong>${lead}</strong> runs`;
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
  module.exports = { DPAD, moveFocus, matchState };
}
