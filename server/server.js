import http from 'node:http';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'game.sqlite');
const PORT = Number(process.env.PORT || 5176);
const SESSION_DAYS = 14;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

const ANIMALS = [
  {
    id: 'dog',
    name: 'Chien',
    phrase: 'waf waf',
    aliases: ['waf', 'ouaf', 'woof'],
    prompts: [
      { id: 'dog_classic', text: 'waf waf', aliases: ['waf waf', 'ouaf ouaf', 'woof woof'], hint: 'aboiement propre', mode: 'classic', multiplier: 1 },
      { id: 'dog_grr', text: 'grrr... waf waf', aliases: ['grr waf', 'grrr waf', 'grogne waf'], hint: 'grogne puis aboie', mode: 'combo', multiplier: 1.12 },
      { id: 'dog_rap', text: 'waf-waf rap', aliases: ['waf waf waf', 'ouaf ouaf ouaf', 'wafwafwaf'], hint: 'enchaîne vite', mode: 'rap', multiplier: 1.28 }
    ]
  },
  {
    id: 'cat',
    name: 'Chat',
    phrase: 'miaou',
    aliases: ['miaou', 'meow'],
    prompts: [
      { id: 'cat_classic', text: 'miaouuu', aliases: ['miaou', 'miaouu', 'meow'], hint: 'long et dramatique', mode: 'hold', multiplier: 1.08 },
      { id: 'cat_purr', text: 'mrrrr miaou', aliases: ['mrrr miaou', 'mrrrr miaou', 'ronron miaou'], hint: 'ronron puis miaou', mode: 'combo', multiplier: 1.16 },
      { id: 'cat_rap', text: 'mi-mi-miaou', aliases: ['mi mi miaou', 'mimi miaou', 'miaou miaou miaou'], hint: 'flow félin', mode: 'rap', multiplier: 1.26 }
    ]
  },
  {
    id: 'duck',
    name: 'Canard',
    phrase: 'coin coin',
    aliases: ['coin', 'quack'],
    prompts: [
      { id: 'duck_classic', text: 'coin coin', aliases: ['coin coin', 'quack quack'], hint: 'bec bien fermé', mode: 'classic', multiplier: 1 },
      { id: 'duck_rap', text: 'coin coin coin', aliases: ['coin coin coin', 'quack quack quack'], hint: 'canard en rafale', mode: 'rap', multiplier: 1.3 },
      { id: 'duck_funky', text: 'coin-coin waak', aliases: ['coin coin waak', 'coin coin ouak', 'quack quack waak'], hint: 'final bizarre accepté', mode: 'combo', multiplier: 1.18 }
    ]
  },
  {
    id: 'cow',
    name: 'Vache',
    phrase: 'meuh',
    aliases: ['meuh', 'moo'],
    prompts: [
      { id: 'cow_hold', text: 'meuuuh long', aliases: ['meuh', 'meuuuh', 'moo'], hint: 'tiens le meuh', mode: 'hold', multiplier: 1.12 },
      { id: 'cow_bass', text: 'meuh meuh basse', aliases: ['meuh meuh', 'moo moo'], hint: 'grave et lent', mode: 'classic', multiplier: 1.05 },
      { id: 'cow_rap', text: 'meuh-meuh rap', aliases: ['meuh meuh meuh', 'moo moo moo'], hint: 'ruminant rapide', mode: 'rap', multiplier: 1.24 }
    ]
  },
  {
    id: 'frog',
    name: 'Grenouille',
    phrase: 'croa croa',
    aliases: ['croa', 'ribbit'],
    prompts: [
      { id: 'frog_classic', text: 'croa croa', aliases: ['croa croa', 'ribbit ribbit'], hint: 'marécage standard', mode: 'classic', multiplier: 1 },
      { id: 'frog_bounce', text: 'croa-hop croa', aliases: ['croa hop croa', 'croa croa hop'], hint: 'saute dans le rythme', mode: 'combo', multiplier: 1.18 },
      { id: 'frog_rap', text: 'croa croa croa', aliases: ['croa croa croa', 'ribbit ribbit ribbit'], hint: 'rafale gluante', mode: 'rap', multiplier: 1.28 }
    ]
  },
  {
    id: 'rooster',
    name: 'Coq',
    phrase: 'cocorico',
    aliases: ['cocorico'],
    prompts: [
      { id: 'rooster_classic', text: 'cocorico !', aliases: ['cocorico'], hint: 'réveil du village', mode: 'hold', multiplier: 1.14 },
      { id: 'rooster_rap', text: 'coco-rico rap', aliases: ['coco rico', 'coco rico rico', 'cocorico cocorico'], hint: 'flow de basse-cour', mode: 'rap', multiplier: 1.28 },
      { id: 'rooster_combo', text: 'cot cot cocorico', aliases: ['cot cot cocorico', 'kot kot cocorico'], hint: 'échauffement puis cri', mode: 'combo', multiplier: 1.18 }
    ]
  },
  {
    id: 'pig',
    name: 'Cochon',
    phrase: 'groin groin',
    aliases: ['groin', 'oink'],
    prompts: [
      { id: 'pig_classic', text: 'groin groin', aliases: ['groin groin', 'oink oink'], hint: 'nez en avant', mode: 'classic', multiplier: 1 },
      { id: 'pig_snort', text: 'snrrrk groin', aliases: ['snrk groin', 'snrrrk groin', 'ronfle groin'], hint: 'petit reniflement', mode: 'combo', multiplier: 1.18 },
      { id: 'pig_rap', text: 'groin-groin rap', aliases: ['groin groin groin', 'oink oink oink'], hint: 'porcinet freestyle', mode: 'rap', multiplier: 1.26 }
    ]
  },
  {
    id: 'sheep',
    name: 'Mouton',
    phrase: 'bêêê',
    aliases: ['beee', 'bê'],
    prompts: [
      { id: 'sheep_hold', text: 'bêêê long', aliases: ['bê', 'bêêê', 'beee', 'baa'], hint: 'laine mélodique', mode: 'hold', multiplier: 1.12 },
      { id: 'sheep_combo', text: 'bê bê bêêê', aliases: ['bê bê bê', 'be be beee', 'baa baa baa'], hint: 'troupeau en montée', mode: 'combo', multiplier: 1.18 },
      { id: 'sheep_rap', text: 'bê-bê rap', aliases: ['bê bê bê bê', 'baa baa baa baa'], hint: 'bergerie rapide', mode: 'rap', multiplier: 1.26 }
    ]
  },
  {
    id: 'fox',
    name: 'Renard',
    phrase: 'yip yip',
    aliases: ['yip', 'wa-pa'],
    prompts: [
      { id: 'fox_classic', text: 'yip yip', aliases: ['yip yip', 'yap yap'], hint: 'cri malin', mode: 'classic', multiplier: 1 },
      { id: 'fox_weird', text: 'wa-pa-pa yip', aliases: ['wa pa pa yip', 'wapapa yip', 'wa pa yip'], hint: 'mème accepté', mode: 'combo', multiplier: 1.2 },
      { id: 'fox_rap', text: 'yip-yip rap', aliases: ['yip yip yip', 'yap yap yap'], hint: 'rap des bois', mode: 'rap', multiplier: 1.28 }
    ]
  }
];

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon']
]);

mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    main_animal TEXT NOT NULL DEFAULT 'dog',
    accent TEXT NOT NULL DEFAULT '#23b7a4',
    avatar_style TEXT NOT NULL DEFAULT 'spark',
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'blocked')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id),
    CHECK(requester_id <> addressee_id)
  );

  CREATE TABLE IF NOT EXISTS lobbies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('open', 'in_game', 'finished')) DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lobby_players (
    lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal TEXT NOT NULL DEFAULT 'dog',
    ready INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(lobby_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    settings_json TEXT NOT NULL,
    state_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('playing', 'finished')) DEFAULT 'playing',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(requester_id, addressee_id);
  CREATE INDEX IF NOT EXISTS idx_lobby_players_user ON lobby_players(user_id);
`);

const statements = {
  userById: db.prepare(`
    SELECT id, username, email, display_name, bio, main_animal, accent, avatar_style, wins, losses, created_at
    FROM users WHERE id = ?
  `),
  privateUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  privateUserByUsername: db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)'),
  privateUserByEmail: db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)'),
  sessionByToken: db.prepare(`
    SELECT s.token, s.expires_at, u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
  insertSession: db.prepare('INSERT INTO sessions(token, user_id, expires_at) VALUES (?, ?, ?)'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  lobbyByCode: db.prepare('SELECT * FROM lobbies WHERE upper(code) = upper(?)'),
  lobbyById: db.prepare('SELECT * FROM lobbies WHERE id = ?'),
  lobbyPlayers: db.prepare(`
    SELECT lp.lobby_id, lp.user_id, lp.animal, lp.ready, lp.joined_at,
      u.username, u.display_name, u.main_animal, u.accent, u.avatar_style, u.wins, u.losses
    FROM lobby_players lp
    JOIN users u ON u.id = lp.user_id
    WHERE lp.lobby_id = ?
    ORDER BY lp.joined_at ASC
  `),
  activeLobbyForUser: db.prepare(`
    SELECT l.*
    FROM lobbies l
    JOIN lobby_players lp ON lp.lobby_id = l.id
    WHERE lp.user_id = ? AND l.status IN ('open', 'in_game')
    ORDER BY l.updated_at DESC LIMIT 1
  `),
  matchByLobby: db.prepare(`
    SELECT * FROM matches WHERE lobby_id = ? ORDER BY created_at DESC LIMIT 1
  `)
};

const wsClients = new Set();
const activeMatches = new Map();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio,
    mainAnimal: row.main_animal,
    accent: row.accent,
    avatarStyle: row.avatar_style,
    wins: row.wins,
    losses: row.losses,
    createdAt: row.created_at
  };
}

function publicLobbyPlayer(row) {
  return {
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    mainAnimal: row.main_animal,
    accent: row.accent,
    avatarStyle: row.avatar_style,
    wins: row.wins,
    losses: row.losses,
    lobbyAnimal: row.animal,
    ready: Boolean(row.ready),
    online: isUserOnline(row.user_id)
  };
}

