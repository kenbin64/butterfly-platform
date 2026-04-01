// FastTrack — Manifold Substrate Implementation (Full 102-Hole Rules)
// ═══════════════════════════════════════════════════════════════════════════
//
// 102-hole hexagonal board (17 holes × 6 sections)
// Track order per section: ft-{p}, side-left-{p}-{6→1}, outer-{p}-{0→3},
//                          home-{p}, side-right-{p}-{1→6}
//
// All state lives in 7 RepresentationTables (dimensional substrates)
// z = x·y on the 7-section helix
//
// ═══════════════════════════════════════════════════════════════════════════

// ─── RepresentationTable (browser-side, mirrors core API) ────
class RepresentationTable {
  constructor(name) { this.name = name; this._data = new Map(); }
  set(key, value) { this._data.set(key, value); }
  get(key) { return this._data.get(key); }
  has(key) { return this._data.has(key); }
  delete(key) { return this._data.delete(key); }
  keys() { return Array.from(this._data.keys()); }
  get size() { return this._data.size; }
}

const state = {
  players:  new RepresentationTable('ft:players'),
  board:    new RepresentationTable('ft:board'),
  deck:     new RepresentationTable('ft:deck'),
  turn:     new RepresentationTable('ft:turn'),
  movement: new RepresentationTable('ft:movement'),
  safeZone: new RepresentationTable('ft:safeZone'),
  meta:     new RepresentationTable('ft:meta'),
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const PEGS_PER_PLAYER = 5;
const SAFE_ZONE_SIZE = 4;
const PLAYER_COLORS = ['#ff0000','#00ff4a','#9400ff','#ffdf00','#00d4ff','#ff008a'];
const PLAYER_NAMES  = ['Red','Teal','Violet','Gold','Azure','Pink'];

function getBalancedBoardPosition(idx, count) {
  if (count === 2) return [0,3][idx];
  if (count === 3) return [0,2,4][idx];
  if (count === 4) return [0,1,3,4][idx];
  return idx;
}

// ─── Card rules (matching legacy game_engine.js) ────
const CARDS = {
  'A':    { movement:1,  direction:'clockwise', canEnter:true,  canExitBullseye:false, extraTurn:true  },
  '2':    { movement:2,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  '3':    { movement:3,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  '4':    { movement:4,  direction:'backward',  canEnter:false, canExitBullseye:false, extraTurn:false },
  '5':    { movement:5,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  '6':    { movement:6,  direction:'clockwise', canEnter:true,  canExitBullseye:false, extraTurn:true  },
  '7':    { movement:7,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false, isWild:true },
  '8':    { movement:8,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  '9':    { movement:9,  direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  '10':   { movement:10, direction:'clockwise', canEnter:false, canExitBullseye:false, extraTurn:false },
  'J':    { movement:1,  direction:'clockwise', canEnter:false, canExitBullseye:true,  extraTurn:true  },
  'Q':    { movement:1,  direction:'clockwise', canEnter:false, canExitBullseye:true,  extraTurn:true  },
  'K':    { movement:1,  direction:'clockwise', canEnter:false, canExitBullseye:true,  extraTurn:true  },
  'JOKER':{ movement:1,  direction:'clockwise', canEnter:true,  canExitBullseye:false, extraTurn:true  }
};

// ─── 102-hole ordered track (the hexagonal manifold surface) ────
function buildOrderedTrack() {
  const track = [];
  for (let p = 0; p < 6; p++) {
    track.push(`ft-${p}`);
    for (let h = 6; h >= 1; h--) track.push(`side-left-${p}-${h}`);
    for (let h = 0; h < 4; h++)  track.push(`outer-${p}-${h}`);
    track.push(`home-${p}`);
    for (let h = 1; h <= 6; h++) track.push(`side-right-${p}-${h}`);
  }
  return track; // 17 × 6 = 102
}
const CLOCKWISE_TRACK = buildOrderedTrack();

// Hole type classifier
function getHoleType(holeId) {
  if (holeId.startsWith('ft-'))         return 'fasttrack';
  if (holeId.startsWith('side-left-'))  return 'side-left';
  if (holeId.startsWith('outer-'))      return 'outer';
  if (holeId.startsWith('home-'))       return 'home';
  if (holeId.startsWith('side-right-')) return 'side-right';
  if (holeId.startsWith('safe-'))       return 'safezone';
  if (holeId === 'bullseye')            return 'bullseye';
  return 'holding';
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
function initGame(playerCount = 2) {
  state.players.set('count', playerCount);
  state.players.set('current', 0);

  // Board — register every hole on the 102-hole track + safe zones + bullseye
  for (const holeId of CLOCKWISE_TRACK) state.board.set(holeId, null);
  for (let p = 0; p < 6; p++)
    for (let h = 1; h <= SAFE_ZONE_SIZE; h++) state.board.set(`safe-${p}-${h}`, null);
  state.board.set('bullseye', null);

  // Deck
  state.deck.set('cards', createDeck());
  state.deck.set('discard', []);
  state.deck.set('currentCard', null);

  // Turn
  state.turn.set('phase', 'draw');
  state.turn.set('validMoves', []);

  // Log
  state.safeZone.set('log', []);

  // Meta
  state.meta.set('winner', null);
  state.meta.set('seed', Math.floor(Math.random() * 0xFFFFFFFF));

  // Players — each gets 5 pegs, all start in holding
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const bp = getBalancedBoardPosition(i, playerCount);
    const player = {
      index: i,
      name: i === 0 ? 'You' : `🤖 Bot ${i}`,
      color: PLAYER_COLORS[bp],
      boardPosition: bp,
      isBot: i > 0,
      pegs: Array.from({ length: PEGS_PER_PLAYER }, (_, p) => ({
        id: `p${i}-peg${p}`,
        holeId: 'holding',
        holeType: 'holding',
        onFasttrack: false,
        eligibleForSafeZone: false,
        lockedToSafeZone: false,
        completedCircuit: false,
        fasttrackEntryHole: null,
        mustExitFasttrack: false,
      }))
    };
    players.push(player);
  }
  state.players.set('list', players);

  // Deck
  shuffleDeck();
  log('Game started with ' + playerCount + ' players');
  updateUI();
  renderBoard();
}

function createDeck() {
  const cards = [];
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  for (const suit of suits)
    for (const rank of ranks) cards.push({ value: rank, suit, display: rank + suit });
  cards.push({ value:'JOKER', suit:'★', display:'🃏' });
  cards.push({ value:'JOKER', suit:'★', display:'🃏' });
  return cards;
}

function shuffleDeck() {
  const deck = state.deck.get('cards') || [];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  state.deck.set('cards', deck);
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD DRAWING
// ═══════════════════════════════════════════════════════════════════════════
function drawCard() {
  if (state.turn.get('phase') !== 'draw') return;

  let deck = state.deck.get('cards') || [];
  if (deck.length === 0) {
    deck = [...(state.deck.get('discard') || [])];
    state.deck.set('discard', []);
    state.deck.set('cards', deck);
    shuffleDeck();
    deck = state.deck.get('cards');
    log('Deck reshuffled');
  }

  const card = deck.pop();
  state.deck.set('cards', deck);
  state.deck.set('currentCard', card);
  state.turn.set('phase', 'move');

  document.getElementById('current-card').textContent = card.display;
  document.getElementById('card-info').textContent = getCardDescription(card.value);

  log(`${getCurrentPlayerName()} drew ${card.display}`);
  calculateValidMoves();
  updateUI();
}

function getCardDescription(v) {
  return { A:'Move 1 or enter', '2':'Move 2', '3':'Move 3', '4':'Move 4 BACKWARD',
    '5':'Move 5', '6':'Move 6 or enter', '7':'Split 7 (wild)', '8':'Move 8',
    '9':'Move 9', '10':'Move 10', J:'Move 1 / exit bullseye', Q:'Move 1 / exit bullseye',
    K:'Move 1 / exit bullseye', JOKER:'Wild! Enter or move 1' }[v] || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACK SEQUENCE — builds the path a peg can travel from its current hole
// ═══════════════════════════════════════════════════════════════════════════
function getTrackSequence(peg, player, direction) {
  const seq = [];
  const type = getHoleType(peg.holeId);
  const dir = direction || 'clockwise';
  const bp = player.boardPosition;

  // Safe zone: can only move forward within safe zone
  if (type === 'safezone') {
    const m = peg.holeId.match(/safe-(\d+)-(\d+)/);
    if (m) {
      const num = parseInt(m[2]);
      for (let h = num + 1; h <= SAFE_ZONE_SIZE; h++) seq.push(`safe-${m[1]}-${h}`);
    }
    return seq;
  }

  // FastTrack backward (4 card)
  if (type === 'fasttrack' && dir === 'backward') {
    const ftIdx = parseInt(peg.holeId.replace('ft-',''));
    const prev = (ftIdx - 1 + 6) % 6;
    for (let h = 6; h >= 1; h--) seq.push(`side-right-${prev}-${h}`);
    seq.push(`home-${prev}`);
    for (let h = 3; h >= 0; h--) seq.push(`outer-${prev}-${h}`);
    for (let h = 1; h <= 6; h++) seq.push(`side-left-${prev}-${h}`);
    seq.push(`ft-${prev}`);
    return seq;
  }

  // FastTrack forward (inner ring)
  if (type === 'fasttrack' && peg.onFasttrack) {
    const ftIdx = parseInt(peg.holeId.replace('ft-',''));
    for (let i = 1; i <= 6; i++) {
      const next = (ftIdx + i) % 6;
      seq.push(`ft-${next}`);
      if (next === bp) {
        // Reached exit — route to outer track → safe zone entry
        for (let h = 6; h >= 1; h--) seq.push(`side-left-${bp}-${h}`);
        for (let h = 0; h <= 2; h++) seq.push(`outer-${bp}-${h}`);
        const inSafe = player.pegs.filter(p => getHoleType(p.holeId) === 'safezone').length;
        if (inSafe < SAFE_ZONE_SIZE) {
          for (let h = 1; h <= SAFE_ZONE_SIZE; h++) seq.push(`safe-${bp}-${h}`);
        } else {
          seq.push(`outer-${bp}-3`);
          seq.push(`home-${bp}`);
          for (let h = 1; h <= 6; h++) seq.push(`side-right-${bp}-${h}`);
        }
        break;
      }
    }
    return seq;
  }

  // Perimeter track — use the ordered 102-hole array
  const idx = CLOCKWISE_TRACK.indexOf(peg.holeId);
  if (idx === -1) return seq;

  const len = CLOCKWISE_TRACK.length;
  const fwd = dir === 'clockwise';
  const safeEntry = `outer-${bp}-2`;

  for (let i = 1; i <= 30; i++) {
    const ni = fwd ? (idx + i) % len : (idx - i + len) % len;
    const holeId = CLOCKWISE_TRACK[ni];

    // Safe zone entry check (clockwise only, when eligible)
    if (holeId === safeEntry && fwd && (peg.eligibleForSafeZone || peg.lockedToSafeZone)) {
      seq.push(holeId);
      const inSafe = player.pegs.filter(p => getHoleType(p.holeId) === 'safezone').length;
      if (inSafe < SAFE_ZONE_SIZE) {
        for (let h = 1; h <= SAFE_ZONE_SIZE; h++) seq.push(`safe-${bp}-${h}`);
      } else {
        seq.push(`outer-${bp}-3`); seq.push(`home-${bp}`);
        for (let h = 1; h <= 6; h++) seq.push(`side-right-${bp}-${h}`);
      }
      break;
    }
    seq.push(holeId);
  }
  return seq;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
function calculateValidMoves() {
  const moves = [];
  const players = state.players.get('list') || [];
  const ci = state.players.get('current') || 0;
  const player = players[ci];
  const card = state.deck.get('currentCard');
  if (!card) { state.turn.set('validMoves', []); return; }
  const rules = CARDS[card.value];
  const bp = player.boardPosition;

  for (let pi = 0; pi < player.pegs.length; pi++) {
    const peg = player.pegs[pi];

    // ENTER from holding (A, 6, JOKER)
    if (peg.holeType === 'holding' && rules.canEnter) {
      const homeHole = `home-${bp}`;
      const occ = state.board.get(homeHole);
      if (!occ || occ.playerIdx !== ci) {
        moves.push({ type:'enter', pegIdx:pi, dest:homeHole });
      }
    }

    // EXIT BULLSEYE (J, Q, K)
    if (peg.holeId === 'bullseye' && rules.canExitBullseye) {
      // Exit to own ft-{bp} hole
      moves.push({ type:'exitBullseye', pegIdx:pi, dest:`ft-${bp}` });
    }

    // MOVE on perimeter / safe zone
    if (peg.holeType !== 'holding' && peg.holeId !== 'bullseye') {
      const dir = rules.direction;
      const trackSeq = getTrackSequence(peg, player, dir);
      const steps = rules.movement;

      if (trackSeq.length >= steps) {
        const dest = trackSeq[steps - 1];
        // Check path isn't blocked by own pegs
        let blocked = false;
        for (let s = 0; s < steps; s++) {
          const h = trackSeq[s];
          const occ = state.board.get(h);
          if (occ && occ.playerIdx === ci && s < steps - 1) { blocked = true; break; }
        }
        // Can't land on own peg
        const destOcc = state.board.get(dest);
        if (destOcc && destOcc.playerIdx === ci) blocked = true;
        if (!blocked) {
          moves.push({ type:'move', pegIdx:pi, dest, steps, from:peg.holeId });
        }
      }

      // FastTrack entry: peg on ft-{any} AND not already in FT mode
      if (getHoleType(peg.holeId) === 'fasttrack' && !peg.onFasttrack) {
        const ftIdx = parseInt(peg.holeId.replace('ft-',''));
        const nextFt = `ft-${(ftIdx + 1) % 6}`;
        const occ = state.board.get(nextFt);
        if (!occ || occ.playerIdx !== ci) {
          moves.push({ type:'enterFastTrack', pegIdx:pi, dest:peg.holeId });
        }
      }
    }

    // ENTER BULLSEYE from FastTrack
    if (peg.onFasttrack && peg.holeId !== 'bullseye') {
      const occ = state.board.get('bullseye');
      if (!occ) {
        moves.push({ type:'enterBullseye', pegIdx:pi, dest:'bullseye' });
      }
    }
  }

  state.turn.set('validMoves', moves);
  showMoveHints();
}

function showMoveHints() {
  const hintsDiv = document.getElementById('move-hints');
  const vm = state.turn.get('validMoves') || [];
  if (vm.length === 0) {
    hintsDiv.innerHTML = '<div class="hint" style="opacity:0.5;">No valid moves — pass</div>';
    setTimeout(endTurn, 1200);
    return;
  }
  hintsDiv.innerHTML = vm.map((m, i) => {
    let t = '';
    switch (m.type) {
      case 'enter':          t = 'Enter peg on board'; break;
      case 'move':           t = `Move to ${m.dest} (${m.steps})`; break;
      case 'enterFastTrack': t = '⚡ Enter FastTrack!'; break;
      case 'enterBullseye':  t = '🎯 Enter Bullseye!'; break;
      case 'exitBullseye':   t = '🚀 Exit Bullseye'; break;
    }
    return `<div class="hint" onclick="executeMove(${i})">${t}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
function placePeg(peg, holeId, playerIdx) {
  // Clear old position
  if (peg.holeId && peg.holeId !== 'holding') state.board.set(peg.holeId, null);
  // Bump occupant at destination
  bumpOccupant(holeId, playerIdx);
  // Place
  peg.holeId = holeId;
  peg.holeType = getHoleType(holeId);
  state.board.set(holeId, { playerIdx, pegId: peg.id });
}

function bumpOccupant(holeId, currentPlayerIdx) {
  const occ = state.board.get(holeId);
  if (!occ || occ.playerIdx === currentPlayerIdx) return;
  const players = state.players.get('list') || [];
  const victim = players[occ.playerIdx];
  const vPeg = victim.pegs.find(p => p.id === occ.pegId);
  if (vPeg) {
    vPeg.holeId = 'holding';
    vPeg.holeType = 'holding';
    vPeg.onFasttrack = false;
    vPeg.eligibleForSafeZone = false;
    vPeg.lockedToSafeZone = false;
    vPeg.completedCircuit = false;
    vPeg.fasttrackEntryHole = null;
    log(`${victim.name}'s peg bumped back!`);
  }
  state.board.set(holeId, null);
}

function executeMove(moveIdx) {
  const vm = state.turn.get('validMoves') || [];
  const move = vm[moveIdx];
  if (!move) return;

  const players = state.players.get('list') || [];
  const ci = state.players.get('current') || 0;
  const player = players[ci];
  const peg = player.pegs[move.pegIdx];

  switch (move.type) {
    case 'enter':
      placePeg(peg, move.dest, ci);
      log(`${getCurrentPlayerName()} entered a peg`);
      break;

    case 'move': {
      // Track if we passed our home hole (circuit detection)
      const bp = player.boardPosition;
      const homeHole = `home-${bp}`;
      const seq = getTrackSequence(peg, player, CARDS[state.deck.get('currentCard').value].direction);
      const destIdx = seq.indexOf(move.dest);
      if (destIdx >= 0 && seq.slice(0, destIdx + 1).includes(homeHole)) {
        peg.eligibleForSafeZone = true;
      }
      placePeg(peg, move.dest, ci);
      // Check if landed in safe zone
      if (getHoleType(move.dest) === 'safezone') {
        peg.lockedToSafeZone = true;
      }
      log(`${getCurrentPlayerName()} moved ${move.steps} to ${move.dest}`);
      break;
    }

    case 'enterFastTrack':
      peg.onFasttrack = true;
      peg.fasttrackEntryHole = peg.holeId;
      log(`${getCurrentPlayerName()} entered FastTrack! ⚡`);
      break;

    case 'enterBullseye':
      placePeg(peg, 'bullseye', ci);
      peg.onFasttrack = false;
      log(`${getCurrentPlayerName()} reached Bullseye! 🎯`);
      break;

    case 'exitBullseye':
      placePeg(peg, move.dest, ci);
      peg.onFasttrack = false;
      peg.eligibleForSafeZone = true; // bullseye exit = circuit complete
      peg.mustExitFasttrack = true;
      log(`${getCurrentPlayerName()} exited Bullseye! 🚀`);
      break;
  }

  // Check win: 4 in safe zone + 1 on home = win (simplified: all pegs not in holding)
  const inSafe = player.pegs.filter(p => getHoleType(p.holeId) === 'safezone').length;
  const onHome = player.pegs.filter(p => p.holeId === `home-${player.boardPosition}` && inSafe >= SAFE_ZONE_SIZE).length;
  if (inSafe >= SAFE_ZONE_SIZE && onHome > 0) {
    state.meta.set('winner', ci);
    log(`🏆 ${getCurrentPlayerName()} WINS!`);
  }

  state.players.set('list', players);

  // Discard card
  const card = state.deck.get('currentCard');
  const discard = state.deck.get('discard') || [];
  discard.push(card);
  state.deck.set('discard', discard);

  renderBoard();

  if (state.meta.get('winner') !== null) {
    document.getElementById('game-status').textContent = `🏆 ${getCurrentPlayerName()} WINS!`;
    return;
  }

  const rules = CARDS[card.value];
  if (rules.extraTurn) {
    log(`${getCurrentPlayerName()} gets another turn!`);
    state.deck.set('currentCard', null);
    state.turn.set('phase', 'draw');
    updateUI();
  } else {
    endTurn();
  }
}

function endTurn() {
  const players = state.players.get('list') || [];
  const ci = state.players.get('current') || 0;
  const next = (ci + 1) % players.length;

  state.deck.set('currentCard', null);
  state.players.set('current', next);
  state.turn.set('phase', 'draw');
  state.turn.set('validMoves', []);

  document.getElementById('current-card').textContent = '—';
  document.getElementById('card-info').textContent = 'Draw a card';
  document.getElementById('move-hints').innerHTML = '';
  updateUI();

  if (players[next].isBot) {
    document.getElementById('draw-btn').disabled = true;
    setTimeout(botTurn, 800);
  }
}

function getCurrentPlayerName() {
  const players = state.players.get('list') || [];
  return players[state.players.get('current') || 0].name;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT AI
// ═══════════════════════════════════════════════════════════════════════════
function botTurn() {
  log(`${getCurrentPlayerName()} is thinking...`);
  setTimeout(() => {
    drawCard();
    setTimeout(() => {
      const vm = state.turn.get('validMoves') || [];
      if (vm.length > 0) {
        // Priority: FT > Bullseye > Enter > random
        let idx = vm.findIndex(m => m.type === 'enterFastTrack');
        if (idx < 0) idx = vm.findIndex(m => m.type === 'enterBullseye');
        if (idx < 0) idx = vm.findIndex(m => m.type === 'enter');
        if (idx < 0) idx = Math.floor(Math.random() * vm.length);
        executeMove(idx);
      }
    }, 600);
  }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARD RENDERING (Canvas 2D) — 102-hole hexagonal layout
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const CX = canvas.width / 2;
const CY = canvas.height / 2;
const HEX_R = 310;
const HOLE_R = 9;
const PEG_R = 7;

function hexVertex(p) {
  const a = p * Math.PI / 3 - Math.PI / 2;
  return { x: CX + Math.cos(a) * HEX_R, y: CY + Math.sin(a) * HEX_R };
}

// Precompute (x,y) for every hole — finite set, computed once
const HOLE_POS = {};
(function buildPositions() {
  for (let p = 0; p < 6; p++) {
    const v0 = hexVertex(p), v1 = hexVertex((p + 1) % 6);
    const holes = [`ft-${p}`];
    for (let h = 6; h >= 1; h--) holes.push(`side-left-${p}-${h}`);
    for (let h = 0; h < 4; h++) holes.push(`outer-${p}-${h}`);
    holes.push(`home-${p}`);
    for (let h = 1; h <= 6; h++) holes.push(`side-right-${p}-${h}`);
    for (let j = 0; j < holes.length; j++) {
      const t = j / holes.length;
      HOLE_POS[holes[j]] = { x: v0.x + (v1.x - v0.x) * t, y: v0.y + (v1.y - v0.y) * t };
    }
    // Safe zone — branch inward from home-{p}
    const hp = HOLE_POS[`home-${p}`];
    for (let h = 1; h <= SAFE_ZONE_SIZE; h++) {
      const t = h / (SAFE_ZONE_SIZE + 1) * 0.55;
      HOLE_POS[`safe-${p}-${h}`] = { x: hp.x + (CX - hp.x) * t, y: hp.y + (CY - hp.y) * t };
    }
  }
  HOLE_POS['bullseye'] = { x: CX, y: CY };
})();

function drawPeg(x, y, color) {
  ctx.beginPath(); ctx.arc(x, y, PEG_R, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
}

function findPegOwnerColor(occ) {
  if (!occ) return null;
  const players = state.players.get('list') || [];
  const pl = players.find(p => p.pegs.some(pg => pg.id === occ.pegId));
  return pl ? pl.color : null;
}

function renderBoard() {
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hex outline
  ctx.strokeStyle = 'rgba(0,180,255,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let p = 0; p <= 6; p++) { const v = hexVertex(p % 6); p === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y); }
  ctx.stroke();

  // FastTrack spokes
  ctx.strokeStyle = 'rgba(0,255,180,0.08)'; ctx.lineWidth = 1;
  for (let p = 0; p < 6; p++) { const fp = HOLE_POS[`ft-${p}`]; ctx.beginPath(); ctx.moveTo(fp.x, fp.y); ctx.lineTo(CX, CY); ctx.stroke(); }

  // Safe zone connectors
  for (let p = 0; p < 6; p++) {
    const hp = HOLE_POS[`home-${p}`]; const s1 = HOLE_POS[`safe-${p}-${SAFE_ZONE_SIZE}`];
    ctx.strokeStyle = 'rgba(255,215,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
  }

  // Track holes (finite set — CLOCKWISE_TRACK)
  for (const holeId of CLOCKWISE_TRACK) {
    const pos = HOLE_POS[holeId]; if (!pos) continue;
    const type = getHoleType(holeId);
    let r = HOLE_R, fill = 'rgba(40,40,70,0.5)', stroke = 'rgba(0,180,255,0.25)', lw = 1;
    if (type === 'fasttrack')  { fill = 'rgba(0,255,180,0.15)'; stroke = '#00ffb4'; lw = 2; r = 12; }
    else if (type === 'home')  { fill = 'rgba(255,215,0,0.2)';  stroke = '#ffd700'; lw = 2; r = 12; }

    ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();

    const c = findPegOwnerColor(state.board.get(holeId));
    if (c) drawPeg(pos.x, pos.y, c);
  }

  // Safe zone holes
  for (let p = 0; p < 6; p++) for (let h = 1; h <= SAFE_ZONE_SIZE; h++) {
    const hid = `safe-${p}-${h}`, pos = HOLE_POS[hid]; if (!pos) continue;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, HOLE_R - 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,215,0,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    const c = findPegOwnerColor(state.board.get(hid));
    if (c) drawPeg(pos.x, pos.y, c);
  }

  // Bullseye
  ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,45,149,0.2)'; ctx.fill();
  ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = 3; ctx.stroke();
  const bc = findPegOwnerColor(state.board.get('bullseye'));
  if (bc) drawPeg(CX, CY, bc);
  ctx.fillStyle = '#ff2d95'; ctx.font = '10px Orbitron, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BULLSEYE', CX, CY + 36);

  // Holding areas (pegs still off-board)
  const players = state.players.get('list') || [];
  for (const pl of players) {
    const hold = pl.pegs.filter(pg => pg.holeType === 'holding');
    if (hold.length === 0) continue;
    const hp = HOLE_POS[`home-${pl.boardPosition}`];
    const dx = hp.x - CX, dy = hp.y - CY, d = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / d, ny = dy / d, bx = hp.x + nx * 44, by = hp.y + ny * 44;
    for (let h = 0; h < hold.length; h++) {
      const px = bx + (h - (hold.length - 1) / 2) * 16 * (-ny);
      const py = by + (h - (hold.length - 1) / 2) * 16 * nx;
      ctx.globalAlpha = 0.35; drawPeg(px, py, pl.color); ctx.globalAlpha = 1;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════════════════════════════════
function updateUI() {
  const players = state.players.get('list') || [];
  const ci = state.players.get('current') || 0;
  const phase = state.turn.get('phase');

  const playerListDiv = document.getElementById('player-list');
  playerListDiv.innerHTML = players.map((p, i) => {
    const onBoard = p.pegs.filter(pg => pg.holeType !== 'holding').length;
    const inSafe  = p.pegs.filter(pg => getHoleType(pg.holeId) === 'safezone').length;
    return `
      <div class="player-row ${i === ci ? 'active' : ''}">
        <div class="player-color" style="background: ${p.color};"></div>
        <span class="player-name">${p.name}</span>
        <span class="player-pegs">${onBoard}/${PEGS_PER_PLAYER} (🏠${inSafe})</span>
      </div>`;
  }).join('');

  const drawBtn = document.getElementById('draw-btn');
  const cp = players[ci];
  drawBtn.disabled = phase !== 'draw' || cp.isBot;
  document.getElementById('game-status').textContent =
    cp.isBot ? `${cp.name}'s turn` : 'Your turn';
}

function log(message) {
  const gameLog = state.safeZone.get('log') || [];
  gameLog.push({ time: Date.now(), message });
  state.safeZone.set('log', gameLog);

  const logDiv = document.getElementById('game-log');
  logDiv.innerHTML = gameLog.slice(-10).map(l =>
    `<div class="log-entry">${l.message}</div>`
  ).join('');
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════
initGame(2);
