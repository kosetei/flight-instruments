/* フライト計器パネル — six pack instruments driven by device sensors.
 * Pure static, no dependencies. */
(() => {
  'use strict';

  // ---------- helpers ----------
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap360 = a => ((a % 360) + 360) % 360;
  const wrap180 = a => { a = wrap360(a); return a > 180 ? a - 360 : a; };
  const f = n => (Math.round(n * 100) / 100).toString();
  // polar: angle in degrees clockwise from 12 o'clock
  const pol = (r, a) => [r * Math.sin(a * D2R), -r * Math.cos(a * D2R)];
  const $ = id => document.getElementById(id);

  function arcPath(r, a0, a1) {
    const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
    return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${large} ${sweep} ${f(x1)} ${f(y1)}`;
  }
  function tick(a, r0, r1, w, color = '#f0f0f0') {
    const [x0, y0] = pol(r0, a), [x1, y1] = pol(r1, a);
    return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${color}" stroke-width="${w}"/>`;
  }
  function num(a, r, txt, size = 13, cls = 'num') {
    const [x, y] = pol(r, a);
    return `<text x="${f(x)}" y="${f(y)}" font-size="${size}" class="${cls}">${txt}</text>`;
  }
  function screw(x, y) {
    const rot = Math.floor(Math.random() * 180);
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="6.5" fill="url(#gScrew)" stroke="#000" stroke-width=".8"/><rect x="-5" y="-1" width="10" height="2" fill="#111"/></g>`;
  }
  // a classic white pointer (points to 12 o'clock at rotation 0)
  function needle(id, len = 74, w = 3.2, tail = 16, color = '#f4f4f4') {
    return `<g id="${id}" filter="url(#fShadow)">
      <path d="M${-w} ${tail} L${-w * 0.7} ${-len + 10} L0 ${-len} L${w * 0.7} ${-len + 10} L${w} ${tail} Z" fill="${color}"/>
    </g>`;
  }
  const cap = (r = 7) => `<circle r="${r}" fill="url(#gCap)" stroke="#000" stroke-width="1"/>`;

  // ---------- SVG building ----------
  const DEFS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gCase" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c2e32"/><stop offset=".5" stop-color="#17181b"/><stop offset="1" stop-color="#0c0d0e"/>
    </linearGradient>
    <linearGradient id="gBezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b6f75"/><stop offset=".35" stop-color="#2a2c30"/><stop offset=".7" stop-color="#0d0e10"/><stop offset="1" stop-color="#3b3e43"/>
    </linearGradient>
    <radialGradient id="gFace" cx=".5" cy=".45" r=".6">
      <stop offset="0" stop-color="#1d1f22"/><stop offset="1" stop-color="#060607"/>
    </radialGradient>
    <linearGradient id="gGlass" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".38" stop-color="#fff" stop-opacity=".04"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="gVignette" cx=".5" cy=".5" r=".5">
      <stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
    <radialGradient id="gScrew" cx=".35" cy=".35" r=".8">
      <stop offset="0" stop-color="#9a9ea4"/><stop offset=".6" stop-color="#4a4d52"/><stop offset="1" stop-color="#1b1c1e"/>
    </radialGradient>
    <radialGradient id="gCap" cx=".35" cy=".35" r=".8">
      <stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#0a0a0a"/>
    </radialGradient>
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a3a78"/><stop offset="1" stop-color="#3f8fdc"/>
    </linearGradient>
    <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a5526"/><stop offset="1" stop-color="#3a200c"/>
    </linearGradient>
    <linearGradient id="gTube" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ecef"/><stop offset=".5" stop-color="#b9bfc6"/><stop offset="1" stop-color="#e3e6ea"/>
    </linearGradient>
    <radialGradient id="gBall" cx=".35" cy=".35" r=".7">
      <stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <clipPath id="clipFace"><circle r="86"/></clipPath>
    <filter id="fShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-color="#000" flood-opacity=".7"/>
    </filter>
  </defs></svg>`;

  function frame(inner, caption, knob = true) {
    return `<svg viewBox="-104 -104 208 226" xmlns="http://www.w3.org/2000/svg">
      <rect x="-100" y="-100" width="200" height="200" rx="18" fill="url(#gCase)" stroke="#050505" stroke-width="2"/>
      ${screw(-84, -84)}${screw(84, -84)}${screw(-84, 84)}${screw(84, 84)}
      <circle r="95" fill="url(#gBezel)"/>
      <circle r="89" fill="#000"/>
      <circle r="87" fill="url(#gFace)"/>
      ${inner}
      <circle r="87" fill="url(#gVignette)" pointer-events="none"/>
      <circle r="87" fill="url(#gGlass)" pointer-events="none"/>
      ${knob ? `<g transform="translate(-74 74)"><circle r="12" fill="#151515" stroke="#3a3a3a" stroke-width="1.5"/>${Array.from({ length: 12 }, (_, i) => tick(i * 30, 9, 12, 1.2, '#444')).join('')}<circle r="7" fill="url(#gCap)"/></g>` : ''}
      <text y="115" class="cap">${caption}</text>
    </svg>`;
  }

  // Airspeed: knots, 0..200, non-linear below 40
  const asiAngle = v => (v <= 40 ? (v / 40) * 28 : 28 + ((Math.min(v, 200) - 40) / 160) * 312);
  function buildASI() {
    let s = '';
    s += `<path d="${arcPath(80, asiAngle(40), asiAngle(85))}" stroke="#f4f4f4" stroke-width="6" fill="none"/>`;
    s += `<path d="${arcPath(75, asiAngle(48), asiAngle(129))}" stroke="#1fa83a" stroke-width="7" fill="none"/>`;
    s += `<path d="${arcPath(75, asiAngle(129), asiAngle(163))}" stroke="#f2c811" stroke-width="7" fill="none"/>`;
    s += tick(asiAngle(163), 70, 86, 3.5, '#e0241b');
    for (let v = 40; v <= 200; v += 5) {
      const big = v % 10 === 0;
      s += tick(asiAngle(v), big ? 70 : 76, 86, big ? 2.2 : 1.3);
    }
    s += tick(0, 74, 86, 2.2);
    for (let v = 40; v <= 200; v += 20) s += num(asiAngle(v), 57, v, 13);
    s += `<text id="asiLabel" y="-22" font-size="11" class="lbl">AIRSPEED</text><text y="24" font-size="9" class="lbl">KNOTS</text>`;
    s += `<g id="asiGS" style="display:none"><rect x="-25" y="33" width="50" height="15" rx="2" fill="#000" stroke="#555"/><text id="asiGSTxt" y="41" font-size="10" class="num" style="fill:#7fe07f">GS ---</text></g>`;
    s += needle('asiNeedle', 80, 3.2, 16) + cap(7);
    return frame(s, '速度計 ASI');
  }

  // Attitude indicator
  const AI_K = 1.9; // px per degree of pitch
  function buildAI() {
    let ladder = '';
    for (let p = -40; p <= 40; p += 2.5) {
      if (p === 0) continue;
      const y = -p * AI_K;
      const isTen = p % 10 === 0, isFive = p % 5 === 0;
      const w = isTen ? 26 : isFive ? 14 : 7;
      ladder += `<line x1="${-w}" y1="${f(y)}" x2="${w}" y2="${f(y)}" stroke="#fff" stroke-width="${isTen ? 1.8 : 1.2}"/>`;
      if (isTen && Math.abs(p) <= 30) {
        ladder += `<text x="-36" y="${f(y)}" font-size="9" class="num">${Math.abs(p)}</text><text x="36" y="${f(y)}" font-size="9" class="num">${Math.abs(p)}</text>`;
      }
    }
    let scale = '';
    for (const a of [-60, -30, -20, -10, 10, 20, 30, 60]) {
      const big = Math.abs(a) === 30 || Math.abs(a) === 60;
      scale += tick(a, big ? 72 : 76, 86, big ? 3 : 2);
    }
    for (const a of [-45, 45]) {
      const [x, y] = pol(80, a);
      scale += `<path d="M0 -6 L4 3 L-4 3 Z" transform="translate(${f(x)} ${f(y)}) rotate(${a + 180})" fill="#fff"/>`;
    }
    scale += tick(-90, 74, 86, 3) + tick(90, 74, 86, 3);
    scale += `<path d="M0 -71 L-7 -84 L7 -84 Z" fill="#fff" stroke="#000" stroke-width=".6"/>`; // zero index
    const s = `
    <g clip-path="url(#clipFace)">
      <g id="aiCard">
        <rect x="-300" y="-400" width="600" height="400" fill="url(#gSky)"/>
        <rect x="-300" y="0" width="600" height="400" fill="url(#gGround)"/>
        <line x1="-300" y1="0" x2="300" y2="0" stroke="#fff" stroke-width="2"/>
        ${ladder}
      </g>
      <g id="aiRing">
        <path d="M-87 0 A87 87 0 0 1 87 0 L69 0 A69 69 0 0 0 -69 0 Z" fill="#2c74c2"/>
        <path d="M-87 0 A87 87 0 0 0 87 0 L69 0 A69 69 0 0 1 -69 0 Z" fill="#5a3517"/>
        <circle r="69" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>
        <path d="M0 -68 L-7 -56 L7 -56 Z" fill="#f39c12" stroke="#000" stroke-width=".6"/>
        ${[-30, -60, 30, 60].map(a => tick(a, 62, 68, 1.5, 'rgba(255,255,255,.5)')).join('')}
      </g>
      ${scale}
    </g>
    <g filter="url(#fShadow)">
      <path d="M-62 0 H-24 L-12 11 L0 1 L12 11 L24 0 H62" fill="none" stroke="#f39c12" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle r="3.4" fill="#f39c12"/>
      <path d="M-40 87 L-22 52 H22 L40 87 Z" fill="#1d1e21" stroke="#000"/>
    </g>
    <text y="74" font-size="7" class="lbl" fill="#999" style="fill:#999">ATTITUDE</text>`;
    return frame(s, '姿勢指示器 AI');
  }

  // Altimeter
  function buildALT() {
    let s = '';
    for (let i = 0; i < 50; i++) {
      const a = i * 7.2, big = i % 5 === 0;
      s += tick(a, big ? 70 : 78, 86, big ? 2.4 : 1.2);
    }
    for (let i = 0; i < 10; i++) s += num(i * 36, 59, i, 17);
    // Kollsman window
    s += `<rect x="34" y="-9" width="34" height="18" rx="2" fill="#000" stroke="#555"/>
          <text x="51" y="0.5" font-size="11" class="num" style="fill:#fff">29.92</text>
          <text y="-28" font-size="10" class="lbl">ALT</text>
          <text y="-17" font-size="6.5" class="lbl">100 FEET</text>
          <text y="28" font-size="6" class="lbl" style="fill:#aaa">CALIBRATED TO</text>
          <text y="36" font-size="6" class="lbl" style="fill:#aaa">20,000 FEET</text>
          <text id="altSrc" y="49" font-size="7" class="lbl" style="display:none"></text>`;
    s += `<g id="altT10k" filter="url(#fShadow)"><path d="M-0.8 0 L-0.8 -70 L-5 -78 L5 -78 L0.8 -70 L0.8 0 Z" fill="#f4f4f4"/></g>`;
    s += `<g id="altT1k" filter="url(#fShadow)"><path d="M-4 10 L-6 -30 L0 -46 L6 -30 L4 10 Z" fill="#f4f4f4"/></g>`;
    s += needle('altT100', 78, 3, 16);
    s += cap(7);
    return frame(s, '高度計 ALT');
  }

  // Turn coordinator
  function buildTC() {
    let s = '';
    s += tick(-90, 66, 84, 3) + tick(90, 66, 84, 3);
    s += tick(-110, 66, 84, 3) + tick(110, 66, 84, 3);
    s += num(-118, 74, 'L', 12) + num(118, 74, 'R', 12);
    s += `<text y="-50" font-size="8" class="lbl">TURN COORDINATOR</text>
          <text y="-38" font-size="9" class="lbl">2 MIN</text>
          <text y="78" font-size="5.5" class="lbl" style="fill:#aaa">NO PITCH</text>
          <text y="84" font-size="5.5" class="lbl" style="fill:#aaa">INFORMATION</text>
          <text x="-30" y="-14" font-size="5.5" class="lbl" style="fill:#aaa">D.C.</text>
          <text x="30" y="-14" font-size="5.5" class="lbl" style="fill:#aaa">ELEC.</text>`;
    // inclinometer tube: arc center (0,-40), r=100, spanning +-17deg
    const tc = (r, a) => [r * Math.sin(a * D2R), -40 + r * Math.cos(a * D2R)];
    const [x0, y0] = tc(100, -17), [x1, y1] = tc(100, 17);
    s += `<path d="M${f(x0)} ${f(y0)} A100 100 0 0 0 ${f(x1)} ${f(y1)}" stroke="#000" stroke-width="17" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M${f(x0)} ${f(y0)} A100 100 0 0 0 ${f(x1)} ${f(y1)}" stroke="url(#gTube)" stroke-width="14" stroke-linecap="round" fill="none"/>`;
    for (const a of [-4.6, 4.6]) {
      const [a0, b0] = tc(92, a), [a1, b1] = tc(108, a);
      s += `<line x1="${f(a0)}" y1="${f(b0)}" x2="${f(a1)}" y2="${f(b1)}" stroke="#111" stroke-width="1.6"/>`;
    }
    s += `<circle id="tcBall" r="6.4" cx="0" cy="60" fill="url(#gBall)"/>`;
    // airplane, rear view
    s += `<g id="tcPlane" filter="url(#fShadow)">
      <path d="M-66 -1.8 H-10 A10 10 0 0 1 10 -1.8 H66 V2.4 H10 A10 10 0 0 1 -10 2.4 H-66 Z" fill="#f4f4f4"/>
      <path d="M-1.6 -10 L-1.6 -24 L1.6 -24 L1.6 -10 Z" fill="#f4f4f4"/>
      <path d="M-14 -14 H14 V-11 H-14 Z" fill="#f4f4f4"/>
      <circle r="8" fill="#f4f4f4"/><circle r="3" fill="#333"/>
    </g>`;
    return frame(s, '旋回計 TC');
  }

  // Heading indicator
  function buildHI() {
    let card = '';
    for (let d = 0; d < 360; d += 5) {
      const big = d % 10 === 0;
      card += tick(d, big ? 68 : 74, 80, big ? 2 : 1.2);
    }
    const lbls = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (let d = 0; d < 360; d += 30) {
      const t = lbls[d] || (d / 10);
      const big = !!lbls[d];
      card += `<text transform="rotate(${d}) translate(0 -56)" font-size="${big ? 15 : 13}" class="num" style="${d === 0 ? 'fill:#ffb347' : ''}">${t}</text>`;
    }
    let fixed = '';
    for (let a = 0; a < 360; a += 45) {
      const [x, y] = pol(83, a);
      fixed += a === 0
        ? `<path d="M0 -80 L-5 -88 L5 -88 Z" fill="#f39c12"/>`
        : `<path d="M0 -4 L3.5 3 L-3.5 3 Z" transform="translate(${f(x)} ${f(y)}) rotate(${a + 180})" fill="#fff"/>`;
    }
    const s = `
      <g id="hiCard">${card}</g>
      ${fixed}
      <g filter="url(#fShadow)">
        <line x1="0" y1="-48" x2="0" y2="-64" stroke="#f39c12" stroke-width="2"/>
        <path d="M0 -36 L3.5 -28 L3.5 -10 L32 2 L32 8 L3.5 4 L3.5 20 L12 27 L12 31 L0 29 L-12 31 L-12 27 L-3.5 20 L-3.5 4 L-32 8 L-32 2 L-3.5 -10 L-3.5 -28 Z" fill="#f39c12" stroke="#7a4a00" stroke-width=".8"/>
      </g>
      <text y="46" font-size="7" class="lbl" style="fill:#aaa">HEADING</text>
      <text id="hiSrc" y="38.5" font-size="6" class="lbl" style="fill:#7fd17f"></text>`;
    return frame(s, '方位指示器 HI');
  }

  // VSI: ±2000 fpm, 0 at 9 o'clock
  const vsiAngle = v => -90 + clamp(v, -2000, 2000) / 2000 * 172;
  function buildVSI() {
    let s = '';
    for (let v = -2000; v <= 2000; v += 100) {
      if (Math.abs(v) > 1000 && v % 500 !== 0) continue;
      const big = v % 500 === 0;
      s += tick(vsiAngle(v), big ? 70 : 78, 86, big ? 2.4 : 1.3);
    }
    for (const v of [5, 10, 15, 20]) {
      s += num(vsiAngle(v * 100), 58, v, 14);
      if (v !== 20) s += num(vsiAngle(-v * 100), 58, v, 14);
    }
    s += num(-90, 58, '0', 14);
    s += `<text x="-38" y="-30" font-size="8" class="lbl">UP</text>
          <text x="-38" y="32" font-size="8" class="lbl">DOWN</text>
          <text x="8" y="-16" font-size="7.5" class="lbl">VERTICAL SPEED</text>
          <text x="8" y="16" font-size="6" class="lbl" style="fill:#aaa">100 FEET PER MINUTE</text>
          <text id="vsiSrc" x="10" y="28" font-size="6.5" class="lbl" style="display:none"></text>`;
    s += needle('vsiNeedle', 80, 3.2, 16) + cap(7);
    return frame(s, '昇降計 VSI');
  }

  document.body.insertAdjacentHTML('afterbegin', DEFS);
  $('asi').innerHTML = buildASI();
  $('ai').innerHTML = buildAI();
  $('alt').innerHTML = buildALT();
  $('tc').innerHTML = buildTC();
  $('hi').innerHTML = buildHI();
  $('vsi').innerHTML = buildVSI();

  const el = {
    asi: $('asiNeedle'), aiCard: $('aiCard'), aiRing: $('aiRing'),
    alt100: $('altT100'), alt1k: $('altT1k'), alt10k: $('altT10k'),
    tcPlane: $('tcPlane'), tcBall: $('tcBall'), hiCard: $('hiCard'), vsi: $('vsiNeedle'),
    readout: $('readout'), badge: $('modeBadge'),
    asiLabel: $('asiLabel'), asiGS: $('asiGS'), asiGSTxt: $('asiGSTxt'), asiCap: document.querySelector('#asi .cap'),
    altSrc: $('altSrc'), vsiSrc: $('vsiSrc'), hiSrc: $('hiSrc'), btnGps: $('btnGps'),
  };

  // ---------- layout ----------
  const panel = $('panel'), stage = $('stage');
  function layout() {
    const r = stage.getBoundingClientRect();
    const W = r.width, H = r.height;
    const landscape = W >= H * 1.05;
    const cols = landscape ? 3 : 2, rows = landscape ? 2 : 3;
    const cellAR = 208 / 226;
    const gap = 0.02, pad = 0.03;
    // size of a cell that fits
    const cw = Math.min(
      W * (1 - 2 * pad) / (cols + gap * (cols - 1)),
      (H * (1 - 2 * pad) / (rows + gap * (rows - 1))) * cellAR
    );
    const ch = cw / cellAR;
    const g = cw * gap, p = Math.max(10, cw * 0.06);
    panel.style.gridTemplateColumns = `repeat(${cols}, ${cw}px)`;
    panel.style.gridTemplateRows = `repeat(${rows}, ${ch}px)`;
    panel.style.gap = `${g}px`;
    panel.style.padding = `${p * 0.6}px`;
    panel.style.gridTemplateAreas = landscape
      ? '"asi ai alt" "tc hi vsi"'
      : '"asi ai" "alt hi" "tc vsi"';
    const scale = Math.min(1, (W - 4) / (cols * cw + (cols - 1) * g + 1.2 * p), (H - 4) / (rows * ch + (rows - 1) * g + 1.2 * p));
    panel.style.transform = scale < 1 ? `scale(${scale})` : '';
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  layout();

  // ---------- state ----------
  const st = { pitch: 0, roll: 0, hdg: 0, turn: 0, slip: 0, ias: 105, alt: 3500, vsi: 0 }; // displayed
  const tgt = { pitch: 0, roll: 0, hdg: 0, turn: 0, slip: 0 };
  let mode = 'idle'; // idle | demo | manual | sensor
  let demoT = 0;
  const manual = { pitch: 0, roll: 0 };

  function setMode(m) {
    mode = m;
    const names = { idle: '待機中', demo: 'デモ飛行', manual: '手動操縦', sensor: 'センサー操縦' };
    el.badge.textContent = names[m] || m;
    $('btnDemo').classList.toggle('on', m === 'demo');
    $('btnSensor').classList.toggle('on', m === 'sensor');
    if (m === 'manual') { manual.pitch = tgt.pitch; manual.roll = tgt.roll; }
  }

  let toastTimer = 0;
  function toast(msg, ms = 3200) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- sensors ----------
  const sensor = {
    attached: false, gotOrientation: false, gotMotion: false,
    up: null,              // world-up vector in device frame
    R: null,               // device->world rotation matrix (row-major)
    absolute: false, compass: null,
    ref: null,             // {p0, r0, lat0}
    accSign: 1, lat: 0, yawRate: null, lastHdg: null, lastHdgT: 0,
  };

  function screenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
    if (typeof window.orientation === 'number') return window.orientation;
    return 0;
  }
  // device vector -> screen vector
  function toScreen(v, th) {
    const c = Math.cos(th * D2R), s = Math.sin(th * D2R);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  }
  function toDevice(v, th) {
    const c = Math.cos(th * D2R), s = Math.sin(th * D2R);
    return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]];
  }
  // rotation matrix from W3C Euler angles (Z-X'-Y'')
  function rotMatrix(a, b, g) {
    const ca = Math.cos(a * D2R), sa = Math.sin(a * D2R);
    const cb = Math.cos(b * D2R), sb = Math.sin(b * D2R);
    const cg = Math.cos(g * D2R), sg = Math.sin(g * D2R);
    return [
      ca * cg - sa * sb * sg, -cb * sa, ca * sg + cg * sa * sb,
      cg * sa + ca * sb * sg, ca * cb, sa * sg - ca * cg * sb,
      -cb * sg, sb, cb * cg,
    ];
  }

  function attitudeFromUp(us, ref) {
    const p0 = ref ? ref.p0 : 0;
    const n = [0, Math.cos(p0 * D2R), -Math.sin(p0 * D2R)];
    const a = [0, Math.sin(p0 * D2R), Math.cos(p0 * D2R)];
    const un = us[1] * n[1] + us[2] * n[2];
    const ua = us[1] * a[1] + us[2] * a[2];
    const pitch = Math.asin(clamp(un, -1, 1)) * R2D;
    const roll = Math.atan2(-us[0], ua) * R2D;
    return { pitch, roll, n };
  }

  function calibrate() {
    if (mode === 'sensor' && sensor.up) {
      const us = toScreen(sensor.up, screenAngle());
      const p0 = Math.atan2(us[1], us[2]) * R2D;
      const r0 = attitudeFromUp(us, { p0 }).roll;
      sensor.ref = { p0, r0, lat0: sensor.lat };
      toast('今の姿勢を水平として校正しました');
    } else {
      manual.pitch = 0; manual.roll = 0;
      if (mode === 'demo' || mode === 'idle') setMode('manual');
      toast('水平飛行に戻しました');
    }
  }

  function onOrientation(e, isAbs) {
    if (e.beta == null || e.gamma == null) return;
    if (isAbs) sensor.absolute = true;
    else if (sensor.absolute && !e.absolute) {
      // a relative event while absolute ones are arriving: only use its tilt
    }
    const alpha = e.alpha == null ? 0 : e.alpha;
    const R = rotMatrix(alpha, e.beta, e.gamma);
    // world up in device frame = third row of R
    sensor.up = [R[6], R[7], R[8]];
    if (isAbs || !sensor.absolute) sensor.R = R;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) {
      sensor.compass = e.webkitCompassHeading;
    }
    if (!sensor.gotOrientation) {
      sensor.gotOrientation = true;
      if (mode === 'sensor' && !sensor.ref) calibrate();
    }
    if (mode !== 'sensor') return;
    const th = screenAngle();
    const us = toScreen(sensor.up, th);
    if (!sensor.ref) calibrate();
    const att = attitudeFromUp(us, sensor.ref);
    tgt.pitch = att.pitch;
    tgt.roll = wrap180(att.roll - sensor.ref.r0);

    // heading of the "nose"
    let hdg = null;
    if (sensor.compass != null) {
      hdg = sensor.compass + th;
    } else if (sensor.R) {
      const nd = toDevice(att.n, th);
      const Rm = sensor.R;
      const wx = Rm[0] * nd[0] + Rm[1] * nd[1] + Rm[2] * nd[2];
      const wy = Rm[3] * nd[0] + Rm[4] * nd[1] + Rm[5] * nd[2];
      if (Math.hypot(wx, wy) > 0.15) hdg = Math.atan2(wx, wy) * R2D;
    }
    if (hdg != null) {
      hdg = wrap360(hdg);
      const now = performance.now();
      if (sensor.lastHdg != null && sensor.yawRate == null) {
        const dt = (now - sensor.lastHdgT) / 1000;
        if (dt > 0.01) tgt.turn = clamp(wrap180(hdg - sensor.lastHdg) / dt, -30, 30);
      }
      sensor.lastHdg = hdg; sensor.lastHdgT = now;
      tgt.hdg = hdg;
    }
  }

  function onMotion(e) {
    sensor.gotMotion = true;
    if (mode !== 'sensor' || !sensor.up) return;
    const u = sensor.up;
    const rr = e.rotationRate;
    if (rr && rr.alpha != null) {
      // rotationRate: alpha about z, beta about x, gamma about y (deg/s)
      const wUp = rr.beta * u[0] + rr.gamma * u[1] + rr.alpha * u[2];
      sensor.yawRate = -wUp; // right turn positive
      tgt.turn = clamp(sensor.yawRate, -30, 30);
    }
    const g = e.accelerationIncludingGravity;
    if (g && g.x != null) {
      const dot = g.x * u[0] + g.y * u[1] + g.z * u[2];
      if (Math.abs(dot) > 3) sensor.accSign = dot > 0 ? 1 : -1; // iOS / Android sign differences
      const as = toScreen([g.x * sensor.accSign, g.y * sensor.accSign, g.z * sensor.accSign], screenAngle());
      sensor.lat = -as[0] / 9.81;
      const lat0 = sensor.ref ? sensor.ref.lat0 : 0;
      tgt.slip = clamp(sensor.lat - lat0, -1, 1);
    }
  }

  function attachSensors() {
    if (sensor.attached) return;
    sensor.attached = true;
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', e => onOrientation(e, true));
    }
    window.addEventListener('deviceorientation', e => onOrientation(e, !!e.absolute));
    window.addEventListener('devicemotion', onMotion);
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (_) { /* ignore */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && mode === 'sensor') keepAwake(); });

  function enableSensors() {
    const hasDO = typeof window.DeviceOrientationEvent !== 'undefined';
    if (!hasDO) { toast('この端末/ブラウザはセンサーに対応していません。デモモードで表示します'); startDemo(); return; }
    if (!window.isSecureContext) toast('センサーの利用にはHTTPS接続が必要です');
    // iOS 13+: permission must be requested synchronously inside the user gesture
    const reqs = [];
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') reqs.push(DeviceOrientationEvent.requestPermission());
      if (typeof window.DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') reqs.push(DeviceMotionEvent.requestPermission());
    } catch (err) { /* ignore */ }
    Promise.all(reqs.map(p => p.catch(() => 'denied'))).then(res => {
      if (res.length && res[0] !== 'granted') {
        toast('センサーの使用が許可されませんでした。Safariを再起動して再度お試しください', 5000);
        startDemo();
        return;
      }
      attachSensors();
      sensor.ref = null;
      setMode('sensor');
      hideOverlay();
      keepAwake();
      if (sensor.up) calibrate();
      setTimeout(() => {
        if (mode === 'sensor' && !sensor.gotOrientation) {
          toast('センサーのデータを受信できませんでした（PCなど）。デモモードに切り替えます', 4500);
          startDemo();
        }
      }, 2000);
    });
  }

  // ---------- GPS ----------
  const gps = {
    on: false, watchId: null, fix: false, lastFixAt: 0, acc: null, altAcc: null,
    speedKt: null, speedSrc: '', track: null,
    altFt: null, vFpm: 0, altInit: false, last: null, errMsg: '',
  };
  const M2FT = 3.28084, MS2KT = 1.943844;
  function haversine(a, b) {
    const R = 6371008.8, la1 = a.lat * D2R, la2 = b.lat * D2R;
    const dLa = la2 - la1, dLo = (b.lon - a.lon) * D2R;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function bearing(a, b) {
    const la1 = a.lat * D2R, la2 = b.lat * D2R, dLo = (b.lon - a.lon) * D2R;
    const y = Math.sin(dLo) * Math.cos(la2);
    const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLo);
    return wrap360(Math.atan2(y, x) * R2D);
  }
  const num_ = v => typeof v === 'number' && isFinite(v);

  function onGpsPosition(pos) {
    const c = pos.coords;
    const t = num_(pos.timestamp) ? pos.timestamp : Date.now();
    const cur = { lat: c.latitude, lon: c.longitude, t, acc: c.accuracy };
    gps.fix = true; gps.lastFixAt = performance.now(); gps.errMsg = '';
    gps.acc = num_(c.accuracy) ? c.accuracy : null;
    gps.altAcc = num_(c.altitudeAccuracy) ? c.altitudeAccuracy : null;

    // --- ground speed ---
    let spd = null;
    const prev = gps.last;
    const dt = prev ? (t - prev.t) / 1000 : 0;
    if (num_(c.speed) && c.speed >= 0) { spd = c.speed * MS2KT; gps.speedSrc = 'GPS'; }
    else if (prev && dt >= 0.8) {
      const d = haversine(prev, cur);
      // ignore jitter smaller than the position uncertainty
      const noise = Math.min(prev.acc || 0, cur.acc || 0) * 0.5;
      spd = (d > noise ? d : 0) / dt * MS2KT; gps.speedSrc = '位置差分';
    }
    if (spd != null) gps.speedKt = gps.speedKt == null ? spd : gps.speedKt + (spd - gps.speedKt) * 0.5;

    // --- track ---
    if (gps.speedKt != null && gps.speedKt > 3) {
      if (num_(c.heading)) gps.track = wrap360(c.heading);
      else if (prev && haversine(prev, cur) > Math.max(3, (cur.acc || 0) * 0.5)) gps.track = bearing(prev, cur);
    } else gps.track = null;

    // --- altitude: alpha-beta filter (position + vertical velocity) ---
    if (num_(c.altitude)) {
      const z = c.altitude * M2FT;
      if (!gps.altInit || !prev || dt <= 0 || dt > 30) {
        gps.altFt = z; gps.vFpm = 0; gps.altInit = true;
      } else {
        const ds = Math.max(dt, 0.2);
        const pred = gps.altFt + gps.vFpm / 60 * ds;
        const r = z - pred;
        gps.altFt = pred + 0.35 * r;
        gps.vFpm = clamp(gps.vFpm + 0.08 * r / ds * 60, -8000, 8000);
      }
      gps.hasAlt = true;
    } else gps.hasAlt = false;

    if (!prev || dt >= 0.8 || !num_(c.speed)) gps.last = cur;
  }

  function onGpsError(err) {
    if (err.code === 1) {
      toast('位置情報の利用が許可されませんでした。ブラウザ・端末の設定で位置情報を許可してください', 5500);
      gps.errMsg = '許可されていません';
      stopGps();
    } else if (gps.fix) {
      // transient error while we still have a recent fix: ignore
    } else if (err.code === 2) {
      gps.errMsg = '現在地を取得できません（屋外・窓際で試してください）';
      if (!gps.warned) { gps.warned = true; toast('GPSの電波を受信できません。屋外や窓際で試してください', 4000); }
    } else {
      gps.errMsg = '測位待ち（タイムアウト）';
    }
  }

  function startGps() {
    if (gps.on) return;
    if (!('geolocation' in navigator)) { toast('このブラウザは位置情報（GPS）に対応していません'); return; }
    if (!window.isSecureContext) { toast('GPSの利用にはHTTPS接続が必要です'); return; }
    gps.on = true; gps.fix = false; gps.last = null; gps.speedKt = null; gps.track = null; gps.altInit = false; gps.hasAlt = false; gps.errMsg = ''; gps.warned = false;
    try {
      gps.watchId = navigator.geolocation.watchPosition(onGpsPosition, onGpsError, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    } catch (e) { gps.on = false; toast('GPSを開始できませんでした'); }
    updateGpsButton();
    if (gps.on) toast('GPSを開始しました。測位まで少し待ってください（屋外推奨）');
  }
  function stopGps() {
    if (gps.watchId != null) { try { navigator.geolocation.clearWatch(gps.watchId); } catch (_) { /* ignore */ } }
    gps.watchId = null; gps.on = false; gps.fix = false;
    updateGpsButton();
  }
  function updateGpsButton() {
    if (!el.btnGps) return;
    el.btnGps.classList.toggle('on', gps.on);
    el.btnGps.textContent = gps.on ? (gps.fix && gps.acc != null ? `📡 ±${Math.round(gps.acc)}m` : '📡 測位中…') : '📡 GPS';
  }
  const gpsLive = () => gps.on && gps.fix;

  function startDemo() { setMode('demo'); hideOverlay(); }
  function hideOverlay() { $('overlay').classList.add('hidden'); }
  function showOverlay() { $('overlay').classList.remove('hidden'); }

  // ---------- manual controls ----------
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (mode === 'sensor') return;
    drag = { x: e.clientX, y: e.clientY, p: mode === 'manual' ? manual.pitch : tgt.pitch, r: mode === 'manual' ? manual.roll : tgt.roll };
    if (mode !== 'manual') setMode('manual');
    manual.pitch = drag.p; manual.roll = drag.r;
    stage.classList.add('dragging');
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const scale = 300 / Math.max(300, Math.min(window.innerWidth, window.innerHeight));
    manual.roll = clamp(drag.r + (e.clientX - drag.x) * 0.25 * scale * 1.6, -75, 75);
    manual.pitch = clamp(drag.p - (e.clientY - drag.y) * 0.12 * scale * 1.6, -25, 25);
  });
  const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  const keys = new Set();
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (mode === 'sensor') return;
      if (mode !== 'manual') setMode('manual');
      keys.add(e.key);
    } else if (e.key === ' ') {
      e.preventDefault(); calibrate();
    } else if (e.key === 'd' || e.key === 'D') {
      startDemo();
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.key));
  window.addEventListener('blur', () => keys.clear());

  // ---------- buttons ----------
  const wantGps = () => $('ovGps') && $('ovGps').checked;
  $('ovSensor').addEventListener('click', () => { enableSensors(); if (wantGps()) startGps(); });
  $('btnGps').addEventListener('click', () => { if (gps.on) { stopGps(); toast('GPSを停止しました（シミュレーションに戻ります）'); } else startGps(); });
  $('btnSensor').addEventListener('click', enableSensors);
  $('ovDemo').addEventListener('click', () => { if (wantGps()) startGps(); startDemo(); });
  $('btnDemo').addEventListener('click', startDemo);
  $('btnCal').addEventListener('click', calibrate);
  $('btnHelp').addEventListener('click', showOverlay);
  const fsTarget = document.documentElement;
  if (!(fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen)) $('btnFull').style.display = 'none';
  $('btnFull').addEventListener('click', () => {
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    else (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget).catch?.(() => {});
  });

  const note = [];
  if (!window.isSecureContext) note.push('※ センサーの利用にはHTTPS接続が必要です（現在HTTPSではありません）。');
  if (typeof window.DeviceOrientationEvent === 'undefined') note.push('※ このブラウザはモーションセンサーに対応していません。デモ/マウス操作をお使いください。');
  $('ovNote').textContent = note.join(' ');

  // ---------- simulation loop ----------
  let last = performance.now();
  function smooth(cur, target, dt, tau) { return cur + (target - cur) * (1 - Math.exp(-dt / tau)); }

  function step(now) {
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;

    if (mode === 'demo' || mode === 'idle') {
      demoT += dt;
      const t = demoT;
      tgt.pitch = 7 * Math.sin(t * 0.21) + 2.5 * Math.sin(t * 0.67 + 1);
      tgt.roll = 28 * Math.sin(t * 0.13) + 8 * Math.sin(t * 0.41 + 2);
      tgt.slip = 0.12 * Math.sin(t * 0.9);
    } else if (mode === 'manual') {
      if (keys.has('ArrowLeft')) manual.roll -= 45 * dt;
      if (keys.has('ArrowRight')) manual.roll += 45 * dt;
      if (keys.has('ArrowUp')) manual.pitch += 12 * dt;
      if (keys.has('ArrowDown')) manual.pitch -= 12 * dt;
      manual.roll = clamp(manual.roll, -75, 75);
      manual.pitch = clamp(manual.pitch, -25, 25);
      tgt.pitch = manual.pitch; tgt.roll = manual.roll;
      // a bit of adverse yaw from roll rate
      tgt.slip = clamp((manual.roll - st.roll) * -0.02, -0.5, 0.5);
    }
    if (mode !== 'sensor') {
      // coordinated turn: rate = g*tan(bank)/V
      const v = Math.max(st.ias, 40) * 0.5144;
      const rate = clamp(9.81 * Math.tan(clamp(st.roll, -80, 80) * D2R) / v * R2D, -25, 25);
      tgt.turn = rate;
      tgt.hdg = wrap360(tgt.hdg + rate * dt);
    }

    // GPS: stale fix detection & ground track overrides heading
    if (gps.on && gps.fix && performance.now() - gps.lastFixAt > 12000) { gps.fix = false; gps.errMsg = '信号が途絶えました'; }
    const useTrack = gpsLive() && gps.track != null && gps.speedKt != null && gps.speedKt > 3;
    if (useTrack) tgt.hdg = gps.track;
    hdgSource = useTrack ? 'GPS TRK' : mode === 'sensor' ? (sensor.compass != null || sensor.absolute ? 'COMPASS' : 'GYRO (REL)') : 'SIM';

    const tau = mode === 'sensor' ? 0.12 : 0.25;
    st.pitch = smooth(st.pitch, tgt.pitch, dt, tau);
    st.roll = st.roll + wrap180(tgt.roll - st.roll) * (1 - Math.exp(-dt / tau));
    st.hdg = wrap360(st.hdg + wrap180(tgt.hdg - st.hdg) * (1 - Math.exp(-dt / (mode === 'sensor' ? 0.25 : 0.05))));
    st.turn = smooth(st.turn, tgt.turn, dt, 0.35);
    st.slip = smooth(st.slip, tgt.slip, dt, 0.3);

    // flight model (fun, not certified!)
    const p = clamp(st.pitch, -40, 40);
    const bankLoss = 1 / Math.max(0.35, Math.cos(clamp(st.roll, -70, 70) * D2R));
    const iasTarget = clamp(105 - 3.6 * p - (bankLoss - 1) * 12, 35, 195);
    const gsLive = gpsLive() && gps.speedKt != null;
    st.ias = gsLive ? smooth(st.ias, gps.speedKt, dt, 0.6) : smooth(st.ias, iasTarget, dt, p > 0 ? 3.5 : 2.5);
    const altLive = gpsLive() && gps.hasAlt;
    if (altLive) {
      // extrapolate filtered GPS altitude between fixes, then smooth for display
      const since = (performance.now() - gps.lastFixAt) / 1000;
      const altNow = gps.altFt + gps.vFpm / 60 * Math.min(since, 2);
      st.alt = smooth(st.alt, altNow, dt, 0.5);
      st.vsi = smooth(st.vsi, gps.vFpm, dt, 0.8);
      render();
      requestAnimationFrame(step);
      return;
    }
    const sink = (bankLoss - 1) * 250; // steep turns sink a bit
    let vsTrue = st.ias * 101.27 * Math.sin(p * D2R) * 0.9 - sink;
    if (st.alt <= 0 && vsTrue < 0) vsTrue = 0;
    st.vsi = smooth(st.vsi, vsTrue, dt, 1.2);
    st.alt = Math.max(0, st.alt + vsTrue / 60 * dt);
    if (st.alt <= 0 && st.vsi < 0) st.vsi = smooth(st.vsi, 0, dt, 0.3);

    render();
    requestAnimationFrame(step);
  }

  let roTimer = 0, hdgSource = 'SIM', lastSrcKey = '';
  function setSrc(node, txt, color) {
    if (!txt) { node.style.display = 'none'; return; }
    node.style.display = ''; node.textContent = txt; node.style.fill = color;
  }
  function renderSources() {
    const gsLive = gpsLive() && gps.speedKt != null;
    const altLive = gpsLive() && gps.hasAlt;
    const key = [gps.on, gsLive, altLive, hdgSource, gsLive ? Math.round(gps.speedKt) : 0].join('|');
    if (key === lastSrcKey) return;
    lastSrcKey = key;
    el.asiLabel.textContent = gsLive ? 'GROUND SPEED' : 'AIRSPEED';
    el.asiLabel.setAttribute('font-size', gsLive ? '9.5' : '11');
    el.asiCap.textContent = gsLive ? '対地速度計 GS（GPS）' : '速度計 ASI';
    el.asiGS.style.display = gps.on ? '' : 'none';
    el.asiGSTxt.textContent = gsLive ? `GS ${Math.round(gps.speedKt)}` : 'GS ---';
    setSrc(el.altSrc, gps.on ? (altLive ? 'GPS ALT' : 'SIM（GPS高度なし）') : '', altLive ? '#7fe07f' : '#f0b24a');
    setSrc(el.vsiSrc, gps.on ? (altLive ? 'GPS' : 'SIM') : '', altLive ? '#7fe07f' : '#f0b24a');
    setSrc(el.hiSrc, hdgSource, hdgSource === 'GPS TRK' ? '#7fe07f' : hdgSource === 'SIM' ? '#aaa' : '#8fc8ff');
  }
  function render() {
    renderSources();
    el.asi.setAttribute('transform', `rotate(${f(asiAngle(st.ias))})`);
    const pp = clamp(st.pitch, -45, 45);
    el.aiCard.setAttribute('transform', `rotate(${f(-st.roll)}) translate(0 ${f(pp * AI_K)})`);
    el.aiRing.setAttribute('transform', `rotate(${f(-st.roll)})`);
    el.alt100.setAttribute('transform', `rotate(${f((st.alt % 1000) / 1000 * 360)})`);
    el.alt1k.setAttribute('transform', `rotate(${f((st.alt % 10000) / 10000 * 360)})`);
    el.alt10k.setAttribute('transform', `rotate(${f((st.alt % 100000) / 100000 * 360)})`);
    const tcA = clamp(st.turn / 3 * 20, -38, 38);
    el.tcPlane.setAttribute('transform', `rotate(${f(tcA)})`);
    const ballA = clamp(st.slip * 40, -15, 15) * D2R;
    el.tcBall.setAttribute('cx', f(100 * Math.sin(ballA)));
    el.tcBall.setAttribute('cy', f(-40 + 100 * Math.cos(ballA)));
    el.hiCard.setAttribute('transform', `rotate(${f(-st.hdg)})`);
    el.vsi.setAttribute('transform', `rotate(${f(vsiAngle(st.vsi))})`);

    const now = performance.now();
    if (now - roTimer > 150) {
      roTimer = now;
      const hdgSrc = hdgSource === 'GPS TRK' ? '（GPS航跡）' : mode === 'sensor'
        ? (sensor.compass != null ? '（コンパス）' : sensor.absolute ? '（磁北）' : '（相対）')
        : '';
      el.readout.textContent =
        `[${el.badge.textContent}] ピッチ ${st.pitch.toFixed(1).padStart(6)}°  バンク ${st.roll.toFixed(1).padStart(6)}°\n` +
        `方位 ${String(Math.round(st.hdg) % 360).padStart(3, '0')}°${hdgSrc}  旋回 ${st.turn.toFixed(1)}°/s\n` +
        `速度 ${Math.round(st.ias)}kt  高度 ${Math.round(st.alt)}ft  昇降 ${Math.round(st.vsi)}fpm` +
        (gps.on ? '\n' + gpsStatusLine() : '');
      updateGpsButton();
    }
  }

  function gpsStatusLine() {
    if (!gps.fix) return `GPS: ${gps.errMsg || '測位中…'}  （速度・高度はシミュレーション）`;
    const live = gps.speedKt != null ? `速度=GPS(${gps.speedSrc})` : '速度=SIM';
    const alt = gps.hasAlt ? `高度=GPS${gps.altAcc != null ? ' ±' + Math.round(gps.altAcc) + 'm' : ''}` : '高度=SIM(GPS高度なし)';
    return `GPS: 測位OK ±${gps.acc != null ? Math.round(gps.acc) : '?'}m  ${live}  ${alt}  方位=${hdgSource}`;
  }
  window.__flightInstruments = { st, tgt, sensor, gps }; // for debugging
  setMode('idle');
  requestAnimationFrame(t => { last = t; step(t); });
})();
