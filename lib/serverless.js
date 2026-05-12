import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import postgres from 'postgres';

const SESSION_DAYS = 14;

export const ANIMALS = [
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
      { id: 'frog_classic', text: 'croa croa', aliases: ['croa croa', 'ribbit ribbit'], hint: 'marecage standard', mode: 'classic', multiplier: 1 },
      { id: 'frog_bounce', text: 'croa-hop croa', aliases: ['croa hop croa', 'croa croa hop'], hint: 'saute dans le rythme', mode: 'combo', multiplier: 1.18 },
      { id: 'frog_rap', text: 'croa croa croa', aliases: ['croa croa croa', 'ribbit ribbit ribbit'], hint: 'rafale rapide', mode: 'rap', multiplier: 1.28 }
    ]
  },
  {
    id: 'rooster',
    name: 'Coq',
    phrase: 'cocorico',
    aliases: ['cocorico'],
    prompts: [
      { id: 'rooster_classic', text: 'cocorico !', aliases: ['cocorico'], hint: 'reveil du village', mode: 'hold', multiplier: 1.14 },
      { id: 'rooster_rap', text: 'coco-rico rap', aliases: ['coco rico', 'coco rico rico', 'cocorico cocorico'], hint: 'flow de basse-cour', mode: 'rap', multiplier: 1.28 },
      { id: 'rooster_combo', text: 'cot cot cocorico', aliases: ['cot cot cocorico', 'kot kot cocorico'], hint: 'echauffement puis cri', mode: 'combo', multiplier: 1.18 }
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
      { id: 'pig_rap', text: 'groin-groin rap', aliases: ['groin groin groin', 'oink oink oink'], hint: 'freestyle rose', mode: 'rap', multiplier: 1.26 }
    ]
  },
  {
    id: 'sheep',
    name: 'Mouton',
    phrase: 'beee',
    aliases: ['beee', 'baa'],
    prompts: [
      { id: 'sheep_hold', text: 'beee long', aliases: ['be', 'beee', 'baa'], hint: 'tiens le cri', mode: 'hold', multiplier: 1.12 },
      { id: 'sheep_combo', text: 'be be beee', aliases: ['be be be', 'be be beee', 'baa baa baa'], hint: 'troupeau en montee', mode: 'combo', multiplier: 1.18 },
      { id: 'sheep_rap', text: 'be-be rap', aliases: ['be be be be', 'baa baa baa baa'], hint: 'bergerie rapide', mode: 'rap', multiplier: 1.26 }
    ]
  },
  {
    id: 'fox',
    name: 'Renard',
    phrase: 'yip yip',
    aliases: ['yip', 'wa-pa'],
    prompts: [
      { id: 'fox_classic', text: 'yip yip', aliases: ['yip yip', 'yap yap'], hint: 'cri malin', mode: 'classic', multiplier: 1 },
      { id: 'fox_weird', text: 'wa-pa-pa yip', aliases: ['wa pa pa yip', 'wapapa yip', 'wa pa yip'], hint: 'meme accepte', mode: 'combo', multiplier: 1.2 },
      { id: 'fox_rap', text: 'yip-yip rap', aliases: ['yip yip yip', 'yap yap yap'], hint: 'rap des bois', mode: 'rap', multiplier: 1.28 }
    ]
  }
];

let sqlClient;

class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function database() {
  const connectionString =
    process.env.SUPABASE_POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new HttpError(500, 'Base Supabase non configuree dans Vercel');
  }

  sqlClient ||= postgres(connectionString, {
    ssl: 'require',
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });
  return sqlClient;
}

function routeFromRequest(req) {
  const raw = req.query?.path;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (parts.length) return `/${parts.join('/')}`;
  return new URL(req.url || '/api', 'https://local.test').pathname.replace(/^\/api/, '') || '/';
}

function numberId(value) {
  return Number(value);
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: numberId(row.id),
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio || '',
    mainAnimal: row.main_animal,
    accent: row.accent,
    avatarStyle: row.avatar_style,
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    createdAt: row.created_at
  };
}

function publicLobbyPlayer(row) {
  return {
    id: numberId(row.user_id),
    username: row.username,
    displayName: row.display_name,
    mainAnimal: row.main_animal,
    accent: row.accent,
    avatarStyle: row.avatar_style,
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    lobbyAnimal: row.animal,
    ready: Boolean(row.ready),
    online: false
  };
}

