#!/usr/bin/env node
/**
 * MSFS 2020 SimConnect ブリッジ。
 * 同じリポジトリの静的計器パネルを LAN に配信し、シミュレータの値を WebSocket (/sim) で送る。
 *
 *   node server.js            … MSFS に接続（起動していなければリトライ）
 *   node server.js --mock     … MSFS なしでダミー飛行データを送る（開発・動作確認用）
 *   node server.js --port 8080
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..'); // リポジトリ直下（index.html など）

const args = process.argv.slice(2);
const MOCK = args.includes('--mock');
const help = args.includes('--help') || args.includes('-h');
const PORT = Number((() => {
  const i = args.findIndex(a => a === '--port' || a === '-p');
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return process.env.PORT || 8080;
})());
const HOST = '0.0.0.0';

if (help) {
  console.log(`使い方: node server.js [--mock] [--port 8080]
  --mock   MSFS なしでダミーの飛行データを送ります
  --port   HTTP / WebSocket のポート（既定 8080）`);
  process.exit(0);
}

// ---------- latest packet sent to browsers ----------
// 計器側の符号: pitch = 機首上げが正、roll = 右バンクが正、turn = 右旋回が正 (°/s)、
// slip ≈ -1..1（正でボールが右）、hdg = 磁方位 0-360。
let latest = {
  type: 'status',
  simConnected: false,
  mock: MOCK,
  pitch: 0, roll: 0, hdg: 0, ias: 0, tas: 0, gs: 0,
  alt: 0, vsi: 0, turn: 0, slip: 0,
  throttle: 0, n1: null, baro: 29.92,
  onGround: true, paused: false,
};

function ipv4List() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const addrs of Object.values(ifs)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return out;
}

// ---------- static HTTP + WebSocket on the same port ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
};

const DENY = new Set(['.git', 'node_modules', '.env']);

function isDenied(rel) {
  const parts = rel.split(/[\\/]/);
  return parts.some(p => DENY.has(p) || p.startsWith('.git'));
}

function serve(req, res) {
  const host = req.headers.host || `localhost:${PORT}`;
  let url;
  try { url = new URL(req.url || '/', `http://${host}`); }
  catch { res.writeHead(400); res.end('Bad request'); return; }

  if (url.pathname === '/sim' && req.headers.upgrade) return; // WS に任せる
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ ...latest, clients: wss.clients.size }));
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  rel = rel.replace(/^\/+/, '');
  const full = path.normalize(path.join(SITE_ROOT, rel));
  if (!full.startsWith(SITE_ROOT + path.sep) && full !== SITE_ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (isDenied(rel)) { res.writeHead(404); res.end('Not found'); return; }

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(full).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'Content-Length': st.size,
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(serve);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  let pathname = '/';
  try { pathname = new URL(req.url || '/', 'http://localhost').pathname; } catch { /* ignore */ }
  if (pathname !== '/sim') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

wss.on('connection', ws => {
  try { ws.send(JSON.stringify(latest)); } catch { /* ignore */ }
});

function broadcast(pkt) {
  latest = pkt;
  const raw = JSON.stringify(pkt);
  for (const c of wss.clients) {
    if (c.readyState === 1) {
      try { c.send(raw); } catch { /* ignore */ }
    }
  }
}

function printBanner() {
  const addrs = ipv4List();
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  フライト計器パネル  —  MSFS 2020 ブリッジ');
  console.log('══════════════════════════════════════════════');
  if (MOCK) {
    console.log('  モード: モック（MSFS なしでダミー飛行データを送信）');
  } else {
    console.log('  モード: SimConnect（MSFS 2020 を待って接続します）');
  }
  console.log('');
  console.log('  同じ Wi-Fi の iPad / スマホで次の URL を開いてください:');
  if (addrs.length) {
    for (const ip of addrs) console.log(`    http://${ip}:${PORT}/`);
  } else {
    console.log('    （LAN の IPv4 アドレスが見つかりませんでした）');
  }
  console.log(`    http://127.0.0.1:${PORT}/   （この PC）`);
  console.log('');
  console.log('  初回は Windows のファイアウォール確認が出たら');
  console.log('  「プライベート ネットワーク」を許可してください。');
  console.log('  停止は Ctrl+C です。');
  console.log('══════════════════════════════════════════════');
  console.log('');
}

