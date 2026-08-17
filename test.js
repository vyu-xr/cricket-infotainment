const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting MRBD Web App Validation Suite...\n');

let errors = 0;

function check(title, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${title}`);
  } catch (err) {
    errors++;
    console.error(`  ❌ FAIL: ${title}\n     Reason: ${err.message}`);
  }
}

// 1. Inspect index.html
const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

check('index.html exists', () => {
  assert(fs.existsSync(htmlPath));
});

check('Viewport metadata strictly specifies width=600, height=600', () => {
  assert(htmlContent.includes('width=600, height=600'), 'Viewport missing width=600, height=600 specification');
});

check('Interactive elements include focusable class', () => {
  const focusableMatches = htmlContent.match(/class="[^"]*focusable[^"]*"/g);
  assert(focusableMatches && focusableMatches.length >= 4, 'Expected at least 4 focusable interactive elements');
});

check('App contains description and mrbd-web-app-capable meta tags', () => {
  assert(htmlContent.includes('<meta name="description"'), 'Missing description meta tag');
  assert(htmlContent.includes('<meta name="mrbd-web-app-capable" content="yes">'), 'Missing mrbd-web-app-capable meta tag');
});

// 2. Inspect styles.css
const cssPath = path.join(__dirname, 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

check('styles.css exists', () => {
  assert(fs.existsSync(cssPath));
});

check('Root viewport container is locked to 600px by 600px with overflow hidden', () => {
  assert(cssContent.includes('width: 600px;'), 'CSS missing width: 600px');
  assert(cssContent.includes('height: 600px;'), 'CSS missing height: 600px');
  assert(cssContent.includes('overflow: hidden;'), 'CSS missing overflow: hidden to prevent scrolling');
});

check('Base background is pure black #000000 for Additive Display mode', () => {
  assert(cssContent.includes('#000000'), 'CSS missing pure black background #000000');
});

check('.focusable:focus highlights with MRBD spec focus glow (#00d4ff)', () => {
  assert(cssContent.includes('.focusable:focus'), 'Missing .focusable:focus rule');
  assert(cssContent.includes('#00d4ff'), 'Focus rule missing MRBD accent color #00d4ff');
});

check('No CSS typography rules fall below 18px', () => {
  const smallMatches = cssContent.match(/font-size:\s*([0-9]|1[0-7])px/g);
  assert(!smallMatches, `Found font-size values below 18px: ${smallMatches}`);
});

// 3. Inspect app.js
const appPath = path.join(__dirname, 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

check('app.js exists', () => {
  assert(fs.existsSync(appPath));
});

check('Contains DPAD constants for MRBD ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter', () => {
  assert(appContent.includes("UP: 'ArrowUp'"), 'Missing UP DPAD constant');
  assert(appContent.includes("DOWN: 'ArrowDown'"), 'Missing DOWN DPAD constant');
  assert(appContent.includes("LEFT: 'ArrowLeft'"), 'Missing LEFT DPAD constant');
  assert(appContent.includes("RIGHT: 'ArrowRight'"), 'Missing RIGHT DPAD constant');
  assert(appContent.includes("SELECT: 'Enter'"), 'Missing SELECT DPAD constant');
});

check('Contains moveFocus(direction) spatial focus management', () => {
  assert(appContent.includes('function moveFocus(direction)'), 'Missing moveFocus function definition');
  assert(appContent.includes('.focusable:not([disabled]):not(.hidden)'), 'moveFocus missing .focusable selector query');
});

check('Contains keydown D-pad event listener with e.preventDefault()', () => {
  assert(appContent.includes("document.addEventListener('keydown'"), 'Missing keydown listener');
  assert(appContent.includes('e.preventDefault()'), 'Missing e.preventDefault() for handled keys');
});

console.log('\n----------------------------------------');
if (errors === 0) {
  console.log('🎉 ALL MRBD LOCAL CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${errors} CHECK(S) FAILED.`);
  process.exit(1);
}