function jsonValue(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
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
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
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

function sessionCookie(req, token, maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.VERCEL);
  return `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(req) {
  return sessionCookie(req, '', 0);
}

async function makeSession(req, userId) {
  const sql = database();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await sql`insert into public.sessions(token, user_id, expires_at) values (${token}, ${userId}, ${expiresAt})`;
  return { token, expiresAt, cookie: sessionCookie(req, token) };
}

async function getSessionUser(req) {
  const sql = database();
  await sql`delete from public.sessions where expires_at < ${Date.now()}`;
  const token = parseCookies(req).session;
  if (!token) return null;
  const [row] = await sql`
    select s.token, s.expires_at, u.*
    from public.sessions s
    join public.users u on u.id = s.user_id
    where s.token = ${token}
    limit 1
  `;
  if (!row || Number(row.expires_at) < Date.now()) {
    await sql`delete from public.sessions where token = ${token}`;
    return null;
  }
  return { token, user: row };
}

async function requireAuth(req) {
  const session = await getSessionUser(req);
  if (!session) throw new HttpError(401, 'Connexion requise');
  return session;
}

function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1024 * 1024) throw new HttpError(413, 'Payload trop grand');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function getLobbyByCode(code) {
  const sql = database();
  const [lobby] = await sql`select * from public.lobbies where code = ${String(code || '').toUpperCase()} limit 1`;
  return lobby || null;
}

async function getLobbyPlayers(lobbyId) {
  const sql = database();
  return sql`
    select lp.lobby_id, lp.user_id, lp.animal, lp.ready, lp.joined_at,
      u.username, u.display_name, u.main_animal, u.accent, u.avatar_style, u.wins, u.losses
    from public.lobby_players lp
    join public.users u on u.id = lp.user_id
    where lp.lobby_id = ${lobbyId}
    order by lp.joined_at asc
  `;
}

async function getLobbySnapshot(lobby) {
  if (!lobby) return null;
  const sql = database();
  const players = (await getLobbyPlayers(lobby.id)).map(publicLobbyPlayer);
  const [matchRow] = await sql`
    select * from public.matches
    where lobby_id = ${lobby.id}
    order by created_at desc
    limit 1
  `;
  const matchState = matchRow?.status === 'playing' ? jsonValue(matchRow.state_json, null) : null;
  return {
    id: lobby.id,
    code: lobby.code,
    ownerId: numberId(lobby.owner_id),
    status: lobby.status,
    settings: jsonValue(lobby.settings_json, { bestOf: 3, roundSeconds: 30 }),
    players,
    match: matchState ? publicGameState(matchState) : null,
    createdAt: lobby.created_at,
    updatedAt: lobby.updated_at
  };
}

async function activeLobbyForUser(userId) {
  const sql = database();
  const [lobby] = await sql`
    select l.*
    from public.lobbies l
    join public.lobby_players lp on lp.lobby_id = l.id
    where lp.user_id = ${userId} and l.status in ('open', 'in_game')
    order by l.updated_at desc
    limit 1
  `;
  return lobby || null;
}

async function getFriendsPayload(userId) {
  const sql = database();
  const rows = await sql`
    select f.*,
      requester.username as requester_username,
      requester.display_name as requester_display_name,
      requester.main_animal as requester_main_animal,
      requester.accent as requester_accent,
      requester.avatar_style as requester_avatar_style,
      requester.wins as requester_wins,
      requester.losses as requester_losses,
      addressee.username as addressee_username,
      addressee.display_name as addressee_display_name,
      addressee.main_animal as addressee_main_animal,
      addressee.accent as addressee_accent,
      addressee.avatar_style as addressee_avatar_style,
      addressee.wins as addressee_wins,
      addressee.losses as addressee_losses
    from public.friendships f
    join public.users requester on requester.id = f.requester_id
    join public.users addressee on addressee.id = f.addressee_id
    where f.requester_id = ${userId} or f.addressee_id = ${userId}
    order by f.updated_at desc
  `;

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const row of rows) {
    const requesterId = numberId(row.requester_id);
    const addresseeId = numberId(row.addressee_id);
    const otherIsRequester = requesterId !== numberId(userId);
    const other = otherIsRequester
      ? {
          id: requesterId,
          username: row.requester_username,
          displayName: row.requester_display_name,
          mainAnimal: row.requester_main_animal,
          accent: row.requester_accent,
          avatarStyle: row.requester_avatar_style,
          wins: Number(row.requester_wins || 0),
          losses: Number(row.requester_losses || 0),
          online: false
        }
      : {
          id: addresseeId,
          username: row.addressee_username,
          displayName: row.addressee_display_name,
          mainAnimal: row.addressee_main_animal,
          accent: row.addressee_accent,
          avatarStyle: row.addressee_avatar_style,
          wins: Number(row.addressee_wins || 0),
          losses: Number(row.addressee_losses || 0),
          online: false
        };

    if (row.status === 'accepted') {
      friends.push({ friendshipId: numberId(row.id), user: other });
    } else if (row.status === 'pending' && addresseeId === numberId(userId)) {
      incoming.push({ friendshipId: numberId(row.id), user: other });
    } else if (row.status === 'pending' && requesterId === numberId(userId)) {
      outgoing.push({ friendshipId: numberId(row.id), user: other });
    }
  }

  return { friends, incoming, outgoing };
}

async function relationshipStatus(selfId, otherId) {
  const sql = database();
  const [row] = await sql`
    select *
    from public.friendships
    where (requester_id = ${selfId} and addressee_id = ${otherId})
       or (requester_id = ${otherId} and addressee_id = ${selfId})
    limit 1
  `;
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return numberId(row.requester_id) === numberId(selfId) ? 'outgoing' : 'incoming';
}

function animalById(id) {
  return ANIMALS.find((animal) => animal.id === id) || ANIMALS[0];
}

function randomAnimal(exclude = null) {
  const pool = ANIMALS.filter((animal) => animal.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function randomChallenge(animalId, previousChallengeId = null) {
  const prompts = animalById(animalId).prompts || [];
  const pool = prompts.filter((prompt) => prompt.id !== previousChallengeId);
  return (pool.length ? pool : prompts)[Math.floor(Math.random() * (pool.length ? pool.length : prompts.length))] || {
    id: `${animalId}_classic`,
    text: animalById(animalId).phrase,
    aliases: [animalById(animalId).phrase, ...(animalById(animalId).aliases || [])],
    hint: 'cri classique',
    mode: 'classic',
    multiplier: 1
  };
}

function publicGameState(state) {
  return { ...state, serverNow: Date.now() };
}

function beginRound(state, players, firstRound = false) {
  const now = Date.now();
  const animalsByUser = {};
  const progressByUser = {};
  const challengesByUser = {};
  const phrasesByUser = {};

  for (const player of players) {
    const previous = state.previousAnimals[player.id] || null;
    const selected = firstRound ? normalizeAnimal(player.selectedAnimal, player.mainAnimal) : randomAnimal(previous);
    const challenge = randomChallenge(selected, state.previousChallenges[player.id] || null);
    animalsByUser[player.id] = selected;
    progressByUser[player.id] = 0;
    challengesByUser[player.id] = challenge;
    phrasesByUser[player.id] = challenge.text;
    state.previousAnimals[player.id] = selected;
    state.previousChallenges[player.id] = challenge.id;
  }

  state.currentRound = {
    number: state.rounds.length + 1,
    status: 'playing',
    countdownEndsAt: now,
    endsAt: now + state.roundSeconds * 1000,
    winnerId: null,
    animalsByUser,
    phrasesByUser,
    challengesByUser,
    progressByUser
  };
}

async function startMatch(lobby, actorId) {
  if (numberId(lobby.owner_id) !== numberId(actorId)) throw new HttpError(403, 'Seul le créateur peut lancer la partie');
  if (lobby.status !== 'open') throw new HttpError(409, "Ce lobby n'est pas disponible");

  const sql = database();
  const players = await getLobbyPlayers(lobby.id);
  if (players.length !== 2) throw new HttpError(400, 'Il faut exactement 2 joueurs');
  if (players.some((player) => !player.ready)) throw new HttpError(400, 'Les deux joueurs doivent être prêts');

  const settings = jsonValue(lobby.settings_json, { bestOf: 3, roundSeconds: 30 });
  const gamePlayers = players.map((player) => ({
    id: numberId(player.user_id),
    username: player.username,
    displayName: player.display_name,
    mainAnimal: player.main_animal,
    accent: player.accent,
    avatarStyle: player.avatar_style,
    selectedAnimal: normalizeAnimal(player.animal, player.main_animal)
  }));
  const state = {
    id: slugId('match'),
    lobbyId: lobby.id,
    lobbyCode: lobby.code,
    status: 'playing',
    bestOf: normalizeBestOf(settings.bestOf),
    targetWins: Math.ceil(normalizeBestOf(settings.bestOf) / 2),
    winnerId: null,
    roundSeconds: normalizeRoundSeconds(settings.roundSeconds),
    players: gamePlayers,
    roundWins: Object.fromEntries(gamePlayers.map((player) => [player.id, 0])),
    previousAnimals: {},
    previousChallenges: {},
    currentRound: null,
    rounds: []
  };

  beginRound(state, gamePlayers, true);

  await sql`
    insert into public.matches(id, lobby_id, settings_json, state_json, status)
    values (${state.id}, ${lobby.id}, ${sql.json(settings)}, ${sql.json(state)}, 'playing')
  `;
  await sql`update public.lobbies set status = 'in_game' where id = ${lobby.id}`;
  return state;
}

async function touchLobby(lobbyId) {
  const sql = database();
  await sql`update public.lobbies set updated_at = now() where id = ${lobbyId}`;
}

async function handleAuthRegister(req, res) {
  const sql = database();
  const body = await readJson(req);
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (username.length < 3) throw new HttpError(400, 'Pseudo trop court');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email invalide');
  if (password.length < 8) throw new HttpError(400, 'Mot de passe trop court');

  const { salt, hash } = hashPassword(password);
  const displayName = normalizeDisplayName(body.displayName, username);
  const mainAnimal = normalizeAnimal(body.mainAnimal, 'dog');
  const accent = normalizeAccent(body.accent);
  const [user] = await sql`
    insert into public.users(username, email, password_hash, salt, display_name, main_animal, accent)
    values (${username}, ${email}, ${hash}, ${salt}, ${displayName}, ${mainAnimal}, ${accent})
    returning *
  `;
  const session = await makeSession(req, user.id);
  sendJson(res, 201, { user: publicUser(user) }, { 'Set-Cookie': session.cookie });
}

async function handleAuthLogin(req, res) {
  const sql = database();
  const body = await readJson(req);
  const identifier = String(body.identifier || body.username || '').trim();
  const password = String(body.password || '');
  const [row] = identifier.includes('@')
    ? await sql`select * from public.users where email = ${normalizeEmail(identifier)} limit 1`
    : await sql`select * from public.users where username = ${normalizeUsername(identifier)} limit 1`;

  if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
    throw new HttpError(401, 'Identifiants invalides');
  }
  const session = await makeSession(req, row.id);
  sendJson(res, 200, { user: publicUser(row) }, { 'Set-Cookie': session.cookie });
}

export async function handleApi(req, res) {
  const method = req.method || 'GET';
  const route = routeFromRequest(req);

  try {
    if (method === 'GET' && route === '/health') {
      sendJson(res, 200, { ok: true, animals: ANIMALS });
      return;
    }

    if (method === 'GET' && route === '/animals') {
      sendJson(res, 200, { animals: ANIMALS });
      return;
    }

    const sql = database();

    if (method === 'POST' && route === '/auth/register') {
      await handleAuthRegister(req, res);
      return;
    }

    if (method === 'POST' && route === '/auth/login') {
      await handleAuthLogin(req, res);
      return;
    }

    if (method === 'POST' && route === '/auth/logout') {
      const session = await getSessionUser(req);
      if (session) await sql`delete from public.sessions where token = ${session.token}`;
      sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(req) });
      return;
    }

    if (method === 'GET' && route === '/me') {
      const session = await getSessionUser(req);
      if (!session) {
        sendJson(res, 200, { user: null, friends: { friends: [], incoming: [], outgoing: [] }, activeLobby: null });
        return;
      }
      const lobby = await activeLobbyForUser(session.user.id);
      sendJson(res, 200, {
        user: publicUser(session.user),
        friends: await getFriendsPayload(session.user.id),
        activeLobby: lobby ? await getLobbySnapshot(lobby) : null
      });
      return;
    }

    if (method === 'PUT' && route === '/profile') {
      const session = await requireAuth(req);
      const body = await readJson(req);
      const displayName = normalizeDisplayName(body.displayName, session.user.username);
      const bio = String(body.bio || '').trim().slice(0, 160);
      const mainAnimal = normalizeAnimal(body.mainAnimal, session.user.main_animal);
      const accent = normalizeAccent(body.accent);
      const avatarStyle = ['spark', 'neon', 'badge', 'comic'].includes(body.avatarStyle) ? body.avatarStyle : 'spark';
      const [user] = await sql`
        update public.users
        set display_name = ${displayName}, bio = ${bio}, main_animal = ${mainAnimal}, accent = ${accent}, avatar_style = ${avatarStyle}
        where id = ${session.user.id}
        returning *
      `;
      sendJson(res, 200, { user: publicUser(user) });
      return;
    }

    if (method === 'GET' && route === '/users/search') {
      const session = await requireAuth(req);
      const q = String(req.query?.q || '').trim();
      if (q.length < 2) return sendJson(res, 200, { users: [] });
      const rows = await sql`
        select id, username, email, display_name, bio, main_animal, accent, avatar_style, wins, losses, created_at
        from public.users
        where id <> ${session.user.id}
          and (username::text ilike ${`%${q}%`} or display_name ilike ${`%${q}%`})
        order by wins desc, username asc
        limit 12
      `;
      const users = [];
      for (const row of rows) {
        users.push({ ...publicUser(row), relationship: await relationshipStatus(session.user.id, row.id), online: false });
      }
      sendJson(res, 200, { users });
      return;
    }

    if (method === 'GET' && route === '/friends') {
      const session = await requireAuth(req);
      sendJson(res, 200, await getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && route === '/friends/request') {
      const session = await requireAuth(req);
      const body = await readJson(req);
      const [target] = body.userId
        ? await sql`select * from public.users where id = ${Number(body.userId)} limit 1`
        : await sql`select * from public.users where username = ${normalizeUsername(body.username)} limit 1`;
      if (!target) throw new HttpError(404, 'Joueur introuvable');
      if (numberId(target.id) === numberId(session.user.id)) throw new HttpError(400, "Impossible de t'ajouter toi-même");

      const [existing] = await sql`
        select * from public.friendships
        where (requester_id = ${session.user.id} and addressee_id = ${target.id})
           or (requester_id = ${target.id} and addressee_id = ${session.user.id})
        limit 1
      `;
      if (existing?.status === 'accepted') return sendJson(res, 200, await getFriendsPayload(session.user.id));
      if (existing?.status === 'pending' && numberId(existing.addressee_id) === numberId(session.user.id)) {
        await sql`update public.friendships set status = 'accepted' where id = ${existing.id}`;
      } else if (!existing) {
        await sql`
          insert into public.friendships(requester_id, addressee_id, status)
          values (${session.user.id}, ${target.id}, 'pending')
        `;
      }
      sendJson(res, 200, await getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && route === '/friends/respond') {
      const session = await requireAuth(req);
      const body = await readJson(req);
      const id = Number(body.friendshipId);
      const [friendship] = await sql`select * from public.friendships where id = ${id} limit 1`;
      if (!friendship || numberId(friendship.addressee_id) !== numberId(session.user.id) || friendship.status !== 'pending') {
        throw new HttpError(404, 'Demande introuvable');
      }
      if (body.action === 'accept') {
        await sql`update public.friendships set status = 'accepted' where id = ${id}`;
      } else {
        await sql`delete from public.friendships where id = ${id}`;
      }
      sendJson(res, 200, await getFriendsPayload(session.user.id));
      return;
    }

    if (method === 'POST' && route === '/lobbies') {
      const session = await requireAuth(req);
      const body = await readJson(req);
      const settings = { bestOf: normalizeBestOf(body.bestOf), roundSeconds: normalizeRoundSeconds(body.roundSeconds) };
      const id = slugId('lobby');
      let code = lobbyCode();
      while (await getLobbyByCode(code)) code = lobbyCode();
      await sql`
        insert into public.lobbies(id, code, owner_id, settings_json, status)
        values (${id}, ${code}, ${session.user.id}, ${sql.json(settings)}, 'open')
      `;
      await sql`
        insert into public.lobby_players(lobby_id, user_id, animal, ready)
        values (${id}, ${session.user.id}, ${normalizeAnimal(body.firstAnimal, session.user.main_animal)}, false)
      `;
      const [lobby] = await sql`select * from public.lobbies where id = ${id}`;
      sendJson(res, 201, { lobby: await getLobbySnapshot(lobby) });
      return;
    }

    const lobbyMatch = route.match(/^\/lobbies\/([A-Za-z0-9]+)(?:\/([a-z]+))?$/);
    if (lobbyMatch) {
      const session = await requireAuth(req);
      const code = lobbyMatch[1];
      const action = lobbyMatch[2] || null;
      const lobby = await getLobbyByCode(code);
      if (!lobby) throw new HttpError(404, 'Lobby introuvable');

      if (method === 'GET' && !action) {
        sendJson(res, 200, { lobby: await getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'POST' && action === 'join') {
        if (lobby.status !== 'open') throw new HttpError(409, 'La partie a déjà commencé');
        const body = await readJson(req);
        const players = await getLobbyPlayers(lobby.id);
        const existing = players.find((player) => numberId(player.user_id) === numberId(session.user.id));
        if (!existing && players.length >= 2) throw new HttpError(409, 'Lobby complet');
        await sql`
          insert into public.lobby_players(lobby_id, user_id, animal, ready)
          values (${lobby.id}, ${session.user.id}, ${normalizeAnimal(body.firstAnimal, session.user.main_animal)}, false)
          on conflict(lobby_id, user_id) do update set animal = excluded.animal
        `;
        await touchLobby(lobby.id);
        sendJson(res, 200, { lobby: await getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'POST' && action === 'ready') {
        const body = await readJson(req);
        const [member] = await sql`
          select * from public.lobby_players
          where lobby_id = ${lobby.id} and user_id = ${session.user.id}
          limit 1
        `;
        if (!member) throw new HttpError(404, "Tu n'es pas dans ce lobby");
        if (lobby.status !== 'open') throw new HttpError(409, 'Partie déjà lancée');
        await sql`
          update public.lobby_players
          set ready = ${Boolean(body.ready)}, animal = ${normalizeAnimal(body.firstAnimal, member.animal)}
          where lobby_id = ${lobby.id} and user_id = ${session.user.id}
        `;
        await touchLobby(lobby.id);
        sendJson(res, 200, { lobby: await getLobbySnapshot(lobby) });
        return;
      }

      if (method === 'POST' && action === 'leave') {
        await sql`delete from public.lobby_players where lobby_id = ${lobby.id} and user_id = ${session.user.id}`;
        const remaining = await getLobbyPlayers(lobby.id);
        if (!remaining.length) {
          await sql`delete from public.lobbies where id = ${lobby.id}`;
        } else if (numberId(lobby.owner_id) === numberId(session.user.id)) {
          await sql`update public.lobbies set owner_id = ${remaining[0].user_id} where id = ${lobby.id}`;
        } else {
          await touchLobby(lobby.id);
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === 'PUT' && action === 'settings') {
        if (numberId(lobby.owner_id) !== numberId(session.user.id)) throw new HttpError(403, 'Seul le créateur peut modifier le lobby');
        if (lobby.status !== 'open') throw new HttpError(409, 'Partie déjà lancée');
        const body = await readJson(req);
        const settings = { bestOf: normalizeBestOf(body.bestOf), roundSeconds: normalizeRoundSeconds(body.roundSeconds) };
        await sql`update public.lobbies set settings_json = ${sql.json(settings)} where id = ${lobby.id}`;
        const updated = await getLobbyByCode(code);
        sendJson(res, 200, { lobby: await getLobbySnapshot(updated) });
        return;
      }

      if (method === 'POST' && action === 'start') {
        const state = await startMatch(lobby, session.user.id);
        const updated = await getLobbyByCode(code);
        sendJson(res, 200, { game: publicGameState(state), lobby: await getLobbySnapshot(updated) });
        return;
      }
    }

    throw new HttpError(404, 'Route API inconnue');
  } catch (error) {
    const status = error.status || (error.code === '23505' ? 409 : 500);
    let message = error.message || 'Erreur serveur';
    if (error.code === '23505') message = 'Pseudo ou email déjà utilisé';
    if (error.code === '42P01') message = 'Schema Supabase manquant: lance supabase/schema.sql dans le SQL Editor';
    if (error instanceof SyntaxError) message = 'JSON invalide';
    console.error(error);
    sendJson(res, status, { error: message, details: error.details });
  }
}