// ---------- mock flight ----------
function startMock() {
  const st = { hdg: 80, alt: 12000, t0: Date.now() };
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = (now - st.t0) / 1000;
    const roll = 22 * Math.sin(t * 0.13) + 6 * Math.sin(t * 0.41);
    const pitch = 2.4 + 2.2 * Math.sin(t * 0.21) + 0.8 * Math.sin(t * 0.67);
    const ias = 255 + 18 * Math.sin(t * 0.11);
    const tas = ias + 42 + 6 * Math.sin(t * 0.09);
    const turn = 9.81 * Math.tan((Math.max(-60, Math.min(60, roll)) * Math.PI) / 180) / Math.max(ias, 80) / 0.5144 * (180 / Math.PI);
    st.hdg = (st.hdg + turn * dt + 360) % 360;
    const vsi = 400 * Math.sin(t * 0.17) + 1800 * Math.sin(pitch * Math.PI / 180);
    st.alt = Math.max(500, st.alt + vsi / 60 * dt);
    const thr = 78 + 8 * Math.sin(t * 0.07);
    broadcast({
      type: 'sim',
      simConnected: true,
      mock: true,
      pitch, roll, hdg: st.hdg,
      ias, tas, gs: tas - 8,
      alt: st.alt, vsi, turn,
      slip: 0.08 * Math.sin(t * 0.9),
      throttle: thr, n1: 22 + 0.78 * thr,
      baro: 29.92,
      onGround: false, paused: false,
    });
  }, 40); // 25 Hz
  return () => clearInterval(timer);
}