function jsonParseSafe(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUsername(username) {
  return String(username || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
}

function normalizeDisplayName(displayName, fallback) {
  const clean = String(displayName || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  return clean || fallback;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeAnimal(animal, fallback = 'dog') {
  return ANIMALS.some((entry) => entry.id === animal) ? animal : fallback;
}

function normalizeAccent(accent) {
  const value = String(accent || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#23b7a4';
}

function normalizeBestOf(bestOf) {
  const value = Number(bestOf);
  return value === 5 ? 5 : 3;
}

function normalizeMaxPlayers(maxPlayers) {
  const value = Number(maxPlayers);
  if (!Number.isFinite(value)) return MIN_PLAYERS;
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(value)));
}

function normalizeRoundSeconds(roundSeconds) {
  const value = Number(roundSeconds);
  if (!Number.isFinite(value)) return 30;
  return Math.max(18, Math.min(60, Math.round(value)));
}

function slugId(prefix) {
  return `${prefix}_${randomBytes(9).toString('base64url')}`;
}

function lobbyCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(String(password), salt, 210000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const left = Buffer.from(hash, 'hex');
  const right = Buffer.from(expectedHash, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function makeSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  statements.insertSession.run(token, userId, expiresAt);
  return { token, expiresAt };
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const chunk of header.split(';')) {
    const [rawKey, ...rawValue] = chunk.trim().split('=');
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
  }
  return cookies;
}

function sessionCookie(token, maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  return `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookie() {
  return 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

function getSessionUser(req) {
  statements.deleteExpiredSessions.run(Date.now());
  const token = parseCookies(req).session;
  if (!token) return null;
  const row = statements.sessionByToken.get(token);
  if (!row || row.expires_at < Date.now()) {
    statements.deleteSession.run(token);
    return null;
  }
  return { token, user: row };
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(body));
}

function sendError(res, status, message, details = undefined) {
  sendJson(res, status, { error: message, details });
}

async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1024 * 1024) throw new Error('Payload trop grand');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function getLobbySnapshot(lobby) {
  if (!lobby) return null;
  const players = statements.lobbyPlayers.all(lobby.id).map(publicLobbyPlayer);
  const settings = jsonParseSafe(lobby.settings_json, { bestOf: 3, roundSeconds: 30, maxPlayers: MIN_PLAYERS });
  settings.maxPlayers = normalizeMaxPlayers(settings.maxPlayers);
  const match = activeMatches.get(lobby.id) || restoreMatch(lobby.id);
  return {
    id: lobby.id,
    code: lobby.code,
    ownerId: lobby.owner_id,
    status: lobby.status,
    settings,
    players,
    match: match ? publicGameState(match) : null,
    createdAt: lobby.created_at,
    updatedAt: lobby.updated_at
  };
}

function restoreMatch(lobbyId) {
  const row = statements.matchByLobby.get(lobbyId);
  if (!row || row.status !== 'playing') return null;
  const state = jsonParseSafe(row.state_json, null);
  if (!state || state.status !== 'playing') return null;
  state.timers = [];
  activeMatches.set(lobbyId, state);
  return state;
}

function updateLobbyTimestamp(lobbyId) {
  db.prepare('UPDATE lobbies SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(lobbyId);
}

function isUserOnline(userId) {
  for (const client of wsClients) {
    if (client.user?.id === userId) return true;
  }
  return false;
}

function getFriendsPayload(userId) {
  const rows = db.prepare(`
    SELECT f.*,
      requester.username AS requester_username,
      requester.display_name AS requester_display_name,
      requester.main_animal AS requester_main_animal,
      requester.accent AS requester_accent,
      requester.avatar_style AS requester_avatar_style,
      requester.wins AS requester_wins,
      requester.losses AS requester_losses,
      addressee.username AS addressee_username,
      addressee.display_name AS addressee_display_name,
      addressee.main_animal AS addressee_main_animal,
      addressee.accent AS addressee_accent,
      addressee.avatar_style AS addressee_avatar_style,
      addressee.wins AS addressee_wins,
      addressee.losses AS addressee_losses
    FROM friendships f
    JOIN users requester ON requester.id = f.requester_id
    JOIN users addressee ON addressee.id = f.addressee_id
    WHERE f.requester_id = ? OR f.addressee_id = ?
    ORDER BY f.updated_at DESC
  `).all(userId, userId);

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const row of rows) {
    const otherIsRequester = row.requester_id !== userId;
    const other = otherIsRequester
      ? {
          id: row.requester_id,
          username: row.requester_username,
          displayName: row.requester_display_name,
          mainAnimal: row.requester_main_animal,
          accent: row.requester_accent,
          avatarStyle: row.requester_avatar_style,
          wins: row.requester_wins,
          losses: row.requester_losses
        }
      : {
          id: row.addressee_id,
          username: row.addressee_username,
          displayName: row.addressee_display_name,
          mainAnimal: row.addressee_main_animal,
          accent: row.addressee_accent,
          avatarStyle: row.addressee_avatar_style,
          wins: row.addressee_wins,
          losses: row.addressee_losses
        };
    other.online = isUserOnline(other.id);

    if (row.status === 'accepted') {
      friends.push({ friendshipId: row.id, user: other });
    } else if (row.status === 'pending' && row.addressee_id === userId) {
      incoming.push({ friendshipId: row.id, user: other });
    } else if (row.status === 'pending' && row.requester_id === userId) {
      outgoing.push({ friendshipId: row.id, user: other });
    }
  }

  return { friends, incoming, outgoing };
}

function relationshipStatus(selfId, otherId) {
  const row = db.prepare(`
    SELECT * FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?)
      OR (requester_id = ? AND addressee_id = ?)
    LIMIT 1
  `).get(selfId, otherId, otherId, selfId);

  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  if (row.requester_id === selfId) return 'outgoing';
  return 'incoming';
}

function assertAuth(req, res) {
  const session = getSessionUser(req);
  if (!session) {
    sendError(res, 401, 'Connexion requise');
    return null;
  }
  return session;
}

function assertLobbyMember(lobbyId, userId) {
  return db.prepare('SELECT * FROM lobby_players WHERE lobby_id = ? AND user_id = ?').get(lobbyId, userId);
}

function saveMatchState(state) {
  const clean = serializeGameState(state);
  db.prepare(`
    UPDATE matches SET state_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(JSON.stringify(clean), clean.status === 'finished' ? 'finished' : 'playing', state.id);
}

function serializeGameState(state) {
  return {
    id: state.id,
    lobbyId: state.lobbyId,
    lobbyCode: state.lobbyCode,
    status: state.status,
    bestOf: state.bestOf,
    targetWins: state.targetWins,
    winnerId: state.winnerId || null,
    roundSeconds: state.roundSeconds,
    players: state.players,
    roundWins: state.roundWins,
    previousAnimals: state.previousAnimals,
    previousChallenges: state.previousChallenges || {},
    currentRound: state.currentRound,
    rounds: state.rounds
  };
}

function publicGameState(state) {
  const clean = serializeGameState(state);
  return {
    ...clean,
    serverNow: Date.now()
  };
}

function animalById(id) {
  return ANIMALS.find((animal) => animal.id === id) || ANIMALS[0];
}

function randomAnimal(exclude = null) {
  const pool = ANIMALS.filter((animal) => animal.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function challengeById(animalId, challengeId) {
  const prompts = animalById(animalId).prompts || [];
  return prompts.find((prompt) => prompt.id === challengeId) || prompts[0] || {
    id: `${animalId}_classic`,
    text: animalById(animalId).phrase,
    aliases: [animalById(animalId).phrase, ...(animalById(animalId).aliases || [])],
    hint: 'cri classique',
    mode: 'classic',
    multiplier: 1
  };
}

function randomChallenge(animalId, previousChallengeId = null) {
  const prompts = animalById(animalId).prompts || [];
  const pool = prompts.filter((prompt) => prompt.id !== previousChallengeId);
  return (pool.length ? pool : prompts)[Math.floor(Math.random() * (pool.length ? pool.length : prompts.length))] || challengeById(animalId);
}

function challengeMapForAnimals(animalsByUser, previousChallenges = {}) {
  const challenges = {};
  const phrases = {};
  for (const [userId, animal] of Object.entries(animalsByUser)) {
    const challenge = randomChallenge(animal, previousChallenges[userId] || null);
    challenges[userId] = challenge;
    phrases[userId] = challenge.text;
  }
  return { challenges, phrases };
}

function beginRound(state, firstRound = false) {
  const now = Date.now();
  const animalsByUser = {};
  const progressByUser = {};
  const previousChallenges = state.previousChallenges || {};

  for (const player of state.players) {
    const previous = state.previousAnimals[player.id] || null;
    const selected = firstRound ? normalizeAnimal(player.selectedAnimal, player.mainAnimal) : randomAnimal(previous);
    animalsByUser[player.id] = selected;
    progressByUser[player.id] = 0;
    state.previousAnimals[player.id] = selected;
  }
  const { challenges, phrases } = challengeMapForAnimals(animalsByUser, previousChallenges);
  state.previousChallenges = Object.fromEntries(Object.entries(challenges).map(([userId, challenge]) => [userId, challenge.id]));

  state.currentRound = {
    number: state.rounds.length + 1,
    status: 'countdown',
    countdownEndsAt: now + 3200,
    endsAt: now + 3200 + state.roundSeconds * 1000,
    winnerId: null,
    animalsByUser,
    phrasesByUser: phrases,
    challengesByUser: challenges,
    progressByUser
  };

  saveMatchState(state);
  broadcastGame(state);

  state.timers ||= [];
  state.timers.push(setTimeout(() => {
    if (state.status !== 'playing' || state.currentRound?.status !== 'countdown') return;
    state.currentRound.status = 'playing';
    saveMatchState(state);
    broadcastGame(state);
  }, 3200));
}

function endRound(state, winnerId, reason = 'progress') {
  if (state.status !== 'playing' || !state.currentRound || state.currentRound.status === 'ended') return;

  const round = state.currentRound;
  if (!winnerId) {
    const scores = Object.entries(round.progressByUser).sort((a, b) => b[1] - a[1]);
    winnerId = Number(scores[0]?.[0] || state.players[0].id);
  }

  winnerId = Number(winnerId);
  round.status = 'ended';
  round.winnerId = winnerId;
  round.reason = reason;
  round.endedAt = Date.now();
  round.progressByUser[winnerId] = Math.max(round.progressByUser[winnerId] || 0, reason === 'progress' ? 100 : round.progressByUser[winnerId] || 0);

  state.roundWins[winnerId] = (state.roundWins[winnerId] || 0) + 1;
  state.rounds.push({
    number: round.number,
    winnerId,
    reason,
    endedAt: round.endedAt,
    animalsByUser: round.animalsByUser,
    challengesByUser: round.challengesByUser,
    progressByUser: round.progressByUser
  });

  if (state.roundWins[winnerId] >= state.targetWins) {
    finishMatch(state, winnerId);
    return;
  }

  saveMatchState(state);
  broadcastGame(state);
  state.timers ||= [];
  state.timers.push(setTimeout(() => beginRound(state, false), 3600));
}

function finishMatch(state, winnerId) {
  state.status = 'finished';
  state.winnerId = Number(winnerId);
  const losers = state.players.filter((player) => player.id !== state.winnerId);

  db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(state.winnerId);
  const addLoss = db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?');
  for (const loser of losers) addLoss.run(loser.id);
  db.prepare('UPDATE lobbies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('finished', state.lobbyId);

  saveMatchState(state);
  activeMatches.delete(state.lobbyId);
  broadcastGame(state);
  broadcastLobby(state.lobbyId);
}

function startMatch(lobby, actorId) {
  if (lobby.owner_id !== actorId) throw new Error('Seul le créateur peut lancer la partie');
  if (lobby.status !== 'open') throw new Error('Ce lobby n’est pas disponible');

  const settings = jsonParseSafe(lobby.settings_json, { bestOf: 3, roundSeconds: 30, maxPlayers: MIN_PLAYERS });
  const maxPlayers = normalizeMaxPlayers(settings.maxPlayers);
  const players = statements.lobbyPlayers.all(lobby.id);
  if (players.length !== maxPlayers) throw new Error(`Il faut exactement ${maxPlayers} joueurs`);
  if (players.some((player) => !player.ready)) throw new Error('Tous les joueurs doivent être prêts');
  settings.maxPlayers = maxPlayers;

  const state = {
    id: slugId('match'),
    lobbyId: lobby.id,
    lobbyCode: lobby.code,
    status: 'playing',
    bestOf: normalizeBestOf(settings.bestOf),
    targetWins: Math.ceil(normalizeBestOf(settings.bestOf) / 2),
    winnerId: null,
    roundSeconds: normalizeRoundSeconds(settings.roundSeconds),
    players: players.map((player) => ({
      id: player.user_id,
      username: player.username,
      displayName: player.display_name,
      mainAnimal: player.main_animal,
      accent: player.accent,
      avatarStyle: player.avatar_style,
      selectedAnimal: normalizeAnimal(player.animal, player.main_animal)
    })),
    roundWins: Object.fromEntries(players.map((player) => [player.user_id, 0])),
    previousAnimals: {},
    previousChallenges: {},
    currentRound: null,
    rounds: [],
    timers: []
  };

  db.prepare(`
    INSERT INTO matches(id, lobby_id, settings_json, state_json, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(state.id, lobby.id, JSON.stringify(settings), JSON.stringify(serializeGameState(state)), 'playing');
  db.prepare('UPDATE lobbies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('in_game', lobby.id);
  activeMatches.set(lobby.id, state);
  beginRound(state, true);
  broadcastLobby(lobby.id);
  return state;
}

function handleVoiceTick(client, message) {
  const lobbyId = message.lobbyId;
  const state = activeMatches.get(lobbyId);
  if (!state || state.status !== 'playing' || !state.currentRound) return;
  if (!state.players.some((player) => player.id === client.user.id)) return;

  const now = Date.now();
  const round = state.currentRound;
  if (round.status === 'countdown' || now < round.countdownEndsAt) return;
  if (round.status !== 'playing') return;
  if (now >= round.endsAt) {
    endRound(state, null, 'time');
    return;
  }

  const lastTick = client.voiceLastAt?.get(state.id) || 0;
  const elapsed = now - lastTick;
  if (elapsed < 80) return;
  client.voiceLastAt ||= new Map();
  client.voiceLastAt.set(state.id, now);

  const level = clamp(Number(message.level || 0), 0, 1);
  const userId = String(client.user.id);
  const challenge = round.challengesByUser?.[userId] || challengeById(round.animalsByUser?.[userId]);
  const phraseHit = Boolean(message.phraseHit) && (!message.challengeId || message.challengeId === challenge.id);
  if (!phraseHit) return;

  const gain = Math.max(0, level - 0.085) * 10.8;
  const elapsedFactor = clamp(elapsed / 150, 0.55, 1.7);
  const modeBonus = challenge.mode === 'rap' ? 0.42 : challenge.mode === 'hold' ? 0.22 : challenge.mode === 'combo' ? 0.3 : 0.12;
  const increment = Math.min(4.4, (gain * elapsedFactor + modeBonus) * clamp(challenge.multiplier || 1, 0.8, 1.45));
  if (increment <= 0) return;

  round.progressByUser[userId] = clamp((round.progressByUser[userId] || 0) + increment, 0, 100);

  if (round.progressByUser[userId] >= 100) {
    endRound(state, client.user.id, 'progress');
  } else {
    saveMatchState(state);
    broadcastGame(state);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function broadcastLobby(lobbyId) {
  const lobby = statements.lobbyById.get(lobbyId);
  if (!lobby) return;
  const payload = { type: 'lobby', lobby: getLobbySnapshot(lobby) };
  for (const client of wsClients) {
    if (client.subscriptions.has(`lobby:${lobby.code}`) || client.subscriptions.has(`lobby:${lobby.id}`)) {
      sendWs(client, payload);
    }
  }
}

function broadcastGame(state) {
  const payload = { type: 'game', game: publicGameState(state) };
  for (const client of wsClients) {
    if (client.subscriptions.has(`lobby:${state.lobbyCode}`) || client.subscriptions.has(`lobby:${state.lobbyId}`)) {
      sendWs(client, payload);
    }
  }
}

function sendToUser(userId, payload) {
  for (const client of wsClients) {
    if (client.user?.id === userId) sendWs(client, payload);
  }
}

function areFriends(a, b) {
  const row = db.prepare(`
    SELECT id FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
  `).get(a, b, b, a);
  return Boolean(row);
}

async function handleApi(req, res, url) {
  try {
    const method = req.method || 'GET';
    const pathname = url.pathname;

    if (method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true, animals: ANIMALS });
      return;
    }

    if (method === 'GET' && pathname === '/api/animals') {
      sendJson(res, 200, { animals: ANIMALS });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/register') {
      const body = await readJson(req);
      const username = normalizeUsername(body.username);
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      if (username.length < 3) return sendError(res, 400, 'Pseudo trop court');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Email invalide');
      if (password.length < 8) return sendError(res, 400, 'Mot de passe trop court');
      if (statements.privateUserByUsername.get(username)) return sendError(res, 409, 'Pseudo déjà pris');
      if (statements.privateUserByEmail.get(email)) return sendError(res, 409, 'Email déjà utilisé');

      const { salt, hash } = hashPassword(password);
      const displayName = normalizeDisplayName(body.displayName, username);
      const mainAnimal = normalizeAnimal(body.mainAnimal, 'dog');
      const accent = normalizeAccent(body.accent);
      const result = db.prepare(`
        INSERT INTO users(username, email, password_hash, salt, display_name, main_animal, accent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(username, email, hash, salt, displayName, mainAnimal, accent);
      const session = makeSession(Number(result.lastInsertRowid));
      const user = publicUser(statements.userById.get(Number(result.lastInsertRowid)));
      sendJson(res, 201, { user }, { 'Set-Cookie': sessionCookie(session.token) });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJson(req);
      const identifier = String(body.identifier || body.username || '').trim();
      const password = String(body.password || '');
      const row = identifier.includes('@')
        ? statements.privateUserByEmail.get(normalizeEmail(identifier))
        : statements.privateUserByUsername.get(identifier);
      if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
        return sendError(res, 401, 'Identifiants invalides');
      }
      const session = makeSession(row.id);
      sendJson(res, 200, { user: publicUser(row) }, { 'Set-Cookie': sessionCookie(session.token) });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/logout') {
      const session = getSessionUser(req);
      if (session) statements.deleteSession.run(session.token);
      sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
      return;
    }

    if (method === 'GET' && pathname === '/api/me') {
      const session = assertAuth(req, res);
      if (!session) return;
      const lobby = statements.activeLobbyForUser.get(session.user.id);
      sendJson(res, 200, {
        user: publicUser(session.user),
        friends: getFriendsPayload(session.user.id),
        activeLobby: lobby ? getLobbySnapshot(lobby) : null
      });
      return;
    }

    if (method === 'PUT' && pathname === '/api/profile') {
      const session = assertAuth(req, res);
      if (!session) return;
      const body = await readJson(req);
      const displayName = normalizeDisplayName(body.displayName, session.user.username);
      const bio = String(body.bio || '').trim().slice(0, 160);
      const mainAnimal = normalizeAnimal(body.mainAnimal, session.user.main_animal);
      const accent = normalizeAccent(body.accent);
      const avatarStyle = ['spark', 'neon', 'badge', 'comic'].includes(body.avatarStyle) ? body.avatarStyle : 'spark';
      db.prepare(`
        UPDATE users
        SET display_name = ?, bio = ?, main_animal = ?, accent = ?, avatar_style = ?
        WHERE id = ?
      `).run(displayName, bio, mainAnimal, accent, avatarStyle, session.user.id);
      sendJson(res, 200, { user: publicUser(statements.userById.get(session.user.id)) });
      return;
    }

    if (method === 'GET' && pathname === '/api/users/search') {
      const session = assertAuth(req, res);
      if (!session) return;
      const q = String(url.searchParams.get('q') || '').trim();
      if (q.length < 2) return sendJson(res, 200, { users: [] });
      const rows = db.prepare(`
        SELECT id, username, email, display_name, bio, main_animal, accent, avatar_style, wins, losses, created_at
        FROM users
        WHERE id <> ?
          AND (lower(username) LIKE lower(?) OR lower(display_name) LIKE lower(?))
        ORDER BY wins DESC, username ASC
        LIMIT 12
      `).all(session.user.id, `%${q}%`, `%${q}%`);
      sendJson(res, 200, {
        users: rows.map((row) => ({
          ...publicUser(row),
          relationship: relationshipStatus(session.user.id, row.id),
          online: isUserOnline(row.id)
        }))
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/friends') {
      const session = assertAuth(req, res);
      if (!session) return;
      sendJson(res, 200, getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && pathname === '/api/friends/request') {
      const session = assertAuth(req, res);
      if (!session) return;
      const body = await readJson(req);
      const target = body.userId
        ? statements.privateUserById.get(Number(body.userId))
        : statements.privateUserByUsername.get(normalizeUsername(body.username));
      if (!target) return sendError(res, 404, 'Joueur introuvable');
      if (target.id === session.user.id) return sendError(res, 400, 'Impossible de t’ajouter toi-même');

      const existing = db.prepare(`
        SELECT * FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)
      `).get(session.user.id, target.id, target.id, session.user.id);

      if (existing?.status === 'accepted') return sendJson(res, 200, { ok: true, status: 'friends' });
      if (existing?.status === 'pending' && existing.addressee_id === session.user.id) {
        db.prepare('UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('accepted', existing.id);
      } else if (!existing) {
        db.prepare('INSERT INTO friendships(requester_id, addressee_id, status) VALUES (?, ?, ?)').run(session.user.id, target.id, 'pending');
      }

      sendToUser(target.id, { type: 'friends', friends: getFriendsPayload(target.id) });
      sendJson(res, 200, getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && pathname === '/api/friends/respond') {
      const session = assertAuth(req, res);
      if (!session) return;
      const body = await readJson(req);
      const id = Number(body.friendshipId);
      const action = body.action === 'accept' ? 'accept' : 'decline';
      const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(id);
      if (!friendship || friendship.addressee_id !== session.user.id || friendship.status !== 'pending') {
        return sendError(res, 404, 'Demande introuvable');
      }
      if (action === 'accept') {
        db.prepare('UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('accepted', id);
      } else {
        db.prepare('DELETE FROM friendships WHERE id = ?').run(id);
      }
      sendToUser(friendship.requester_id, { type: 'friends', friends: getFriendsPayload(friendship.requester_id) });
      sendJson(res, 200, getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && pathname === '/api/lobbies') {
      const session = assertAuth(req, res);
      if (!session) return;
      const body = await readJson(req);
      const settings = {
        maxPlayers: normalizeMaxPlayers(body.maxPlayers),
        bestOf: normalizeBestOf(body.bestOf),
        roundSeconds: normalizeRoundSeconds(body.roundSeconds)
      };
      const id = slugId('lobby');
      let code = lobbyCode();
      while (statements.lobbyByCode.get(code)) code = lobbyCode();
      db.prepare(`
        INSERT INTO lobbies(id, code, owner_id, settings_json, status)
        VALUES (?, ?, ?, ?, 'open')
      `).run(id, code, session.user.id, JSON.stringify(settings));
      db.prepare(`
        INSERT INTO lobby_players(lobby_id, user_id, animal, ready)
        VALUES (?, ?, ?, 0)
      `).run(id, session.user.id, normalizeAnimal(body.firstAnimal, session.user.main_animal));
      sendJson(res, 201, { lobby: getLobbySnapshot(statements.lobbyById.get(id)) });
      return;
    }

    const lobbyMatch = pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]+)(?:\/([a-z]+))?$/);
    if (lobbyMatch) {
      const session = assertAuth(req, res);
      if (!session) return;
      const code = lobbyMatch[1];
      const action = lobbyMatch[2] || null;
      const lobby = statements.lobbyByCode.get(code);
      if (!lobby) return sendError(res, 404, 'Lobby introuvable');

      if (method === 'GET' && !action) {
        sendJson(res, 200, { lobby: getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'POST' && action === 'join') {
        if (lobby.status !== 'open') return sendError(res, 409, 'La partie a déjà commencé');
        const body = await readJson(req);
        const players = statements.lobbyPlayers.all(lobby.id);
        const settings = jsonParseSafe(lobby.settings_json, { maxPlayers: MIN_PLAYERS });
        const maxPlayers = normalizeMaxPlayers(settings.maxPlayers);
        const existing = players.find((player) => player.user_id === session.user.id);
        if (!existing && players.length >= maxPlayers) return sendError(res, 409, 'Lobby complet');
        db.prepare(`
          INSERT INTO lobby_players(lobby_id, user_id, animal, ready)
          VALUES (?, ?, ?, 0)
          ON CONFLICT(lobby_id, user_id) DO UPDATE SET animal = excluded.animal
        `).run(lobby.id, session.user.id, normalizeAnimal(body.firstAnimal, session.user.main_animal));
        updateLobbyTimestamp(lobby.id);
        broadcastLobby(lobby.id);
        sendJson(res, 200, { lobby: getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'POST' && action === 'leave') {
        const member = assertLobbyMember(lobby.id, session.user.id);
        if (!member) return sendError(res, 404, 'Tu n’es pas dans ce lobby');
        if (lobby.status === 'in_game') return sendError(res, 409, 'Partie en cours');
        db.prepare('DELETE FROM lobby_players WHERE lobby_id = ? AND user_id = ?').run(lobby.id, session.user.id);
        const remaining = statements.lobbyPlayers.all(lobby.id);
        if (remaining.length === 0) {
          db.prepare('DELETE FROM lobbies WHERE id = ?').run(lobby.id);
        } else if (lobby.owner_id === session.user.id) {
          db.prepare('UPDATE lobbies SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(remaining[0].user_id, lobby.id);
        }
        broadcastLobby(lobby.id);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === 'POST' && action === 'ready') {
        const body = await readJson(req);
        const member = assertLobbyMember(lobby.id, session.user.id);
        if (!member) return sendError(res, 404, 'Tu n’es pas dans ce lobby');
        if (lobby.status !== 'open') return sendError(res, 409, 'Partie déjà lancée');
        db.prepare('UPDATE lobby_players SET ready = ?, animal = ? WHERE lobby_id = ? AND user_id = ?')
          .run(body.ready ? 1 : 0, normalizeAnimal(body.firstAnimal, member.animal), lobby.id, session.user.id);
        updateLobbyTimestamp(lobby.id);
        broadcastLobby(lobby.id);
        sendJson(res, 200, { lobby: getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'PUT' && action === 'settings') {
        if (lobby.owner_id !== session.user.id) return sendError(res, 403, 'Seul le créateur peut modifier le lobby');
        if (lobby.status !== 'open') return sendError(res, 409, 'Partie déjà lancée');
        const body = await readJson(req);
        const players = statements.lobbyPlayers.all(lobby.id);
        const maxPlayers = normalizeMaxPlayers(body.maxPlayers);
        if (players.length > maxPlayers) {
          return sendError(res, 400, `Impossible de passer à ${maxPlayers} joueurs avec ${players.length} joueurs dans le lobby`);
        }
        const settings = {
          maxPlayers,
          bestOf: normalizeBestOf(body.bestOf),
          roundSeconds: normalizeRoundSeconds(body.roundSeconds)
        };
        db.prepare('UPDATE lobbies SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(JSON.stringify(settings), lobby.id);
        broadcastLobby(lobby.id);
        sendJson(res, 200, { lobby: getLobbySnapshot(statements.lobbyById.get(lobby.id)) });
        return;
      }

      if (method === 'POST' && action === 'start') {
        try {
          const state = startMatch(lobby, session.user.id);
          sendJson(res, 200, { game: publicGameState(state), lobby: getLobbySnapshot(statements.lobbyById.get(lobby.id)) });
        } catch (error) {
          sendError(res, 400, error.message);
        }
        return;
      }
    }

    sendError(res, 404, 'Route inconnue');
  } catch (error) {
    console.error(error);
    const message = error instanceof SyntaxError ? 'JSON invalide' : error.message || 'Erreur serveur';
    sendError(res, 500, message);
  }
}

function handleStatic(req, res, url) {
  const requested = decodeURIComponent(url.pathname);
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);
  if (requested === '/' || !path.extname(filePath)) filePath = path.join(PUBLIC_DIR, 'index.html');

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES.get(ext) || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  res.end(readFileSync(filePath));
}

function handleWsUpgrade(req, socket) {
  const session = getSessionUser(req);
  const key = req.headers['sec-websocket-key'];
  if (!session || !key) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const accept = createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ].join('\r\n'));

  const client = {
    socket,
    user: session.user,
    subscriptions: new Set(),
    buffer: Buffer.alloc(0),
    voiceLastAt: new Map()
  };
  wsClients.add(client);
  sendWs(client, { type: 'hello', user: publicUser(session.user), animals: ANIMALS });

  socket.on('data', (chunk) => parseWsFrames(client, chunk));
  socket.on('close', () => wsClients.delete(client));
  socket.on('error', () => wsClients.delete(client));
}

function parseWsFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);

  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (client.buffer.length < offset + 2) return;
      length = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (client.buffer.length < offset + 8) return;
      const high = client.buffer.readUInt32BE(offset);
      const low = client.buffer.readUInt32BE(offset + 4);
      length = high * 2 ** 32 + low;
      offset += 8;
    }

    const frame = client.buffer;
    const maskOffset = offset;
    if (masked) offset += 4;
    if (client.buffer.length < offset + length) return;

    const payload = client.buffer.subarray(offset, offset + length);
    client.buffer = client.buffer.subarray(offset + length);

    if (opcode === 0x8) {
      client.socket.end();
      wsClients.delete(client);
      return;
    }
    if (opcode !== 0x1) continue;

    let data = payload;
    if (masked) {
      const mask = client.bufferMask || Buffer.alloc(4);
      frame.copy(mask, 0, maskOffset, maskOffset + 4);
      data = Buffer.from(payload);
      for (let i = 0; i < data.length; i += 1) data[i] ^= mask[i % 4];
    }

    try {
      handleWsMessage(client, JSON.parse(data.toString('utf8')));
    } catch (error) {
      sendWs(client, { type: 'error', error: 'Message WebSocket invalide' });
    }
  }
}

function handleWsMessage(client, message) {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'subscribeLobby') {
    const code = String(message.code || '').trim().toUpperCase();
    const lobby = statements.lobbyByCode.get(code);
    if (!lobby) return sendWs(client, { type: 'error', error: 'Lobby introuvable' });
    client.subscriptions.add(`lobby:${lobby.code}`);
    client.subscriptions.add(`lobby:${lobby.id}`);
    sendWs(client, { type: 'lobby', lobby: getLobbySnapshot(lobby) });
    const state = activeMatches.get(lobby.id) || restoreMatch(lobby.id);
    if (state) sendWs(client, { type: 'game', game: publicGameState(state) });
    return;
  }

  if (message.type === 'voiceTick') {
    handleVoiceTick(client, message);
    return;
  }

  if (message.type === 'inviteFriend') {
    const friendId = Number(message.friendId);
    const code = String(message.code || '').trim().toUpperCase();
    const lobby = statements.lobbyByCode.get(code);
    if (!friendId || !lobby || !areFriends(client.user.id, friendId)) return;
    if (!assertLobbyMember(lobby.id, client.user.id)) return;
    sendToUser(friendId, {
      type: 'invite',
      from: publicUser(client.user),
      lobby: getLobbySnapshot(lobby)
    });
    sendWs(client, { type: 'toast', tone: 'good', message: 'Invitation envoyée' });
    return;
  }

  if (message.type === 'ping') {
    sendWs(client, { type: 'pong', at: Date.now() });
  }
}

function sendWs(client, payload) {
  if (client.socket.destroyed) return;
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  client.socket.write(Buffer.concat([header, data]));
}

setInterval(() => {
  for (const state of activeMatches.values()) {
    const round = state.currentRound;
    if (state.status === 'playing' && round?.status === 'playing' && Date.now() >= round.endsAt) {
      endRound(state, null, 'time');
    }
  }
}, 500);

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
  } else {
    handleStatic(req, res, url);
  }
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/ws') {
    handleWsUpgrade(req, socket);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Cri Animaux Arena prêt sur http://localhost:${PORT}`);
});
