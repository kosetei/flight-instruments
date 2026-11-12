/* グラスコックピット表示（PFD + ND）。app.js の共有状態を読んで描画するだけ。 */
(() => {
  'use strict';
  const FI = window.__flightInstruments;
  if (!FI) return;
  const st = FI.st, gps = FI.gps;
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap360 = a => ((a % 360) + 360) % 360;
  const wrap180 = a => { a = wrap360(a); return a > 180 ? a - 360 : a; };
  const f = n => (Math.round(n * 100) / 100).toString();
  const $ = id => document.getElementById(id);
  const pad = (n, w) => String(n).padStart(w, '0');

  const C = {
    w: '#f4f4f4', g: '#36e05c', c: '#2fd6ff', m: '#ff52ff', a: '#ffb000', gr: '#8d939b',
    tape: '#39404a', sky: '#1b79d0', gnd: '#8a5226', red: '#ff3b30', bg: '#000',
  };
  const T = (x, y, txt, size, fill, anchor = 'middle', extra = '') =>
    `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central"${extra ? ' ' + extra : ''}>${txt}</text>`;
  const L = (x1, y1, x2, y2, stroke, w = 1.5, extra = '') =>
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
  // polar around (cx,cy), angle clockwise from up
  const P = (cx, cy, r, a) => [cx + r * Math.sin(a * D2R), cy - r * Math.cos(a * D2R)];
  function arc(cx, cy, r, a0, a1) {
    const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1);
    return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f(x1)} ${f(y1)}`;
  }

  // ---------------- PFD ----------------
  const CX = 200, CY = 150, KP = 3.4, KS = 2.4, KA = 0.28;
  const TT = 40, TB = 260; // tape top / bottom
  const vsPx = v => {
    const a = Math.abs(v), s = Math.sign(v);
    const px = a <= 1000 ? a / 1000 * 48 : a <= 2000 ? 48 + (a - 1000) / 1000 * 24 : 72 + (Math.min(a, 6000) - 2000) / 4000 * 22;
    return s * px;
  };

  function pfdSVG() {
    let ladder = '';
    for (let p = -40; p <= 40; p += 2.5) {
      if (!p) continue;
      const y = -p * KP, ten = p % 10 === 0, five = p % 5 === 0;
      const w = ten ? 32 : five ? 17 : 7;
      ladder += L(-w, y, w, y, C.w, ten ? 1.6 : 1.2);
      if (ten) ladder += T(-w - 11, y, Math.abs(p), 10, C.w) + T(w + 11, y, Math.abs(p), 10, C.w);
    }
    let bank = '';
    for (const a of [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]) {
      const long = Math.abs(a) === 30 || Math.abs(a) === 60;
      const [x0, y0] = P(CX, CY, 100, a), [x1, y1] = P(CX, CY, long ? 111 : 106, a);
      bank += L(x0, y0, x1, y1, C.w, 1.6);
    }
    let vsTicks = '';
    for (const v of [-6000, -2000, -1500, -1000, -500, 500, 1000, 1500, 2000, 6000]) {
      const y = CY - vsPx(v), big = [1000, 2000, 6000].includes(Math.abs(v));
      vsTicks += L(364, y, big ? 371 : 368, y, C.w, big ? 1.6 : 1.1);
      if (big) vsTicks += T(376, y, Math.abs(v) / 1000, 9, C.w);
    }
    vsTicks += L(362, CY, 374, CY, C.w, 2.5);
    let fma = '';
    for (let i = 0; i < 5; i++) {
      if (i) fma += L(i * 80, 3, i * 80, 25, '#555', 1);
      fma += T(i * 80 + 40, 14, '', 11, C.w, 'middle', `id="fma${i}"`);
    }
    let rose = '';
    for (let d = 0; d < 360; d += 5) {
      const big = d % 10 === 0;
      const [x0, y0] = P(200, 368, 76, d), [x1, y1] = P(200, 368, big ? 68 : 72, d);
      rose += L(x0, y0, x1, y1, C.w, big ? 1.5 : 1);
      if (d % 30 === 0) {
        const lbl = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || d / 10;
        rose += `<text transform="rotate(${d} 200 368)" x="200" y="${368 - 59}" font-size="11" fill="${C.w}" text-anchor="middle" dominant-baseline="central">${lbl}</text>`;
      }
    }
    return `
    <defs>
      <clipPath id="gAttClip"><rect x="108" y="${TT}" width="184" height="${TB - TT}" rx="14"/></clipPath>
      <clipPath id="gSpdClip"><rect x="40" y="${TT}" width="60" height="${TB - TT}"/></clipPath>
      <clipPath id="gAltClip"><rect x="300" y="${TT}" width="60" height="${TB - TT}"/></clipPath>
      <clipPath id="gVsClip"><rect x="362" y="${CY - 100}" width="38" height="200"/></clipPath>
      <clipPath id="gSpdRollClip"><rect x="74" y="${CY - 13}" width="14" height="26"/></clipPath>
      <clipPath id="gAltRollClip"><rect x="340" y="${CY - 15}" width="21" height="30"/></clipPath>
      <pattern id="gBarber" width="5" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${C.red}"/><rect y="5" width="5" height="5" fill="#000"/></pattern>
    </defs>
    <rect width="400" height="360" fill="${C.bg}"/>
    <g clip-path="url(#gAttClip)">
      <g id="gAtt">
        <rect x="-400" y="-800" width="800" height="800" fill="${C.sky}"/>
        <rect x="-400" y="0" width="800" height="800" fill="${C.gnd}"/>
        <line x1="-400" y1="0" x2="400" y2="0" stroke="${C.w}" stroke-width="1.8"/>
        ${ladder}
      </g>
      <g id="gFpv">
        <circle r="5.5" fill="none" stroke="${C.g}" stroke-width="1.8"/>
        ${L(-17, 0, -5.5, 0, C.g, 1.8)}${L(5.5, 0, 17, 0, C.g, 1.8)}${L(0, -5.5, 0, -11, C.g, 1.8)}
      </g>
    </g>
    ${bank}
    <path d="M${CX} ${CY - 101} L${CX - 7} ${CY - 112} L${CX + 7} ${CY - 112} Z" fill="${C.w}"/>
    <g id="gBankG">
      <path id="gBankPtr" d="M${CX} ${CY - 99} L${CX - 8} ${CY - 87} L${CX + 8} ${CY - 87} Z" fill="none" stroke="${C.w}" stroke-width="1.8"/>
      <path id="gSlip" d="M${CX - 9} ${CY - 85} H${CX + 9} L${CX + 11} ${CY - 79} H${CX - 11} Z" fill="none" stroke="${C.w}" stroke-width="1.8"/>
    </g>
    <g stroke="${C.w}" stroke-width="2" fill="#000">
      <path d="M${CX - 62} ${CY - 3.5} H${CX - 24} V${CY + 13} H${CX - 31} V${CY + 3.5} H${CX - 62} Z"/>
      <path d="M${CX + 62} ${CY - 3.5} H${CX + 24} V${CY + 13} H${CX + 31} V${CY + 3.5} H${CX + 62} Z"/>
      <rect x="${CX - 4}" y="${CY - 4}" width="8" height="8"/>
    </g>

    <!-- speed tape -->
    <rect x="40" y="${TT}" width="60" height="${TB - TT}" fill="${C.tape}"/>
    <g clip-path="url(#gSpdClip)">
      <g id="gSpdTape"></g>
      <line id="gSpdTrend" x1="99" y1="${CY}" x2="99" y2="${CY}" stroke="${C.g}" stroke-width="2"/>
      <path id="gSpdTrendHead" d="M95 0 L99 -7 L103 0" fill="none" stroke="${C.g}" stroke-width="2"/>
    </g>
    <path d="M36 ${CY - 14} H88 V${CY - 6} L97 ${CY} L88 ${CY + 6} V${CY + 14} H36 Z" fill="#000" stroke="${C.w}" stroke-width="1.6"/>
    ${T(73, CY + 0.5, '', 19, C.w, 'end', 'id="gSpdHi"')}
    <g clip-path="url(#gSpdRollClip)"><g id="gSpdRoll">${[-1, 0, 1, 2].map(k => T(81, CY - k * 18 + 0.5, '', 19, C.w, 'middle', `id="gSpdR${k + 1}"`)).join('')}</g></g>
    ${T(70, 273, '', 12, C.g, 'middle', 'id="gSpdBot"')}
    ${T(70, 32, '', 10, C.w, 'middle', 'id="gSpdTop"')}
    ${T(16, 288, '', 11, C.g, 'start', 'id="gN1"')}

    <!-- altitude tape -->
    <rect x="300" y="${TT}" width="60" height="${TB - TT}" fill="${C.tape}"/>
    <g clip-path="url(#gAltClip)"><g id="gAltTape"></g></g>
    <path d="M296 ${CY} L304 ${CY - 7} V${CY - 16} H362 V${CY + 16} H304 V${CY + 7} Z" fill="#000" stroke="${C.w}" stroke-width="1.6"/>
    ${T(328, CY + 0.5, '', 19, C.w, 'end', 'id="gAltHi"')}
    ${T(334, CY + 1, '', 15, C.w, 'middle', 'id="gAltH"')}
    <g clip-path="url(#gAltRollClip)"><g id="gAltRoll">${[-1, 0, 1, 2].map(k => T(350, CY - k * 13 + 1, '', 12, C.w, 'middle', `id="gAltR${k + 1}"`)).join('')}</g></g>
    ${T(330, 273, '', 11, C.g, 'middle', 'id="gAltBot"')}
    ${T(330, 32, '', 10, C.w, 'middle', 'id="gAltTop"')}

    <!-- vertical speed -->
    <path d="M362 ${CY - 100} H378 L398 ${CY - 70} V${CY + 70} L378 ${CY + 100} H362 Z" fill="#2a2f36"/>
    ${vsTicks}
    <g clip-path="url(#gVsClip)"><line id="gVsPtr" x1="430" y1="${CY}" x2="364" y2="${CY}" stroke="${C.w}" stroke-width="2.4"/></g>
    ${T(381, 0, '', 11, C.w, 'middle', 'id="gVsTxt"')}

    <!-- heading -->
    <g id="gRose"><circle cx="200" cy="368" r="76" fill="#2a2f36" stroke="${C.gr}" stroke-width="1"/>${rose}</g>
    <path id="gTrend" d="" fill="none" stroke="${C.g}" stroke-width="3"/>
    <path id="gTrk" d="M200 290 l-4 -7 l4 -7 l4 7 Z" fill="none" stroke="${C.g}" stroke-width="1.6"/>
    <path d="M200 293 L195 284 H205 Z" fill="${C.w}"/>
    <rect x="180" y="266" width="40" height="18" fill="#000" stroke="${C.w}" stroke-width="1.4"/>
    ${T(200, 275.5, '', 13, C.w, 'middle', 'id="gHdgTxt"')}
    ${T(226, 275.5, '', 9, C.g, 'start', 'id="gHdgSrc"')}
    ${T(174, 275.5, '', 9, C.g, 'end', 'id="gTurnTxt"')}

    <!-- FMA -->
    <rect x="0" y="0" width="400" height="28" fill="#000"/>
    <line x1="0" y1="28" x2="400" y2="28" stroke="#444"/>
    ${fma}`;
  }

  // ---------------- ND ----------------
  const AX = 200, AY = 300, R = 215;
  function ndSVG() {
    let rose = '';
    for (let d = 0; d < 360; d += 5) {
      const big = d % 10 === 0;
      const [x0, y0] = P(AX, AY, R, d), [x1, y1] = P(AX, AY, R - (big ? 13 : 7), d);
      rose += L(x0, y0, x1, y1, C.w, big ? 1.6 : 1.1);
      if (d % 30 === 0) {
        rose += `<text transform="rotate(${d} ${AX} ${AY})" x="${AX}" y="${AY - R + 24}" font-size="${d % 90 === 0 ? 15 : 13}" fill="${C.w}" text-anchor="middle" dominant-baseline="central">${{ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || d / 10}</text>`;
      } else if (d % 10 === 0) {
        rose += `<text transform="rotate(${d} ${AX} ${AY})" x="${AX}" y="${AY - R + 22}" font-size="9" fill="${C.gr}" text-anchor="middle" dominant-baseline="central">${d / 10}</text>`;
      }
    }
    return `
    <defs>
      <clipPath id="gNdClip"><circle cx="${AX}" cy="${AY}" r="${R}"/></clipPath>
    </defs>
    <rect width="400" height="360" fill="${C.bg}"/>
    <g id="gNdRose">${rose}</g>
    <path d="${arc(AX, AY, R / 2, -62, 62)}" fill="none" stroke="${C.w}" stroke-opacity=".45" stroke-width="1" stroke-dasharray="4 5"/>
    ${T(AX - R / 2 * Math.sin(62 * D2R) - 4, AY - R / 2 * Math.cos(62 * D2R) - 8, '', 10, C.c, 'end', 'id="gNdHalf"')}
    <g clip-path="url(#gNdClip)">
      <polyline id="gNdTrail" points="" fill="none" stroke="${C.c}" stroke-width="2" stroke-linejoin="round" stroke-opacity=".9"/>
      <g id="gNdStart"><circle r="5" fill="none" stroke="${C.m}" stroke-width="2"/>${L(-8, 0, 8, 0, C.m, 1.5)}${L(0, -8, 0, 8, C.m, 1.5)}</g>
      <line id="gNdTrk" x1="${AX}" y1="${AY}" x2="${AX}" y2="${AY - R}" stroke="${C.g}" stroke-width="1.4" stroke-dasharray="6 5"/>
      <polyline id="gNdPred" points="" fill="none" stroke="${C.w}" stroke-width="2" stroke-dasharray="7 4"/>
    </g>
    <path d="M${AX} ${AY - R + 1} L${AX - 7} ${AY - R - 11} H${AX + 7} Z" fill="${C.w}"/>
    <rect x="${AX - 30}" y="${AY - R - 34}" width="60" height="20" fill="#000" stroke="${C.w}" stroke-width="1.4"/>
    ${T(AX, AY - R - 23.5, '', 14, C.w, 'middle', 'id="gNdHdg"')}
    ${T(AX + 36, AY - R - 23.5, '', 10, C.g, 'start', 'id="gNdHdgSrc"')}
    <path d="M${AX} ${AY - 13} L${AX - 9} ${AY + 9} L${AX} ${AY + 4} L${AX + 9} ${AY + 9} Z" fill="none" stroke="${C.w}" stroke-width="2"/>
    ${T(10, 18, '', 12, C.w, 'start', 'id="gNdSpd"')}
    ${T(10, 36, '', 10, C.gr, 'start', 'id="gNdSpd2"')}
    ${T(390, 18, '', 11, C.g, 'end', 'id="gNdGps"')}
    ${T(390, 36, '', 10, C.gr, 'end', 'id="gNdPos"')}
    ${T(10, 344, '', 11, C.m, 'start', 'id="gNdStartTxt"')}
    ${T(390, 344, '', 11, C.c, 'end', 'id="gNdRng" style="cursor:pointer"')}
    <rect id="gNdRngHit" x="290" y="320" width="110" height="40" fill="transparent" style="cursor:pointer"/>`;
  }

  // ---------------- DOM ----------------
  const stage = $('stage'), panel = $('panel');
  stage.insertAdjacentHTML('beforeend', `
    <div id="glass" hidden>
      <svg id="pfd" class="gsvg" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" aria-label="PFD 主飛行表示">${pfdSVG()}</svg>
      <svg id="nd" class="gsvg" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" aria-label="ND 航法表示">${ndSVG()}</svg>
    </div>`);
  const glass = $('glass');
  const E = {};
  ['gAtt', 'gFpv', 'gBankG', 'gBankPtr', 'gSlip', 'gSpdTape', 'gSpdTrend', 'gSpdTrendHead', 'gSpdHi', 'gSpdRoll', 'gSpdBot', 'gSpdTop', 'gN1',
    'gAltTape', 'gAltHi', 'gAltH', 'gAltRoll', 'gAltBot', 'gAltTop', 'gVsPtr', 'gVsTxt', 'gRose', 'gTrend', 'gTrk', 'gHdgTxt', 'gHdgSrc', 'gTurnTxt',
    'gNdRose', 'gNdHalf', 'gNdTrail', 'gNdStart', 'gNdTrk', 'gNdPred', 'gNdHdg', 'gNdHdgSrc', 'gNdSpd', 'gNdSpd2', 'gNdGps', 'gNdPos',
    'gNdStartTxt', 'gNdRng', 'gNdRngHit', 'fma0', 'fma1', 'fma2', 'fma3', 'fma4'].forEach(id => { E[id] = $(id); });
  const spdR = [0, 1, 2, 3].map(i => $('gSpdR' + i)), altR = [0, 1, 2, 3].map(i => $('gAltR' + i));

  // cache text writes to avoid DOM churn
  const tc = new Map();
  function txt(node, s, fill) {
    const prev = tc.get(node);
    const key = s + '|' + (fill || '');
    if (prev === key) return;
    tc.set(node, key);
    node.textContent = s;
    if (fill) node.setAttribute('fill', fill);
  }
  const setT = (node, t) => node.setAttribute('transform', t);

  // ---------------- tapes ----------------
  let spdBase = null, altBase = null;
  function buildSpd(base) {
    let s = '';
    const lo = Math.max(30, base - 200), hi = base + 200;
    for (let v = lo; v <= hi; v += 10) {
      const y = -v * KS;
      s += L(89, y, 100, y, C.w, 1.5);
      if (v % 20 === 0) s += T(84, y, v, 12, C.w, 'end');
    }
    const top = Math.max(350, lo), bot = hi;
    if (bot > 350) s += `<rect x="95" y="${f(-bot * KS)}" width="5" height="${f((bot - top) * KS)}" fill="url(#gBarber)"/>`;
    E.gSpdTape.innerHTML = s;
  }
  function buildAlt(base) {
    let s = '';
    for (let v = Math.max(-1000, base - 2000); v <= base + 2000; v += 100) {
      const y = -v * KA;
      s += L(300, y, 310, y, C.w, v % 500 === 0 ? 1.8 : 1.2);
      if (v % 200 === 0) s += T(314, y, v, 11, v % 1000 === 0 ? C.w : '#dfe3e8', 'start');
      if (v === 0) s += `<rect x="300" y="0" width="60" height="${f(1000 * KA)}" fill="${C.a}" fill-opacity=".25"/>`;
    }
    E.gAltTape.innerHTML = s;
  }

  // ---------------- ND trail ----------------
  const RANGES = [0.5, 1, 2, 5, 10, 20, 40, 80, 160, 320];
  let rangeSel = 'AUTO';
  try { const r = localStorage.getItem('fi.ndRange'); if (r) rangeSel = r === 'AUTO' ? 'AUTO' : Number(r); } catch (_) { /* ignore */ }
  const trail = { src: null, pts: [], pos: { x: 0, y: 0 }, ref: null, lastKey: '' };
  function cycleRange(e) {
    e.stopPropagation();
    const i = rangeSel === 'AUTO' ? -1 : RANGES.indexOf(rangeSel);
    rangeSel = i + 1 >= RANGES.length ? 'AUTO' : RANGES[i + 1];
    try { localStorage.setItem('fi.ndRange', String(rangeSel)); } catch (_) { /* ignore */ }
  }
  E.gNdRngHit.addEventListener('pointerdown', e => e.stopPropagation());
  E.gNdRngHit.addEventListener('click', cycleRange);

  function updateTrail(dt, gsKt, trk) {
    const live = FI.gpsLive() && gps.last && typeof gps.last.lat === 'number';
    const src = live ? 'gps' : 'sim';
    if (src !== trail.src) { trail.src = src; trail.pts = []; trail.pos = { x: 0, y: 0 }; trail.ref = null; trail.start = null; }
    if (live) {
      if (!trail.ref) trail.ref = { lat: gps.last.lat, lon: gps.last.lon, k: Math.cos(gps.last.lat * D2R) };
      trail.pos = { x: (gps.last.lon - trail.ref.lon) * 60 * trail.ref.k, y: (gps.last.lat - trail.ref.lat) * 60 };
    } else {
      const d = gsKt / 3600 * dt;
      trail.pos = { x: trail.pos.x + d * Math.sin(trk * D2R), y: trail.pos.y + d * Math.cos(trk * D2R) };
    }
    if (!trail.start) trail.start = { ...trail.pos };
    const last = trail.pts[trail.pts.length - 1];
    if (!last || Math.hypot(trail.pos.x - last.x, trail.pos.y - last.y) > 0.01) {
      trail.pts.push({ ...trail.pos });
      if (trail.pts.length > 1500) trail.pts.splice(0, trail.pts.length - 1500);
    }
  }

  // ---------------- render ----------------
  let lastT = performance.now(), prevSpd = null, accel = 0, ndTimer = 0;
  function render() {
    const now = performance.now();
    const dt = clamp((now - lastT) / 1000, 0.001, 0.2);
    lastT = now;
    const live = FI.gpsLive();
    const gsLive = live && gps.speedKt != null;
    const altLive = live && gps.hasAlt;
    const hdgSrc = FI.hdgSource;
    const mode = FI.mode;

    // ---- attitude ----
    const pitch = clamp(st.pitch, -60, 60), roll = st.roll;
    setT(E.gAtt, `translate(${CX} ${CY}) rotate(${f(-roll)}) translate(0 ${f(pitch * KP)})`);
    const gsMs = Math.max(st.ias, 1) * 0.5144;
    const fpa = clamp(Math.atan2(st.vsi * 0.00508, gsMs) / D2R, -30, 30);
    setT(E.gFpv, `translate(${CX} ${CY}) rotate(${f(-roll)}) translate(0 ${f((pitch - fpa) * KP)})`);
    setT(E.gBankG, `rotate(${f(-roll)} ${CX} ${CY})`);
    const bankWarn = Math.abs(roll) > 35;
    E.gBankPtr.setAttribute('stroke', bankWarn ? C.a : C.w);
    E.gBankPtr.setAttribute('fill', bankWarn ? C.a : 'none');
    setT(E.gSlip, `translate(${f(clamp(st.slip * 30, -16, 16))} 0)`);
    E.gSlip.setAttribute('stroke', Math.abs(st.slip) > 0.3 ? C.a : C.w);

    // ---- speed ----
    const spd = Math.max(0, st.ias);
    const b = Math.round(spd / 100) * 100;
    if (b !== spdBase) { spdBase = b; buildSpd(b); }
    setT(E.gSpdTape, `translate(0 ${f(CY + spd * KS)})`);
    if (prevSpd != null) accel += ((spd - prevSpd) / dt - accel) * (1 - Math.exp(-dt / 1.2));
    prevSpd = spd;
    const trend = clamp(accel * 10, -60, 60);
    if (Math.abs(trend) >= 2) {
      const y2 = CY - trend * KS;
      E.gSpdTrend.setAttribute('y2', f(y2));
      E.gSpdTrendHead.setAttribute('transform', `translate(0 ${f(y2)}) ${trend < 0 ? 'scale(1 -1)' : ''}`);
      E.gSpdTrend.style.display = E.gSpdTrendHead.style.display = '';
    } else E.gSpdTrend.style.display = E.gSpdTrendHead.style.display = 'none';
    const hi = Math.floor(spd / 10), ones = spd - hi * 10, d = Math.floor(ones), fr = ones - d;
    txt(E.gSpdHi, hi > 0 ? String(hi) : '');
    spdR.forEach((n, i) => txt(n, String((d + i - 1 + 10) % 10)));
    setT(E.gSpdRoll, `translate(0 ${f(fr * 18)})`);
    txt(E.gSpdTop, gsLive ? 'GS' : 'IAS', gsLive ? C.g : C.w);
    const tas = st.ias * (1 + 0.02 * Math.max(0, st.alt) / 1000);
    txt(E.gSpdBot, gsLive ? `GS ${Math.round(gps.speedKt)}` : `M .${pad(Math.round(clamp(tas / 661.5, 0, 0.99) * 1000), 3)}`, gsLive ? C.g : C.w);
    if (FI.throttleVisible && !FI.throttleVisible()) txt(E.gN1, '');
    else {
      const n1 = FI.n1FromThr ? FI.n1FromThr(FI.throttle) : 0;
      txt(E.gN1, `N1 ${n1.toFixed(1)}`, gsLive ? C.gr : C.g);
    }

    // ---- altitude ----
    const alt = st.alt;
    const ab = Math.round(alt / 1000) * 1000;
    if (ab !== altBase) { altBase = ab; buildAlt(ab); }
    setT(E.gAltTape, `translate(0 ${f(CY + alt * KA)})`);
    const a = Math.max(0, alt);
    const th = Math.floor(a / 1000), hd = Math.floor(a / 100) % 10, r = a % 100;
    const idx = Math.floor(r / 20), afr = (r - idx * 20) / 20;
    txt(E.gAltHi, th > 0 ? String(th) : '');
    txt(E.gAltH, String(hd));
    altR.forEach((n, i) => txt(n, pad((((idx + i - 1) % 5) + 5) % 5 * 20, 2)));
    setT(E.gAltRoll, `translate(0 ${f(afr * 13)})`);
    txt(E.gAltTop, altLive ? 'GPS ALT' : 'ALT', altLive ? C.g : C.w);
    txt(E.gAltBot, altLive ? 'GPS MSL' : gps.on ? 'SIM' : 'STD', altLive ? C.g : gps.on ? C.a : C.c);

    // ---- vertical speed ----
    const vs = st.vsi;
    E.gVsPtr.setAttribute('y2', f(CY - vsPx(vs)));
    if (Math.abs(vs) >= 400) {
      txt(E.gVsTxt, String(Math.round(Math.abs(vs) / 50) * 50));
      E.gVsTxt.setAttribute('y', vs > 0 ? CY - 110 : CY + 110);
      E.gVsTxt.style.display = '';
    } else E.gVsTxt.style.display = 'none';

    // ---- heading ----
    const hdg = wrap360(st.hdg);
    setT(E.gRose, `rotate(${f(-hdg)} 200 368)`);
    txt(E.gHdgTxt, pad(Math.round(hdg) % 360 || 360, 3));
    const srcLbl = hdgSrc === 'GPS TRK' ? 'TRK' : hdgSrc === 'COMPASS' ? 'MAG' : hdgSrc === 'SIM' ? 'SIM' : 'REL';
    txt(E.gHdgSrc, srcLbl, hdgSrc === 'GPS TRK' || hdgSrc === 'COMPASS' ? C.g : hdgSrc === 'SIM' ? C.w : C.a);
    const tpred = clamp(st.turn * 10, -60, 60);
    E.gTrend.setAttribute('d', Math.abs(tpred) > 1 ? arc(200, 368, 80, Math.min(0, tpred), Math.max(0, tpred)) : '');
    txt(E.gTurnTxt, Math.abs(st.turn) >= 0.5 ? `${st.turn > 0 ? 'R' : 'L'} ${Math.abs(st.turn).toFixed(1)}°/s` : '', C.g);
    const trkKnown = live && gps.track != null && hdgSrc !== 'GPS TRK';
    if (trkKnown) { setT(E.gTrk, `rotate(${f(wrap180(gps.track - hdg))} 200 368)`); E.gTrk.style.display = ''; }
    else E.gTrk.style.display = 'none';

    // ---- FMA ----
    txt(E.fma0, gsLive ? 'GPS GS' : 'SIM SPD', gsLive ? C.g : gps.on ? C.a : C.w);
    txt(E.fma1, altLive ? 'GPS ALT' : 'SIM ALT', altLive ? C.g : gps.on ? C.a : C.w);
    txt(E.fma2, hdgSrc === 'GYRO (REL)' ? 'GYRO REL' : hdgSrc === 'SIM' ? 'SIM HDG' : hdgSrc, hdgSrc === 'GPS TRK' || hdgSrc === 'COMPASS' ? C.g : hdgSrc === 'SIM' ? C.w : C.a);
    txt(E.fma3, { sensor: 'GYRO ATT', manual: 'MANUAL', demo: 'DEMO', idle: 'STBY' }[mode] || mode, mode === 'sensor' ? C.g : C.c);
    txt(E.fma4, !gps.on ? 'GPS OFF' : live ? `GPS ±${gps.acc != null ? Math.round(gps.acc) : '?'}m` : 'GPS ACQ', !gps.on ? C.gr : live ? C.g : C.a);

    // ---- ND ----
    const gs = gsLive ? gps.speedKt : st.ias;
    const trk = live && gps.track != null ? gps.track : hdg;
    updateTrail(dt, gs, trk);
    setT(E.gNdRose, `rotate(${f(-hdg)} ${AX} ${AY})`);
    txt(E.gNdHdg, pad(Math.round(hdg) % 360 || 360, 3));
    txt(E.gNdHdgSrc, srcLbl, hdgSrc === 'GPS TRK' || hdgSrc === 'COMPASS' ? C.g : hdgSrc === 'SIM' ? C.w : C.a);
    setT(E.gNdTrk, `rotate(${f(wrap180(trk - hdg))} ${AX} ${AY})`);
    txt(E.gNdSpd, gsLive ? `GS ${Math.round(gs)}   TAS ---` : `GS ${Math.round(tas)}   TAS ${Math.round(tas)}`);
    txt(E.gNdSpd2, `${srcLbl === 'TRK' ? 'TRK' : 'HDG'} ${pad(Math.round(hdg) % 360 || 360, 3)}  ALT ${Math.round(st.alt)}`);
    txt(E.gNdGps, !gps.on ? 'GPS OFF' : live ? `GPS ±${gps.acc != null ? Math.round(gps.acc) : '?'}m` : 'GPS ACQ', !gps.on ? C.gr : live ? C.g : C.a);
    txt(E.gNdPos, live && gps.last ? `${Math.abs(gps.last.lat).toFixed(4)}${gps.last.lat >= 0 ? 'N' : 'S'} ${Math.abs(gps.last.lon).toFixed(4)}${gps.last.lon >= 0 ? 'E' : 'W'}` : 'SIM POSITION');

    if (now - ndTimer > 66) { // ~15 Hz is plenty for the map
      ndTimer = now;
      const range = rangeSel === 'AUTO' ? (RANGES.find(x => x >= gs / 15) || 320) : rangeSel;
      const sc = R / range;
      const h = hdg * D2R, ch = Math.cos(h), sh = Math.sin(h);
      const toScr = p => {
        const dx = p.x - trail.pos.x, dy = p.y - trail.pos.y;
        const sx = dx * ch - dy * sh, sy = dx * sh + dy * ch;
        return [AX + sx * sc, AY - sy * sc];
      };
      let pts = '';
      const step = Math.max(1, Math.floor(trail.pts.length / 600));
      for (let i = 0; i < trail.pts.length; i += step) { const [x, y] = toScr(trail.pts[i]); pts += `${f(x)},${f(y)} `; }
      pts += `${AX},${AY}`;
      E.gNdTrail.setAttribute('points', pts);
      if (trail.start) {
        const [x, y] = toScr(trail.start);
        setT(E.gNdStart, `translate(${f(x)} ${f(y)})`);
        const dist = Math.hypot(trail.pos.x - trail.start.x, trail.pos.y - trail.start.y);
        txt(E.gNdStartTxt, `START ${dist < 10 ? dist.toFixed(1) : Math.round(dist)} NM`);
      }
      // predicted path (curved trend vector), 0..90 s
      if (gs > 5) {
        let x = 0, y = 0, ang = wrap180(trk - hdg) * D2R, p = `${AX},${AY}`;
        const ds = gs / 3600 * 9, w = st.turn * D2R * 9;
        for (let i = 0; i < 10; i++) { ang += w; x += ds * Math.sin(ang); y += ds * Math.cos(ang); p += ` ${f(AX + x * sc)},${f(AY - y * sc)}`; }
        E.gNdPred.setAttribute('points', p);
      } else E.gNdPred.setAttribute('points', '');
      txt(E.gNdHalf, String(range / 2));
      txt(E.gNdRng, `RANGE ${range} NM${rangeSel === 'AUTO' ? ' AUTO' : ''} ⟳`);
    }
  }

  // ---------------- layout & switching ----------------
  function layout() {
    if (glass.hidden) return;
    const r = stage.getBoundingClientRect();
    const W = r.width - 8, H = r.height - 8, ar = 400 / 360, gap = 8;
    const landscape = W >= H * 1.05;
    let w = landscape ? Math.min((W - gap) / 2, H * ar) : Math.min(W, (H - gap) / 2 * ar);
    w = Math.max(100, Math.floor(w));
    glass.style.flexDirection = landscape ? 'row' : 'column';
    for (const s of glass.querySelectorAll('svg')) { s.style.width = w + 'px'; s.style.height = Math.floor(w / ar) + 'px'; }
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));

  const btn = $('btnDisp');
  function setDisplay(d, persist = true) {
    d = d === 'glass' ? 'glass' : 'analog';
    FI.display = d;
    glass.hidden = d !== 'glass';
    panel.style.display = d === 'glass' ? 'none' : '';
    document.body.classList.toggle('glass', d === 'glass');
    if (btn) btn.innerHTML = d === 'glass' ? '◎ アナログ' : '▭ グラス';
    if (persist) {
      try { localStorage.setItem('fi.display', d); } catch (_) { /* ignore */ }
      try { history.replaceState(null, '', '#' + d); } catch (_) { /* ignore */ }
    }
    if (d === 'glass') { spdBase = altBase = null; layout(); }
    else window.dispatchEvent(new Event('resize'));
  }
  if (btn) btn.addEventListener('click', () => setDisplay(FI.display === 'glass' ? 'analog' : 'glass'));
  window.addEventListener('hashchange', () => {
    if (location.hash === '#glass' || location.hash === '#analog') setDisplay(location.hash.slice(1), false);
  });

  FI.glass = { render, layout, setDisplay };
  let initial = 'analog';
  try { initial = localStorage.getItem('fi.display') || 'analog'; } catch (_) { /* ignore */ }
  if (location.hash === '#glass' || location.hash === '#analog') initial = location.hash.slice(1);
  setDisplay(initial, false);
})();