// ---------- SimConnect ----------
// 符号の変換（実機で確認推奨）:
//   PLANE PITCH DEGREES … 機首先下が正、とされているので符号を反転して機首上げを正にする
//   PLANE BANK DEGREES  … 左バンクが負、右バンクが正（そのまま）
//   DELTA HEADING RATE  … 方位の増加（右旋回）が正、と想定
//   TURN COORDINATOR BALL … Position は ±128 前後、または ±1。正をボール右へ。
async function startSimConnect() {
  const {
    open, Protocol, SimConnectDataType, SimConnectPeriod, SimConnectConstants,
  } = await import('node-simconnect');

  const DEF = 1, REQ = 1, EV_PAUSE = 1, EV_SIM = 2;

  // 読み出し順はこの配列の順（変更したら read 側も同じ順に）
  const VARS = [
    ['PLANE PITCH DEGREES', 'degrees'],
    ['PLANE BANK DEGREES', 'degrees'],
    ['PLANE HEADING DEGREES MAGNETIC', 'degrees'],
    ['AIRSPEED INDICATED', 'knots'],
    ['AIRSPEED TRUE', 'knots'],
    ['INDICATED ALTITUDE', 'feet'],
    ['VERTICAL SPEED', 'feet per minute'],
    ['TURN COORDINATOR BALL', 'position'],
    ['DELTA HEADING RATE', 'degrees per second'],
    ['TURN INDICATOR RATE', 'degrees per second'],
    ['GENERAL ENG THROTTLE LEVER POSITION:1', 'percent'],
    ['TURB ENG N1:1', 'percent'],
    ['KOHLSMAN SETTING HG', 'inHg'],
    ['GROUND VELOCITY', 'knots'],
    ['SIM ON GROUND', 'number'],
  ];

  function ballToSlip(v) {
    if (!Number.isFinite(v)) return 0;
    const s = Math.abs(v) > 2 ? v / 128 : v; // Position (±128) or already -1..1
    return Math.max(-1, Math.min(1, s));
  }

  async function once() {
    const { recvOpen, handle } = await open('Flight Instruments', Protocol.KittyHawk);
    console.log('MSFS に接続しました:', recvOpen.applicationName || '(unknown)');
    let paused = false;

    for (const [name, unit] of VARS) {
      handle.addToDataDefinition(DEF, name, unit, SimConnectDataType.FLOAT64);
    }
    // VISUAL_FRAME + interval=1 → おおよそ 2 フレームに 1 回（60fps なら約 30 Hz）
    handle.requestDataOnSimObject(
      REQ, DEF, SimConnectConstants.OBJECT_ID_USER,
      SimConnectPeriod.VISUAL_FRAME, 0, 0, 1
    );
    handle.subscribeToSystemEvent(EV_PAUSE, 'Pause');
    handle.subscribeToSystemEvent(EV_SIM, 'Sim');

    handle.on('event', ev => {
      if (ev.clientEventId === EV_PAUSE) paused = ev.data === 1;
    });
    handle.on('exception', ev => {
      console.warn('SimConnect 例外:', ev.exceptionName || ev.exception, 'index=', ev.index);
    });

    handle.on('simObjectData', recv => {
      if (recv.requestID !== REQ) return;
      const d = recv.data;
      const pitchRaw = d.readFloat64();
      const bankRaw = d.readFloat64();
      const hdg = d.readFloat64();
      const ias = d.readFloat64();
      const tas = d.readFloat64();
      const alt = d.readFloat64();
      const vsi = d.readFloat64();
      const ball = d.readFloat64();
      const dHdg = d.readFloat64();
      const turnInd = d.readFloat64();
      const thr = d.readFloat64();
      const n1 = d.readFloat64();
      const baro = d.readFloat64();
      const gs = d.readFloat64();
      const onGnd = d.readFloat64();
      const turn = Number.isFinite(turnInd) && Math.abs(turnInd) > 1e-6 ? turnInd : dHdg;
      broadcast({
        type: 'sim',
        simConnected: true,
        mock: false,
        // 機首先下が正 → 計器は機首上げが正
        pitch: Number.isFinite(pitchRaw) ? -pitchRaw : 0,
        roll: Number.isFinite(bankRaw) ? bankRaw : 0,
        hdg: Number.isFinite(hdg) ? ((hdg % 360) + 360) % 360 : 0,
        ias: Number.isFinite(ias) ? ias : 0,
        tas: Number.isFinite(tas) ? tas : null,
        gs: Number.isFinite(gs) ? gs : null,
        alt: Number.isFinite(alt) ? alt : 0,
        vsi: Number.isFinite(vsi) ? vsi : 0,
        turn: Number.isFinite(turn) ? turn : 0,
        slip: ballToSlip(ball),
        throttle: Number.isFinite(thr) ? thr : 0,
        n1: Number.isFinite(n1) && n1 > 1 ? n1 : null,
        baro: Number.isFinite(baro) ? baro : 29.92,
        onGround: !!onGnd,
        paused,
      });
    });

    await new Promise(resolve => {
      const done = () => { try { handle.close(); } catch { /* ignore */ } resolve(); };
      handle.on('quit', () => { console.log('MSFS が終了しました。再接続します…'); done(); });
      handle.on('close', () => { console.log('SimConnect が切断されました。再接続します…'); done(); });
    });
  }

  for (;;) {
    try {
      await once();
    } catch (err) {
      broadcast({
        ...latest,
        type: 'status',
        simConnected: false,
        mock: false,
        paused: false,
      });
      const msg = err && err.message ? err.message : String(err);
      console.log('MSFS 待ち… (' + msg + ')  2秒後に再試行します');
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

server.listen(PORT, HOST, () => {
  printBanner();
  if (MOCK) startMock();
  else startSimConnect().catch(err => {
    console.error('SimConnect を開始できません:', err);
    process.exit(1);
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ポート ${PORT} は使用中です。 --port で別の番号を指定してください。`);
  } else console.error(err);
  process.exit(1);
});
