const app = document.querySelector('#app');
const toasts = document.querySelector('#toasts');

const state = {
  user: null,
  friends: { friends: [], incoming: [], outgoing: [] },
  animals: [],
  activeLobby: null,
  viewedLobby: null,
  game: null,
  route: location.hash || '#/',
  authMode: 'login',
  searchResults: [],
  ws: null,
  wsOpen: false,
  wsRetries: 0,
  pendingLobbySubscriptions: new Set(),
  subscribedLobbyCodes: new Set(),
  selectedAnimals: new Map(),
  serverOffset: 0,
  mic: {
    active: false,
    level: 0,
    phraseHitUntil: 0,
    phraseHitChallengeId: '',
    segments: [],       // { text: string, at: number }[]
    lastHitAt: 0,       // timestamp of last phrase detection
    lastHeard: '',      // most recent STT text (for display)
    lastMatch: '',
    error: '',
    analyser: null,
    data: null,
    interval: null,
    recognition: null,
    stream: null,
    context: null
  }
};

const fallbackAnimals = [
  { id: 'dog', name: 'Chien', phrase: 'waf waf', aliases: ['waf', 'ouaf', 'woof'], prompts: [{ id: 'dog_classic', text: 'waf waf', aliases: ['waf waf', 'ouaf ouaf', 'woof woof'], hint: 'aboiement propre', mode: 'classic', multiplier: 1 }, { id: 'dog_grr', text: 'grrr... waf waf', aliases: ['grr waf', 'grrr waf', 'grogne waf'], hint: 'grogne puis aboie', mode: 'combo', multiplier: 1.12 }, { id: 'dog_rap', text: 'waf-waf rap', aliases: ['waf waf waf', 'ouaf ouaf ouaf', 'wafwafwaf'], hint: 'enchaîne vite', mode: 'rap', multiplier: 1.28 }] },
  { id: 'cat', name: 'Chat', phrase: 'miaou', aliases: ['miaou', 'meow'], prompts: [{ id: 'cat_classic', text: 'miaouuu', aliases: ['miaou', 'miaouu', 'meow'], hint: 'long et dramatique', mode: 'hold', multiplier: 1.08 }, { id: 'cat_purr', text: 'mrrrr miaou', aliases: ['mrrr miaou', 'mrrrr miaou', 'ronron miaou'], hint: 'ronron puis miaou', mode: 'combo', multiplier: 1.16 }, { id: 'cat_rap', text: 'mi-mi-miaou', aliases: ['mi mi miaou', 'mimi miaou', 'miaou miaou miaou'], hint: 'flow félin', mode: 'rap', multiplier: 1.26 }] },
  { id: 'duck', name: 'Canard', phrase: 'coin coin', aliases: ['coin', 'quack'], prompts: [{ id: 'duck_classic', text: 'coin coin', aliases: ['coin coin', 'quack quack'], hint: 'bec bien fermé', mode: 'classic', multiplier: 1 }, { id: 'duck_rap', text: 'coin coin coin', aliases: ['coin coin coin', 'quack quack quack'], hint: 'canard en rafale', mode: 'rap', multiplier: 1.3 }, { id: 'duck_funky', text: 'coin-coin waak', aliases: ['coin coin waak', 'coin coin ouak', 'quack quack waak'], hint: 'final bizarre accepté', mode: 'combo', multiplier: 1.18 }] },
  { id: 'cow', name: 'Vache', phrase: 'meuh', aliases: ['meuh', 'moo'], prompts: [{ id: 'cow_hold', text: 'meuuuh long', aliases: ['meuh', 'meuuuh', 'moo'], hint: 'tiens le meuh', mode: 'hold', multiplier: 1.12 }, { id: 'cow_bass', text: 'meuh meuh basse', aliases: ['meuh meuh', 'moo moo'], hint: 'grave et lent', mode: 'classic', multiplier: 1.05 }, { id: 'cow_rap', text: 'meuh-meuh rap', aliases: ['meuh meuh meuh', 'moo moo moo'], hint: 'ruminant rapide', mode: 'rap', multiplier: 1.24 }] },
  { id: 'frog', name: 'Grenouille', phrase: 'croa croa', aliases: ['croa', 'ribbit'], prompts: [{ id: 'frog_classic', text: 'croa croa', aliases: ['croa croa', 'ribbit ribbit'], hint: 'marecage standard', mode: 'classic', multiplier: 1 }, { id: 'frog_bounce', text: 'croa-hop croa', aliases: ['croa hop croa', 'croa croa hop'], hint: 'saute dans le rythme', mode: 'combo', multiplier: 1.18 }, { id: 'frog_rap', text: 'croa croa croa', aliases: ['croa croa croa', 'ribbit ribbit ribbit'], hint: 'rafale rapide', mode: 'rap', multiplier: 1.28 }] },
  { id: 'rooster', name: 'Coq', phrase: 'cocorico', aliases: ['cocorico'], prompts: [{ id: 'rooster_classic', text: 'cocorico !', aliases: ['cocorico'], hint: 'reveil du village', mode: 'hold', multiplier: 1.14 }, { id: 'rooster_rap', text: 'coco-rico rap', aliases: ['coco rico', 'coco rico rico', 'cocorico cocorico'], hint: 'flow de basse-cour', mode: 'rap', multiplier: 1.28 }, { id: 'rooster_combo', text: 'cot cot cocorico', aliases: ['cot cot cocorico', 'kot kot cocorico'], hint: 'echauffement puis cri', mode: 'combo', multiplier: 1.18 }] },
  { id: 'pig', name: 'Cochon', phrase: 'groin groin', aliases: ['groin', 'oink'], prompts: [{ id: 'pig_classic', text: 'groin groin', aliases: ['groin groin', 'oink oink'], hint: 'nez en avant', mode: 'classic', multiplier: 1 }, { id: 'pig_snort', text: 'snrrrk groin', aliases: ['snrk groin', 'snrrrk groin', 'ronfle groin'], hint: 'petit reniflement', mode: 'combo', multiplier: 1.18 }, { id: 'pig_rap', text: 'groin-groin rap', aliases: ['groin groin groin', 'oink oink oink'], hint: 'freestyle rose', mode: 'rap', multiplier: 1.26 }] },
  { id: 'sheep', name: 'Mouton', phrase: 'beee', aliases: ['beee', 'baa'], prompts: [{ id: 'sheep_hold', text: 'beee long', aliases: ['be', 'beee', 'baa'], hint: 'tiens le cri', mode: 'hold', multiplier: 1.12 }, { id: 'sheep_combo', text: 'be be beee', aliases: ['be be be', 'be be beee', 'baa baa baa'], hint: 'troupeau en montee', mode: 'combo', multiplier: 1.18 }, { id: 'sheep_rap', text: 'be-be rap', aliases: ['be be be be', 'baa baa baa baa'], hint: 'bergerie rapide', mode: 'rap', multiplier: 1.26 }] },
  { id: 'fox', name: 'Renard', phrase: 'yip yip', aliases: ['yip', 'wa-pa'], prompts: [{ id: 'fox_classic', text: 'yip yip', aliases: ['yip yip', 'yap yap'], hint: 'cri malin', mode: 'classic', multiplier: 1 }, { id: 'fox_weird', text: 'wa-pa-pa yip', aliases: ['wa pa pa yip', 'wapapa yip', 'wa pa yip'], hint: 'meme accepte', mode: 'combo', multiplier: 1.2 }, { id: 'fox_rap', text: 'yip-yip rap', aliases: ['yip yip yip', 'yap yap yap'], hint: 'rap des bois', mode: 'rap', multiplier: 1.28 }] }
];

const h = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const PLAYER_COUNTS = [2, 3, 4];

function nowServer() {
  return Date.now() + state.serverOffset;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      const hint = response.status === 404
        ? 'API introuvable sur ce déploiement. Vérifie que le dernier commit est bien redéployé sur Vercel.'
        : "L'API a renvoyé une page au lieu du JSON attendu.";
      throw new Error(hint);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || `Erreur ${response.status}`);
  }
  return payload;
}

function toast(message, tone = '') {
  const node = document.createElement('div');
  node.className = `toast ${tone}`;
  node.textContent = message;
  toasts.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function animal(id) {
  return state.animals.find((entry) => entry.id === id) || state.animals[0] || fallbackAnimals[0];
}

function animalName(id) {
  return animal(id).name;
}

function animalPhrase(id) {
  return animal(id).phrase;
}

function normalizeSpeech(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function challengeAliases(challenge, animalId) {
  const entry = animal(animalId);
  if (!challenge) return [entry.phrase, ...(entry.aliases || [])];
  return [challenge.text, ...(challenge.aliases || [])];
}

function challengeKey(challenge, animalId) {
  return challenge?.id || animalId || '';
}

// Maximum age (ms) of speech segments used for phrase matching
const SEGMENT_MAX_AGE = 5000;
// Minimum gap (ms) between consecutive phrase-hit detections
const HIT_COOLDOWN = { hold: 600, rap: 250, combo: 400, classic: 400 };
// How far back (ms) to search for the phrase, per mode
const MATCH_WINDOW = { hold: 4000, rap: 2000, combo: 3500, classic: 3000 };

function phraseHitForChallenge(challenge, animalId) {
  const now = Date.now();
  const mode = challenge?.mode || 'classic';
  // Enforce cooldown between detections to prevent double-triggers
  if (now - state.mic.lastHitAt < (HIT_COOLDOWN[mode] ?? 400)) return false;

  // Build a combined text from recent segments that arrived after the last hit
  const cutoff = Math.max(now - (MATCH_WINDOW[mode] ?? 3000), state.mic.lastHitAt);
  const heard = state.mic.segments
    .filter((s) => s.at > cutoff)
    .map((s) => normalizeSpeech(s.text))
    .filter(Boolean)
    .join(' ');
  if (!heard) return false;

  const phrases = challengeAliases(challenge, animalId).map(normalizeSpeech).filter(Boolean);
  return phrases.some((phrase) => {
    const compactHeard = heard.replace(/\s+/g, '');
    const compactPhrase = phrase.replace(/\s+/g, '');
    return heard.includes(phrase) || compactHeard.includes(compactPhrase);
  });
}

function animalSelect(name, selected) {
  return `
    <select name="${h(name)}">
      ${state.animals.map((entry) => `
        <option value="${h(entry.id)}" ${entry.id === selected ? 'selected' : ''}>
          ${h(entry.name)} - ${h(entry.phrase)}
        </option>
      `).join('')}
    </select>
  `;
}

function animalGrid(field, selected) {
  return `
    <input type="hidden" name="${h(field)}" id="${h(field)}" value="${h(selected)}">
    <div class="animal-grid" data-field="${h(field)}">
      ${state.animals.map((entry) => `
        <button class="animal-choice ${entry.id === selected ? 'selected' : ''}" type="button" data-action="pick-animal" data-field="${h(field)}" data-animal="${h(entry.id)}">
          ${animalSvg(entry.id, '#f7bd3d')}
          <span>${h(entry.name)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function lobbyPlayerCount(settings = {}) {
  const value = Number(settings?.maxPlayers ?? 2);
  return Number.isFinite(value) ? clamp(Math.round(value), 2, 4) : 2;
}

function playerFormatLabel(count) {
  return count === 2 ? '1c1' : Array.from({ length: count }, () => '1').join('c');
}

function playerCountSegmented(selected = 2, minAllowed = 2) {
  return `
    <div class="segmented">
      ${PLAYER_COUNTS.map((count) => `
        <label>
          <input type="radio" name="maxPlayers" value="${count}" ${count === selected ? 'checked' : ''} ${count < minAllowed ? 'disabled' : ''}>
          <span>${playerFormatLabel(count)}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function animalSvg(id, accent = '#21a692') {
  const dark = '#172026';
  const blush = '#ff8b7d';
  const cream = '#fff7df';
  const paper = '#fffaf1';
  const common = `
    <ellipse class="sticker-shadow" cx="100" cy="170" rx="66" ry="18" fill="${accent}" opacity="0.18"/>
  `;

  const faces = {
    dog: `
      ${common}
      <path class="tail" d="M151 120 C182 103 177 73 151 84 C165 96 162 110 147 115" fill="#b86e32" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M55 104 C56 75 76 55 104 57 C134 58 153 82 148 113 C144 148 122 166 94 163 C67 160 51 137 55 104Z" fill="#cf8948" stroke="${dark}" stroke-width="6"/>
      <path d="M61 83 C35 61 33 110 57 128 C73 114 75 94 61 83Z" fill="#714727" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M126 76 C151 51 158 98 137 121 C119 110 115 90 126 76Z" fill="#714727" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M82 105 C74 86 86 72 104 75 C123 78 132 94 124 112 C114 103 96 101 82 105Z" fill="#e7b06b" stroke="${dark}" stroke-width="5"/>
      <ellipse cx="101" cy="118" rx="36" ry="28" fill="#f3cf9b" stroke="${dark}" stroke-width="5"/>
      <circle cx="83" cy="101" r="6" fill="${dark}"/>
      <circle cx="121" cy="101" r="6" fill="${dark}"/>
      <path d="M96 116 C101 112 108 112 113 116 C109 124 101 125 96 116Z" fill="${dark}"/>
      <path class="mouth" d="M103 125 C97 135 85 135 81 126 M103 125 C110 136 123 134 126 125" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <path d="M73 142 C87 152 116 153 130 141" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <path d="M68 146 L132 146" stroke="#4a96d9" stroke-width="9" stroke-linecap="round"/>
      <circle cx="100" cy="148" r="7" fill="${accent}" stroke="${dark}" stroke-width="4"/>
    `,
    cat: `
      ${common}
      <path class="tail" d="M143 130 C178 112 164 73 135 89 C156 92 158 112 136 119" fill="#78808d" stroke="${dark}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M59 113 C59 78 77 59 103 58 C130 57 147 78 146 113 C145 149 122 166 101 166 C78 166 59 148 59 113Z" fill="#8e97a5" stroke="${dark}" stroke-width="6"/>
      <path class="ear-left" d="M63 71 L74 30 L98 62 Z" fill="#8e97a5" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path class="ear-right" d="M113 62 L139 31 L142 75 Z" fill="#8e97a5" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M74 58 L79 42 L91 60 Z M124 59 L136 43 L136 64 Z" fill="#f6b6b0"/>
      <path d="M87 68 C95 63 109 63 118 69" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <path d="M92 82 L86 96 H98 Z M109 82 L115 96 H103 Z" fill="#67707c"/>
      <circle cx="83" cy="105" r="6" fill="${dark}"/>
      <circle cx="119" cy="105" r="6" fill="${dark}"/>
      <path d="M96 119 C101 116 108 116 112 119 C108 125 100 125 96 119Z" fill="${dark}"/>
      <path class="mouth" d="M104 126 C97 136 87 134 84 126 M104 126 C111 136 122 134 125 126" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <path d="M72 120 H42 M73 129 H47 M130 120 H160 M129 129 H155" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="74" cy="116" r="8" fill="${blush}" opacity="0.58"/>
      <circle cx="130" cy="116" r="8" fill="${blush}" opacity="0.58"/>
    `,
    duck: `
      ${common}
      <path d="M44 125 C39 95 65 78 99 82 C135 86 160 111 154 139 C148 166 112 178 78 167 C58 161 47 145 44 125Z" fill="#f4cf39" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M48 116 L25 101 L52 96" fill="#ffe066" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path class="wing" d="M83 121 C103 99 130 111 135 137 C112 148 93 141 83 121Z" fill="#e5b82f" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M101 91 C96 64 113 45 139 48 C163 51 176 70 171 94 C166 116 145 127 123 120 C110 116 103 105 101 91Z" fill="#ffe066" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M167 81 C186 75 199 82 198 94 C183 105 169 103 157 95Z" fill="#f28d35" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M166 94 C177 97 188 96 198 93" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="142" cy="80" r="6" fill="${dark}"/>
      <circle cx="144" cy="78" r="2" fill="#fff"/>
      <path d="M124 50 C119 35 134 31 142 45 C150 31 165 39 157 55" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <path class="mouth" d="M161 87 C172 92 184 92 195 88" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <path d="M80 168 C73 184 57 181 51 174 M113 169 C112 184 129 184 139 176" fill="none" stroke="#f28d35" stroke-width="8" stroke-linecap="round"/>
    `,
    cow: `
      ${common}
      <path d="M54 109 C54 73 75 53 103 54 C134 55 154 78 151 112 C148 150 124 168 98 166 C73 164 54 143 54 109Z" fill="#f7f2e9" stroke="${dark}" stroke-width="6"/>
      <path d="M58 72 C40 43 51 29 76 50" fill="#f2c96b" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
      <path d="M129 51 C154 30 165 45 144 74" fill="#f2c96b" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
      <path class="ear-left" d="M54 78 C28 67 31 96 55 100" fill="#f7f2e9" stroke="${dark}" stroke-width="6"/>
      <path class="ear-right" d="M149 81 C175 71 171 101 147 102" fill="#f7f2e9" stroke="${dark}" stroke-width="6"/>
      <path d="M69 66 C88 50 105 61 97 83 C81 88 70 83 69 66Z" fill="#1f2930"/>
      <path d="M119 101 C134 83 155 94 146 119 C132 122 122 117 119 101Z" fill="#1f2930"/>
      <ellipse cx="101" cy="124" rx="38" ry="27" fill="#f6b6b0" stroke="${dark}" stroke-width="5"/>
      <circle cx="84" cy="98" r="6" fill="${dark}"/>
      <circle cx="121" cy="98" r="6" fill="${dark}"/>
      <circle cx="91" cy="125" r="4" fill="${dark}"/>
      <circle cx="112" cy="125" r="4" fill="${dark}"/>
      <path class="mouth" d="M93 139 C101 146 113 145 119 138" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
    `,
    frog: `
      ${common}
      <path d="M48 127 C48 92 71 70 101 70 C132 70 154 92 154 127 C154 155 130 170 101 170 C72 170 48 155 48 127Z" fill="#68b957" stroke="${dark}" stroke-width="6"/>
      <circle class="eye-bob" cx="71" cy="70" r="22" fill="#78c968" stroke="${dark}" stroke-width="6"/>
      <circle class="eye-bob" cx="132" cy="70" r="22" fill="#78c968" stroke="${dark}" stroke-width="6"/>
      <circle cx="71" cy="70" r="8" fill="${dark}"/>
      <circle cx="132" cy="70" r="8" fill="${dark}"/>
      <path d="M73 123 C89 139 117 139 132 123" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
      <path class="mouth" d="M89 125 C96 130 108 130 115 125" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="62" cy="116" r="7" fill="#4f9d44"/>
      <circle cx="143" cy="117" r="7" fill="#4f9d44"/>
      <path d="M65 159 C51 174 35 167 39 154 M137 159 C151 174 167 167 163 154" fill="none" stroke="#4f9d44" stroke-width="8" stroke-linecap="round"/>
    `,
    rooster: `
      ${common}
      <path class="tail" d="M131 108 C159 68 181 90 148 123 C176 119 179 148 145 146" fill="#4a96d9" stroke="${dark}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M53 121 C53 87 78 63 105 67 C134 72 152 98 147 128 C142 158 120 171 93 166 C68 162 53 145 53 121Z" fill="#f7f2e9" stroke="${dark}" stroke-width="6"/>
      <path class="comb" d="M80 63 C66 45 77 30 91 45 C92 25 112 27 112 48 C128 34 142 49 127 67" fill="#de3f53" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M123 91 L160 102 L124 116 Z" fill="#f2a332" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M119 112 C129 123 128 140 113 136 C108 126 111 118 119 112Z" fill="#de3f53" stroke="${dark}" stroke-width="5"/>
      <circle cx="103" cy="91" r="6" fill="${dark}"/>
      <path class="wing" d="M76 119 C91 101 115 109 118 137 C100 145 82 138 76 119Z" fill="#e8e2d6" stroke="${dark}" stroke-width="5"/>
      <path d="M79 165 L72 181 M105 168 L108 182" stroke="#f2a332" stroke-width="7" stroke-linecap="round"/>
    `,
    pig: `
      ${common}
      <path class="tail" d="M151 122 C176 115 171 93 153 102 C168 104 168 116 153 116" fill="none" stroke="#e9849d" stroke-width="8" stroke-linecap="round"/>
      <path d="M51 111 C51 77 73 57 103 58 C133 59 153 81 151 114 C149 150 124 168 99 166 C72 164 51 145 51 111Z" fill="#f2a2b4" stroke="${dark}" stroke-width="6"/>
      <path class="ear-left" d="M63 75 C42 50 57 40 79 59" fill="#e9849d" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path class="ear-right" d="M129 75 C151 51 136 39 113 59" fill="#e9849d" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <ellipse cx="100" cy="115" rx="34" ry="24" fill="#ffc2cf" stroke="${dark}" stroke-width="5"/>
      <circle cx="82" cy="94" r="6" fill="${dark}"/>
      <circle cx="119" cy="94" r="6" fill="${dark}"/>
      <circle cx="90" cy="116" r="4" fill="${dark}"/>
      <circle cx="111" cy="116" r="4" fill="${dark}"/>
      <path class="mouth" d="M90 135 C100 144 115 142 121 132" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="69" cy="112" r="8" fill="${blush}" opacity="0.55"/>
      <circle cx="134" cy="112" r="8" fill="${blush}" opacity="0.55"/>
    `,
    sheep: `
      ${common}
      <path d="M54 126 C42 101 56 76 84 76 C94 55 126 57 134 80 C160 82 169 111 153 133 C154 158 133 174 107 166 C82 179 54 164 54 126Z" fill="#f5f0df" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="61" cy="111" r="22" fill="#fffaf1" stroke="${dark}" stroke-width="5"/>
      <circle cx="82" cy="82" r="24" fill="#fffaf1" stroke="${dark}" stroke-width="5"/>
      <circle cx="116" cy="81" r="25" fill="#fffaf1" stroke="${dark}" stroke-width="5"/>
      <circle cx="143" cy="111" r="22" fill="#fffaf1" stroke="${dark}" stroke-width="5"/>
      <path d="M74 105 C74 82 91 69 110 71 C129 73 140 88 136 110 C132 132 115 142 97 140 C82 138 74 125 74 105Z" fill="#3d4650" stroke="${dark}" stroke-width="5"/>
      <path class="ear-left" d="M78 106 C57 101 58 124 78 124" fill="#3d4650" stroke="${dark}" stroke-width="5"/>
      <path class="ear-right" d="M134 107 C155 102 153 125 133 124" fill="#3d4650" stroke="${dark}" stroke-width="5"/>
      <circle cx="94" cy="107" r="5" fill="#fffaf1"/>
      <circle cx="117" cy="107" r="5" fill="#fffaf1"/>
      <path class="mouth" d="M99 124 C106 130 116 128 121 121" fill="none" stroke="#fffaf1" stroke-width="4" stroke-linecap="round"/>
      <path d="M79 164 L72 181 M124 164 L131 181" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>
    `,
    fox: `
      ${common}
      <path class="tail" d="M131 128 C180 108 175 58 133 55 C151 83 146 103 116 119" fill="#df743d" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M154 66 C169 72 168 94 150 105 C155 90 153 77 140 63Z" fill="${cream}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M50 113 C50 78 73 55 102 56 C130 57 149 80 148 113 C147 149 123 167 99 166 C73 165 50 146 50 113Z" fill="#df743d" stroke="${dark}" stroke-width="6"/>
      <path class="ear-left" d="M59 74 L73 27 L97 63 Z" fill="#df743d" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path class="ear-right" d="M110 63 L134 27 L144 75 Z" fill="#df743d" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M74 58 L79 43 L89 61 Z M122 61 L133 43 L135 65 Z" fill="#f6b6b0"/>
      <path d="M68 112 C76 136 93 150 101 151 C110 150 128 136 136 112 C124 124 78 124 68 112Z" fill="${cream}" stroke="${dark}" stroke-width="5"/>
      <path d="M84 102 C91 112 111 112 119 102 C109 98 94 98 84 102Z" fill="${cream}"/>
      <circle cx="83" cy="96" r="6" fill="${dark}"/>
      <circle cx="119" cy="96" r="6" fill="${dark}"/>
      <path d="M96 111 C102 107 109 107 115 111 C110 119 101 119 96 111Z" fill="${dark}"/>
      <path class="mouth" d="M105 121 C99 130 89 129 85 121 M105 121 C112 130 123 129 126 121" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>
    `
  };

  return `
    <svg class="animal-svg animal-${h(id)}" viewBox="10 20 195 170" role="img" aria-label="${h(animalName(id))}">
      ${faces[id] || faces.dog}
    </svg>
  `;
}

function render() {
  const nextRoute = location.hash || '#/';
  const routeChanged = nextRoute !== state.route;
  state.route = nextRoute;
  if (routeChanged) {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  if (!state.user) {
    renderHome();
    return;
  }

  if (state.route.startsWith('#/lobby/')) {
    const code = state.route.split('/')[2]?.toUpperCase();
    renderShell(renderLobby(code), 'lobby');
    if (code && (!state.viewedLobby || state.viewedLobby.code !== code)) loadLobby(code, false);
    return;
  }

  if (state.route.startsWith('#/game')) {
    renderShell(renderGame(), 'game');
    return;
  }

  if (state.route.startsWith('#/profile')) {
    renderShell(renderProfile(), 'profile');
    return;
  }

  renderShell(renderDashboard(), 'dashboard');
}

function renderShell(content, active) {
  const iconHome = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const iconUser = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
  const iconLobby = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
  const iconGame = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
  const iconOut = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#/dashboard" aria-label="Accueil">
          <span class="brand-mark">${animalSvg(state.user.mainAnimal, state.user.accent)}</span>
          <span>Cri Animaux Arena</span>
        </a>
        <nav class="nav" aria-label="Navigation principale">
          <a class="${active === 'dashboard' ? 'active' : ''}" href="#/dashboard">Accueil</a>
          <a class="${active === 'profile' ? 'active' : ''}" href="#/profile">Profil</a>
          ${state.activeLobby && state.activeLobby.status !== 'finished' ? `<a class="${active === 'lobby' ? 'active' : ''}" href="#/lobby/${h(state.activeLobby.code)}">Lobby</a>` : ''}
          ${state.game && state.game.status !== 'finished' ? `<a class="${active === 'game' ? 'active' : ''}" href="#/game">Partie</a>` : ''}
          <button type="button" data-action="logout">Sortir</button>
        </nav>
      </header>
      ${content}
      <nav class="bottom-nav" aria-label="Navigation">
        <div class="bottom-nav-inner">
          <a href="#/dashboard" class="${active === 'dashboard' ? 'active' : ''}" aria-label="Accueil">${iconHome}<span>Accueil</span></a>
          <a href="#/profile" class="${active === 'profile' ? 'active' : ''}" aria-label="Profil">${iconUser}<span>Profil</span></a>
          ${state.activeLobby && state.activeLobby.status !== 'finished' ? `<a href="#/lobby/${h(state.activeLobby.code)}" class="${active === 'lobby' ? 'active' : ''}" aria-label="Lobby">${iconLobby}<span>Lobby</span></a>` : ''}
          ${state.game && state.game.status !== 'finished' ? `<a href="#/game" class="${active === 'game' ? 'active' : ''}" aria-label="Partie">${iconGame}<span>Partie</span></a>` : ''}
          <button type="button" data-action="logout" aria-label="Déconnexion">${iconOut}<span>Sortir</span></button>
        </div>
      </nav>
    </div>
  `;
}

function renderHome() {
  app.innerHTML = `
    <section class="home">
      <div>
        <a class="brand" href="#/">
          <span class="brand-mark">${animalSvg('dog', '#f7bd3d')}</span>
          <span>Cri Animaux Arena</span>
        </a>
        <h1 class="home-title">Cri Animaux Arena</h1>
        <p class="home-lede">Match au micro en 1c1, à 3 ou à 4, animaux aléatoires après la première manche, lobby privé et amis.</p>
        <div class="home-actions">
          <button class="primary-btn" type="button" data-action="auth-mode" data-mode="register">Créer un compte</button>
          <button class="ghost-btn" type="button" data-action="auth-mode" data-mode="login">Connexion</button>
        </div>
      </div>
      <div class="auth-panel">
        <div class="auth-tabs">
          <button class="${state.authMode === 'login' ? 'selected' : ''}" type="button" data-action="auth-mode" data-mode="login">Connexion</button>
          <button class="${state.authMode === 'register' ? 'selected' : ''}" type="button" data-action="auth-mode" data-mode="register">Inscription</button>
        </div>
        ${state.authMode === 'login' ? renderLoginForm() : renderRegisterForm()}
      </div>
      <div class="preview-stage wide">
        <div class="preview-duel">
          <div>${animalSvg('cat', '#ff6f61')}</div>
          <div>${animalSvg('duck', '#4a96d9')}</div>
        </div>
        <div class="preview-floor"></div>
        <div class="preview-copy">
          <div class="sound-ribbon">${Array.from({ length: 15 }, (_, i) => `<i style="animation-duration:${0.62 + (i % 5) * 0.08}s"></i>`).join('')}</div>
          <strong>Waf, miaou, coin.</strong>
        </div>
      </div>
    </section>
  `;
}

function renderLoginForm() {
  return `
    <form class="form" id="login-form">
      <label class="field">
        <span>Pseudo ou email</span>
        <input name="identifier" autocomplete="username" required>
      </label>
      <label class="field">
        <span>Mot de passe</span>
        <input name="password" type="password" autocomplete="current-password" required>
      </label>
      <button class="primary-btn" type="submit">Entrer dans l'arène</button>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form class="form" id="register-form">
      <div class="split-fields">
        <label class="field">
          <span>Pseudo</span>
          <input name="username" autocomplete="username" minlength="3" maxlength="20" required>
        </label>
        <label class="field">
          <span>Nom affiché</span>
          <input name="displayName" maxlength="28" required>
        </label>
      </div>
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" required>
      </label>
      <label class="field">
        <span>Mot de passe</span>
        <input name="password" type="password" autocomplete="new-password" minlength="8" required>
      </label>
      <div class="split-fields">
        <label class="field">
          <span>Animal favori</span>
          ${animalSelect('mainAnimal', 'dog')}
        </label>
        <label class="field">
          <span>Couleur</span>
          <input name="accent" type="color" value="#23b7a4">
        </label>
      </div>
      <button class="primary-btn" type="submit">Créer mon profil</button>
    </form>
  `;
}

function renderDashboard() {
  const user = state.user;
  const ratio = user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0;
  const hasActiveLobby = state.activeLobby && state.activeLobby.status !== 'finished';
  return `
    <main class="page db-layout">

      <section class="db-hero wide">
        <div class="db-hero-body">
          <p class="db-hero-eyebrow">Bienvenue</p>
          <h1 class="db-hero-name">${h(user.displayName)}</h1>
          <p class="db-hero-bio">${h(user.bio || `Animal favori : ${animalName(user.mainAnimal)}`)}</p>
          <div class="db-stats">
            <div class="db-stat">
              <span class="db-stat-val">${user.wins}</span>
              <span class="db-stat-lbl">Victoires</span>
            </div>
            <div class="db-stat">
              <span class="db-stat-val">${user.losses}</span>
              <span class="db-stat-lbl">Défaites</span>
            </div>
            <div class="db-stat db-stat--accent">
              <span class="db-stat-val">${ratio}%</span>
              <span class="db-stat-lbl">Ratio</span>
            </div>
          </div>
        </div>
        <div class="db-hero-animal" aria-hidden="true">${animalSvg(user.mainAnimal, user.accent)}</div>
      </section>

      ${hasActiveLobby ? `
        <a class="db-resume wide" href="#/lobby/${h(state.activeLobby.code)}">
          <span class="db-resume-dot"></span>
          <span class="db-resume-text">Lobby en cours · <strong>${h(state.activeLobby.code)}</strong></span>
          <span class="db-resume-arrow">Reprendre →</span>
        </a>
      ` : ''}

      <section class="panel db-play-card">
        <div class="db-play-card-head">
          <span class="db-play-icon">+</span>
          <div>
            <h2 class="panel-title">Créer une partie</h2>
            <p class="db-play-sub">Choisis le format puis invite tes amis</p>
          </div>
        </div>
        <form class="form" id="create-lobby-form">
          <div>
            <span class="tiny-label">Joueurs</span>
            ${playerCountSegmented(2)}
          </div>
          <div>
            <span class="tiny-label">Format</span>
            <div class="segmented">
              <label><input type="radio" name="bestOf" value="3" checked><span>BO3</span></label>
              <label><input type="radio" name="bestOf" value="5"><span>BO5</span></label>
            </div>
          </div>
          <label class="field">
            <span>Durée manche</span>
            <input name="roundSeconds" type="range" min="18" max="60" value="30" data-range-output="round-output">
          </label>
          <span class="badge" id="round-output">30 secondes</span>
          <label class="field">
            <span>Premier animal</span>
            ${animalSelect('firstAnimal', user.mainAnimal)}
          </label>
          <button class="primary-btn db-submit" type="submit">Ouvrir le lobby</button>
        </form>
      </section>

      <section class="panel db-play-card">
        <div class="db-play-card-head">
          <span class="db-play-icon db-play-icon--join">→</span>
          <div>
            <h2 class="panel-title">Rejoindre</h2>
            <p class="db-play-sub">Entre avec un code ami</p>
          </div>
        </div>
        <form class="form" id="join-lobby-form">
          <label class="field">
            <span>Code lobby</span>
            <input class="db-code-input" name="code" maxlength="8" placeholder="ABC123" autocomplete="off" required>
          </label>
          <label class="field">
            <span>Premier animal</span>
            ${animalSelect('firstAnimal', user.mainAnimal)}
          </label>
          <button class="primary-btn db-submit" type="submit">Rejoindre</button>
        </form>
      </section>

      <section class="panel wide">
        <div class="panel-header">
          <h2 class="panel-title">Amis</h2>
          <span class="badge">${state.friends.friends.length} ajouté${state.friends.friends.length !== 1 ? 's' : ''}</span>
        </div>
        ${renderFriendSearch()}
        ${renderFriendRequests()}
        ${renderFriendsList()}
      </section>

    </main>
  `;
}

function renderProfile() {
  const user = state.user;
  return `
    <main class="page profile-grid">
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Profil</h1>
          <span class="avatar-dot" style="--accent:${h(user.accent)}">${animalSvg(user.mainAnimal, user.accent)}</span>
        </div>
        <form class="form" id="profile-form">
          <label class="field">
            <span>Nom affiché</span>
            <input name="displayName" maxlength="28" value="${h(user.displayName)}" required>
          </label>
          <label class="field">
            <span>Bio</span>
            <textarea name="bio" maxlength="160">${h(user.bio)}</textarea>
          </label>
          <div class="split-fields">
            <label class="field">
              <span>Couleur</span>
              <input name="accent" type="color" value="${h(user.accent)}">
            </label>
            <label class="field">
              <span>Style avatar</span>
              <select name="avatarStyle">
                ${['spark', 'neon', 'badge', 'comic'].map((style) => `<option value="${style}" ${user.avatarStyle === style ? 'selected' : ''}>${style}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="field">
            <span>Animal favori</span>
            ${animalGrid('mainAnimal', user.mainAnimal)}
          </div>
          <button class="primary-btn" type="submit">Sauver le profil</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Ajouter des amis</h2>
        </div>
        ${renderFriendSearch()}
        ${renderFriendRequests()}
      </section>
    </main>
  `;
}

function renderFriendSearch() {
  return `
    <form class="form" id="friend-search-form">
      <label class="field">
        <span>Recherche joueur</span>
        <input name="q" minlength="2" placeholder="pseudo">
      </label>
      <button class="ghost-btn" type="submit">Chercher</button>
    </form>
    <div class="list" style="margin-top:12px">
      ${state.searchResults.map((user) => `
        <div class="list-item">
          <span class="avatar-dot" style="--accent:${h(user.accent)}">${animalSvg(user.mainAnimal, user.accent)}</span>
          <span class="user-line">
            <strong>${h(user.displayName)}</strong>
            <span>@${h(user.username)} · ${user.online ? 'en ligne' : 'hors ligne'}</span>
          </span>
          ${friendActionButton(user)}
        </div>
      `).join('')}
    </div>
  `;
}

function friendActionButton(user) {
  if (user.relationship === 'friends') return '<span class="badge good">Ami</span>';
  if (user.relationship === 'outgoing') return '<span class="badge warn">Envoyée</span>';
  if (user.relationship === 'incoming') return '<span class="badge warn">À accepter</span>';
  return `<button class="ghost-btn" type="button" data-action="request-friend" data-user-id="${user.id}">Ajouter</button>`;
}

function renderFriendRequests() {
  if (!state.friends.incoming.length) return '';
  return `
    <div class="list" style="margin-top:14px">
      ${state.friends.incoming.map((request) => `
        <div class="list-item">
          <span class="avatar-dot" style="--accent:${h(request.user.accent)}">${animalSvg(request.user.mainAnimal, request.user.accent)}</span>
          <span class="user-line"><strong>${h(request.user.displayName)}</strong><span>@${h(request.user.username)}</span></span>
          <span>
            <button class="ghost-btn" type="button" data-action="friend-response" data-friendship-id="${request.friendshipId}" data-response="accept">Accepter</button>
            <button class="danger-btn" type="button" data-action="friend-response" data-friendship-id="${request.friendshipId}" data-response="decline">Refuser</button>
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFriendsList() {
  if (!state.friends.friends.length) {
    return '<div class="empty" style="margin-top:14px">Aucun ami pour le moment.</div>';
  }
  return `
    <div class="list" style="margin-top:14px">
      ${state.friends.friends.map(({ user }) => `
        <div class="list-item">
          <span class="avatar-dot" style="--accent:${h(user.accent)}">${animalSvg(user.mainAnimal, user.accent)}</span>
          <span class="user-line">
            <strong>${h(user.displayName)}</strong>
            <span>@${h(user.username)} · ${user.online ? 'en ligne' : 'hors ligne'}</span>
          </span>
          ${state.activeLobby ? `<button class="ghost-btn" type="button" data-action="invite-friend" data-user-id="${user.id}">Inviter</button>` : `<span class="badge">${animalName(user.mainAnimal)}</span>`}
        </div>
      `).join('')}
    </div>
  `;
}

function renderLobby(routeCode) {
  const lobby = state.activeLobby?.code === routeCode ? state.activeLobby : state.viewedLobby?.code === routeCode ? state.viewedLobby : null;
  if (!lobby) {
    return `
      <main class="page">
        <section class="panel">
          <h1 class="panel-title">Lobby ${h(routeCode || '')}</h1>
          <div class="empty">Chargement du lobby...</div>
        </section>
      </main>
    `;
  }

  const me = lobby.players.find((player) => player.id === state.user.id);
  const isOwner = lobby.ownerId === state.user.id;
  const maxPlayers = lobbyPlayerCount(lobby.settings);
  const canJoin = lobby.status === 'open' && lobby.players.length < maxPlayers;
  const canStart = isOwner && lobby.players.length === maxPlayers && lobby.players.every((player) => player.ready) && lobby.status === 'open';
  const selected = state.selectedAnimals.get(lobby.code) || me?.lobbyAnimal || state.user.mainAnimal;

  return `
    <main class="page lobby-grid">
      <section class="hero-band wide">
        <div>
          <span class="tiny-label">Lobby privé</span>
          <h1><span class="lobby-code">${h(lobby.code)}</span></h1>
        </div>
        <div class="home-actions">
          ${!me && canJoin ? `<button class="primary-btn" type="button" data-action="join-viewed-lobby" data-code="${h(lobby.code)}">Rejoindre</button>` : ''}
          <button class="ghost-btn" type="button" data-action="copy-lobby" data-code="${h(lobby.code)}">Copier le lien</button>
          ${lobby.status === 'in_game' ? `<a class="primary-btn" href="#/game">Voir la partie</a>` : ''}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Joueurs</h2>
          <span class="badge ${lobby.players.length === maxPlayers ? 'good' : 'warn'}">${lobby.players.length}/${maxPlayers}</span>
        </div>
        <div class="list">
          ${Array.from({ length: maxPlayers }, (_, slot) => {
            const player = lobby.players[slot];
            if (!player) return '<div class="empty">Slot libre</div>';
            return `
              <div class="list-item">
                <span class="avatar-dot" style="--accent:${h(player.accent)}">${animalSvg(player.lobbyAnimal, player.accent)}</span>
                <span class="user-line">
                  <strong>${h(player.displayName)} ${player.id === lobby.ownerId ? '· host' : ''}</strong>
                  <span>${animalName(player.lobbyAnimal)} · ${player.online ? 'en ligne' : 'hors ligne'}</span>
                </span>
                <span class="badge ${player.ready ? 'good' : 'warn'}">${player.ready ? 'Prêt' : 'Attente'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Paramètres</h2>
          <span class="badge">${playerFormatLabel(maxPlayers)} · ${lobby.settings.bestOf === 5 ? 'BO5' : 'BO3'}</span>
        </div>
        ${isOwner && lobby.status === 'open' ? `
          <form class="form" id="lobby-settings-form" data-code="${h(lobby.code)}">
            <div>
              <span class="tiny-label">Joueurs</span>
              ${playerCountSegmented(maxPlayers, lobby.players.length)}
            </div>
            <div>
              <span class="tiny-label">Format</span>
              <div class="segmented">
                <label><input type="radio" name="bestOf" value="3" ${lobby.settings.bestOf === 3 ? 'checked' : ''}><span>BO3</span></label>
                <label><input type="radio" name="bestOf" value="5" ${lobby.settings.bestOf === 5 ? 'checked' : ''}><span>BO5</span></label>
              </div>
            </div>
            <label class="field">
              <span>Durée manche</span>
              <input name="roundSeconds" type="range" min="18" max="60" value="${h(lobby.settings.roundSeconds)}" data-range-output="lobby-round-output">
            </label>
            <span class="badge" id="lobby-round-output">${h(lobby.settings.roundSeconds)} secondes</span>
            <button class="ghost-btn" type="submit">Appliquer</button>
          </form>
        ` : `
          <div class="mini-grid">
            <div class="stat"><strong>${maxPlayers}</strong><span>Joueurs</span></div>
            <div class="stat"><strong>${lobby.settings.bestOf}</strong><span>Best of</span></div>
            <div class="stat"><strong>${lobby.settings.roundSeconds}</strong><span>Secondes</span></div>
            <div class="stat"><strong>${Math.ceil(lobby.settings.bestOf / 2)}</strong><span>Points</span></div>
          </div>
        `}
      </section>
      <section class="panel wide">
        <div class="panel-header">
          <h2 class="panel-title">Premier animal</h2>
          ${me ? `<button class="ghost-btn" type="button" data-action="ready-toggle" data-code="${h(lobby.code)}" data-ready="${me.ready ? '0' : '1'}">${me.ready ? 'Pas prêt' : 'Prêt'}</button>` : ''}
        </div>
        ${me && lobby.status === 'open' ? animalGrid(`lobbyAnimal:${lobby.code}`, selected) : '<div class="empty">La sélection est verrouillée.</div>'}
        <div class="home-actions" style="margin-top:18px">
          ${canStart ? `<button class="primary-btn" type="button" data-action="start-game" data-code="${h(lobby.code)}">Lancer la partie</button>` : ''}
          ${state.friends.friends.length && me ? state.friends.friends.map(({ user }) => `<button class="ghost-btn" type="button" data-action="invite-friend" data-user-id="${user.id}">Inviter ${h(user.displayName)}</button>`).join('') : ''}
        </div>
      </section>
    </main>
  `;
}

function renderRoundEnd(game, round) {
  const players = game.players;
  const winner = players.find((p) => p.id === round.winnerId);
  const animalId = round.animalsByUser?.[round.winnerId] || winner?.selectedAnimal || winner?.mainAnimal;
  const isMyWin = round.winnerId === state.user?.id;
  return `
    <main class="stage transition-screen">
      <div class="trans-card">
        <span class="trans-verdict">${isMyWin ? 'Tu remportes la manche !' : 'Manche perdue…'}</span>
        <div class="trans-animal">${animalSvg(animalId, winner?.accent)}</div>
        <p class="trans-name">${h(winner?.displayName || 'Joueur')} gagne la manche ${round.number}</p>
        <div class="trans-score">
          ${players.map((p) => `
            <div class="trans-score-item ${p.id === round.winnerId ? 'winner' : ''}">
              <span>${h(p.displayName)}</span>
              <span class="trans-score-val">${game.roundWins?.[p.id] || 0}</span>
            </div>
          `).join('<span class="trans-score-sep">–</span>')}
        </div>
        ${renderRoundReason(game, round)}
        <p class="trans-next">Prochaine manche dans quelques secondes…</p>
      </div>
    </main>
  `;
}

function renderGameEnd(game) {
  const players = game.players;
  const winner = players.find((p) => p.id === game.winnerId);
  const animalId = winner?.selectedAnimal || winner?.mainAnimal;
  const isVictory = game.winnerId === state.user?.id;
  return `
    <main class="stage transition-screen">
      <div class="trans-card game-over">
        <span class="trans-verdict ${isVictory ? 'victory' : 'defeat'}">${isVictory ? '🏆 Victoire !' : '💀 Défaite…'}</span>
        <div class="trans-animal">${animalSvg(animalId, winner?.accent)}</div>
        <p class="trans-name">${h(winner?.displayName || 'Joueur')} remporte la partie !</p>
        <div class="trans-score">
          ${players.map((p) => `
            <div class="trans-score-item ${p.id === game.winnerId ? 'winner' : ''}">
              <span>${h(p.displayName)}</span>
              <span class="trans-score-val">${game.roundWins?.[p.id] || 0}</span>
            </div>
          `).join('<span class="trans-score-sep">–</span>')}
        </div>
        <button class="primary-btn" type="button" data-action="leave-game">Retour à l'accueil</button>
      </div>
    </main>
  `;
}

function renderGame() {
  const game = state.game || state.activeLobby?.match;
  if (!game) {
    return `
      <main class="page">
        <section class="panel">
          <h1 class="panel-title">Partie</h1>
          <div class="empty">Aucune partie en cours.</div>
        </section>
      </main>
    `;
  }
  state.game = game;

  // Full-screen transitions for round end and game over
  if (game.status === 'finished') return renderGameEnd(game);
  const round = game.currentRound;
  if (round?.status === 'ended') return renderRoundEnd(game, round);

  const players = game.players;
  const me = players.find((player) => player.id === state.user.id);
  const now = nowServer();
  const countdown = round ? Math.max(0, Math.ceil((round.countdownEndsAt - now) / 1000)) : 0;
  const remaining = round ? Math.max(0, Math.ceil((round.endsAt - now) / 1000)) : 0;
  const label = round?.status === 'countdown' ? `${countdown}` : `${remaining}s`;
  const myAnimalId = round?.animalsByUser?.[state.user.id] || me?.selectedAnimal || state.user.mainAnimal;
  const myChallenge = round?.challengesByUser?.[state.user.id] || null;
  const micGateOpen = Date.now() < state.mic.phraseHitUntil
    && state.mic.phraseHitChallengeId === challengeKey(myChallenge, myAnimalId);
  const micStatus = state.mic.error
    ? state.mic.error
    : micGateOpen
      ? `Validé: ${state.mic.lastMatch}`
      : state.mic.active
        ? 'Dis la consigne'
        : 'Micro off';

  return `
    <main class="stage">
      <section class="stage-top">
        <div class="round-log">${renderRoundWins(game)}</div>
        <div class="round-pill">Round ${round?.number || game.rounds.length}<br>${h(label)}</div>
        <div class="round-log">${renderRoundHistory(game)}</div>
      </section>
      <section class="arena arena-${players.length}">
        ${players.map((player) => renderDuelPlayer(game, player, player.id === me?.id)).join('')}
      </section>
      <section class="mic-console">
        ${game.status === 'finished' ? `
          <a class="primary-btn" href="#/dashboard">Retour accueil</a>
        ` : `
          <button class="primary-btn" type="button" data-action="${state.mic.active ? 'stop-mic' : 'start-mic'}">${state.mic.active ? 'Couper micro' : 'Activer micro'}</button>
        `}
        <div class="meter"><span style="width:${Math.round(state.mic.level * 100)}%"></span></div>
        <span class="badge ${micGateOpen ? 'good' : state.mic.active ? 'warn' : state.mic.error ? 'warn' : ''}">${h(micStatus)}</span>
        ${state.mic.active && state.mic.lastHeard ? `<span class="badge" style="opacity:0.55;font-size:0.72rem">« ${h(state.mic.lastHeard)} »</span>` : ''}
      </section>
    </main>
  `;
}

function renderDuelPlayer(game, player, isMe) {
  const round = game.currentRound;
  const animalId = round?.animalsByUser?.[player.id] || player.selectedAnimal || player.mainAnimal;
  const challenge = round?.challengesByUser?.[player.id];
  const phrase = challenge?.text || round?.phrasesByUser?.[player.id] || animalPhrase(animalId);
  const progress = round?.progressByUser?.[player.id] || 0;
  const wins = game.roundWins?.[player.id] || 0;
  const isWinner = game.winnerId === player.id;
  const modeLabel = challenge?.mode === 'rap' ? 'RAP' : challenge?.mode === 'hold' ? 'LONG' : challenge?.mode === 'combo' ? 'COMBO' : 'CRI';
  return `
    <div class="duel-player ${isMe ? 'me' : ''}" style="--accent:${h(player.accent)}">
      <div class="player-meta">
        <span class="player-name">${h(player.displayName)} ${isMe ? '· toi' : ''}</span>
        <span class="badge ${isWinner ? 'good' : ''}">${wins}/${game.targetWins}</span>
      </div>
      <div class="animal-stage">${animalSvg(animalId, player.accent)}</div>
      <div>
        ${challenge ? `<div class="challenge-note">${h(modeLabel)} · ${h(challenge.hint)} · x${Number(challenge.multiplier || 1).toFixed(2)}</div>` : ''}
        <div class="phrase">
          <span>${h(phrase)}</span>
        </div>
        <div class="progress-track">
          <span class="progress-fill" style="width:${clamp(progress, 0, 100)}%"></span>
          <span class="progress-text">${Math.floor(progress)}%</span>
        </div>
      </div>
    </div>
  `;
}

function renderRoundWins(game) {
  return game.players.map((player) => `
    <span class="round-chip">${h(player.displayName)} ${game.roundWins?.[player.id] || 0}</span>
  `).join('');
}

function renderRoundHistory(game) {
  if (!game.rounds.length) return '<span class="round-chip">BO en cours</span>';
  return game.rounds.slice(-5).map((round) => {
    const winner = game.players.find((player) => player.id === round.winnerId);
    return `<span class="round-chip">R${round.number} ${h(winner?.displayName || 'Joueur')}</span>`;
  }).join('');
}

function shifumiLabel(choice) {
  return choice === 'rock' ? 'pierre' : choice === 'paper' ? 'feuille' : choice === 'scissors' ? 'ciseaux' : 'tirage';
}

function renderRoundReason(game, round) {
  if (round.reason !== 'time') return '';
  const tieBreak = round.tieBreak;
  if (!tieBreak) return '<p class="trans-next">Temps ecoule: meilleure barre.</p>';

  const lastRound = tieBreak.rounds?.filter((entry) => entry.winningChoice)?.at(-1) || tieBreak.rounds?.at(-1);
  const choiceText = lastRound?.winningChoice ? ` ${shifumiLabel(lastRound.winningChoice)} gagne.` : '';
  const tiedNames = (tieBreak.tiedPlayerIds || [])
    .map((id) => game.players.find((player) => player.id === id)?.displayName)
    .filter(Boolean)
    .join(' / ');
  return `<p class="trans-next">Egalite au timer${tiedNames ? ` entre ${h(tiedNames)}` : ''}: Shifumi.${h(choiceText)}</p>`;
}

async function refreshMe() {
  try {
    const payload = await api('/api/me');
    state.user = payload.user || null;
    state.friends = payload.friends || { friends: [], incoming: [], outgoing: [] };
    state.activeLobby = payload.activeLobby || null;
    if (payload.activeLobby?.match) state.game = payload.activeLobby.match;
    if (state.wsOpen && state.activeLobby) subscribeLobby(state.activeLobby.code);
  } catch {
    state.user = null;
    state.activeLobby = null;
    state.game = null;
  }
}

function connectWs() {
  if (!state.user || (state.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.ws.readyState))) return;
  if (state.wsRetries >= 5) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws`);
  state.ws = ws;

  ws.addEventListener('open', () => {
    state.wsOpen = true;
    state.wsRetries = 0;
    state.subscribedLobbyCodes.clear();
    if (state.activeLobby) subscribeLobby(state.activeLobby.code);
    if (state.viewedLobby) subscribeLobby(state.viewedLobby.code);
    for (const code of Array.from(state.pendingLobbySubscriptions)) subscribeLobby(code);
  });

  ws.addEventListener('error', () => {
    state.wsOpen = false;
  });

  ws.addEventListener('close', () => {
    state.wsOpen = false;
    state.subscribedLobbyCodes.clear();
    state.wsRetries += 1;
    setTimeout(connectWs, Math.min(5000, 1200 * state.wsRetries));
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'hello') {
      state.animals = message.animals || state.animals;
    }
    if (message.type === 'lobby') {
      const isMyLobby = message.lobby.players.some((player) => player.id === state.user.id);
      if (isMyLobby) {
        if (message.lobby.status === 'finished') {
          // Keep the lobby in state temporarily so renderGameEnd can display,
          // but clear it so the nav / dashboard don't reference a dead lobby.
          state.activeLobby = message.lobby;
        } else {
          state.activeLobby = message.lobby;
        }
      }
      state.viewedLobby = message.lobby;
      if (message.lobby.match && message.lobby.status !== 'finished') state.game = message.lobby.match;
      if (message.lobby.status === 'in_game' && isMyLobby) {
        location.hash = '#/game';
      }
      render();
    }
    if (message.type === 'game') {
      state.game = message.game;
      state.serverOffset = message.game.serverNow - Date.now();
      // Stop mic automatically when the game ends
      if (message.game.status === 'finished' && state.mic.active) stopMic();
      render();
    }
    if (message.type === 'friends') {
      state.friends = message.friends;
      render();
    }
    if (message.type === 'invite') {
      toast(`${message.from.displayName} t'invite au lobby ${message.lobby.code}`, 'good');
      state.viewedLobby = message.lobby;
      render();
    }
    if (message.type === 'toast') toast(message.message, message.tone || '');
    if (message.type === 'error') toast(message.error, 'bad');
  });
}

function sendWs(payload) {
  if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(payload));
}

function subscribeLobby(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return;
  state.pendingLobbySubscriptions.add(normalized);
  if (state.ws?.readyState !== WebSocket.OPEN || state.subscribedLobbyCodes.has(normalized)) return;
  sendWs({ type: 'subscribeLobby', code: normalized });
  state.subscribedLobbyCodes.add(normalized);
}

async function loadLobby(code, join = false, firstAnimal = state.user?.mainAnimal) {
  try {
    const payload = join
      ? await api(`/api/lobbies/${encodeURIComponent(code)}/join`, { method: 'POST', body: { firstAnimal } })
      : await api(`/api/lobbies/${encodeURIComponent(code)}`);
    state.viewedLobby = payload.lobby;
    subscribeLobby(payload.lobby.code);
    if (payload.lobby.players.some((player) => player.id === state.user.id)) {
      state.activeLobby = payload.lobby;
    }
    render();
  } catch (error) {
    toast(error.message, 'bad');
  }
}

async function startMic() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Micro indisponible');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.68;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    state.mic.stream = stream;
    state.mic.context = context;
    state.mic.analyser = analyser;
    state.mic.data = new Uint8Array(analyser.fftSize);
    state.mic.active = true;
    state.mic.error = '';
    state.mic.interval = setInterval(tickMic, 110);
    startSpeech();
    render();
  } catch (error) {
    state.mic.error = error.message || 'Micro refusé';
    toast(state.mic.error, 'bad');
    render();
  }
}

function stopMic() {
  clearInterval(state.mic.interval);
  state.mic.interval = null;
  state.mic.stream?.getTracks().forEach((track) => track.stop());
  state.mic.context?.close();
  try {
    state.mic.recognition?.stop();
  } catch {}
  state.mic = {
    ...state.mic,
    active: false,
    level: 0,
    phraseHitUntil: 0,
    phraseHitChallengeId: '',
    segments: [],
    lastHitAt: 0,
    lastHeard: '',
    lastMatch: '',
    analyser: null,
    data: null,
    recognition: null,
    stream: null,
    context: null
  };
  render();
}

function tickMic() {
  const analyser = state.mic.analyser;
  const data = state.mic.data;
  const game = state.game;
  if (!analyser || !data || !game?.currentRound) return;

  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (const value of data) {
    const centered = (value - 128) / 128;
    sum += centered * centered;
  }
  const rms = Math.sqrt(sum / data.length);
  state.mic.level = clamp(state.mic.level * 0.62 + rms * 2.4, 0, 1);

  const me = game.players.find((player) => player.id === state.user.id);
  const animalId = game.currentRound.animalsByUser?.[state.user.id] || me?.selectedAnimal || state.user.mainAnimal;
  const challenge = game.currentRound.challengesByUser?.[state.user.id] || null;
  const activeChallengeKey = challengeKey(challenge, animalId);
  const freshPhraseHit = phraseHitForChallenge(challenge, animalId);
  if (freshPhraseHit) {
    const mode = challenge?.mode || 'classic';
    const windowMs = mode === 'hold' ? 2500 : mode === 'rap' ? 900 : 1250;
    state.mic.lastHitAt = Date.now();
    state.mic.phraseHitUntil = Date.now() + windowMs;
    state.mic.phraseHitChallengeId = activeChallengeKey;
    state.mic.lastMatch = challenge?.text || animalPhrase(animalId);
  }
  // Hold mode: extend the active window as long as the mic keeps picking up sound,
  // bridging gaps between STT re-detections (STT can be slow on sustained vowels).
  if (
    challenge?.mode === 'hold' &&
    Date.now() < state.mic.phraseHitUntil &&
    state.mic.level > 0.15
  ) {
    state.mic.phraseHitUntil = Math.max(state.mic.phraseHitUntil, Date.now() + 2000);
  }
  const phraseHit = Date.now() < state.mic.phraseHitUntil
    && state.mic.phraseHitChallengeId === activeChallengeKey;

  sendWs({
    type: 'voiceTick',
    lobbyId: game.lobbyId,
    level: state.mic.level,
    phraseHit,
    freshPhraseHit,
    challengeId: challenge?.id || null
  });
}

function startSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    state.mic.error = 'Reconnaissance vocale indisponible';
    toast('Ce navigateur ne valide pas les phrases vocales.', 'bad');
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;
  recognition.onresult = (event) => {
    const now = Date.now();
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      // Collect all recognition alternatives, not just the top one
      const texts = [];
      for (let j = 0; j < event.results[i].length; j += 1) {
        const t = (event.results[i][j].transcript || '').trim();
        if (t) texts.push(t);
      }
      if (texts.length) {
        state.mic.segments.push({ text: texts.join(' '), at: now });
        state.mic.lastHeard = texts[0];
      }
    }
    // Prune segments older than maximum age
    state.mic.segments = state.mic.segments.filter((s) => now - s.at < SEGMENT_MAX_AGE);
    state.mic.error = '';
  };
  recognition.onerror = (event) => {
    // Silently restart on non-fatal errors; only surface fatal ones
    const ignorable = ['no-speech', 'aborted'];
    if (state.mic.active && !ignorable.includes(event.error)) {
      state.mic.error = 'Dis la consigne';
    }
  };
  recognition.onend = () => {
    if (state.mic.active) {
      try {
        recognition.start();
      } catch {}
    }
  };
  try {
    recognition.start();
    state.mic.recognition = recognition;
  } catch {}
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;

  if (action === 'auth-mode') {
    state.authMode = button.dataset.mode;
    render();
  }

  if (action === 'leave-game') {
    stopMic();
    state.game = null;
    state.activeLobby = null;
    location.hash = '#/dashboard';
    render();
  }

  if (action === 'logout') {
    await api('/api/auth/logout', { method: 'POST' });
    stopMic();
    state.user = null;
    state.activeLobby = null;
    state.game = null;
    location.hash = '#/';
    render();
  }

  if (action === 'pick-animal') {
    const field = button.dataset.field;
    const value = button.dataset.animal;
    const input = document.querySelector(`#${CSS.escape(field)}`);
    if (input) {
      input.value = value;
      input.setAttribute('value', value);
    }
    if (field.startsWith('lobbyAnimal:')) {
      state.selectedAnimals.set(field.split(':')[1], value);
    }
    const grid = button.closest('.animal-grid');
    grid.querySelectorAll('.animal-choice').forEach((entry) => entry.classList.toggle('selected', entry === button));
  }

  if (action === 'request-friend') {
    try {
      const payload = await api('/api/friends/request', { method: 'POST', body: { userId: Number(button.dataset.userId) } });
      state.friends = payload;
      state.searchResults = [];
      toast('Demande envoyée', 'good');
      render();
    } catch (error) {
      toast(error.message, 'bad');
    }
  }

  if (action === 'friend-response') {
    try {
      state.friends = await api('/api/friends/respond', {
        method: 'POST',
        body: { friendshipId: Number(button.dataset.friendshipId), action: button.dataset.response }
      });
      toast(button.dataset.response === 'accept' ? 'Ami ajouté' : 'Demande refusée', 'good');
      render();
    } catch (error) {
      toast(error.message, 'bad');
    }
  }

  if (action === 'invite-friend') {
    if (!state.activeLobby) return toast('Crée un lobby avant invitation', 'bad');
    sendWs({ type: 'inviteFriend', friendId: Number(button.dataset.userId), code: state.activeLobby.code });
  }

  if (action === 'copy-lobby') {
    const link = `${location.origin}/#/lobby/${button.dataset.code}`;
    await navigator.clipboard?.writeText(link);
    toast('Lien copié', 'good');
  }

  if (action === 'join-viewed-lobby') {
    await loadLobby(button.dataset.code, true, state.user.mainAnimal);
    location.hash = `#/lobby/${button.dataset.code}`;
  }

  if (action === 'ready-toggle') {
    const code = button.dataset.code;
    const selected = state.selectedAnimals.get(code) || state.activeLobby?.players.find((player) => player.id === state.user.id)?.lobbyAnimal || state.user.mainAnimal;
    try {
      const payload = await api(`/api/lobbies/${encodeURIComponent(code)}/ready`, {
        method: 'POST',
        body: { ready: button.dataset.ready === '1', firstAnimal: selected }
      });
      state.activeLobby = payload.lobby;
      render();
    } catch (error) {
      toast(error.message, 'bad');
    }
  }

  if (action === 'start-game') {
    try {
      const payload = await api(`/api/lobbies/${encodeURIComponent(button.dataset.code)}/start`, { method: 'POST' });
      state.game = payload.game;
      state.activeLobby = payload.lobby;
      location.hash = '#/game';
      render();
    } catch (error) {
      toast(error.message, 'bad');
    }
  }

  if (action === 'start-mic') startMic();
  if (action === 'stop-mic') stopMic();
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  try {
    if (form.id === 'login-form') {
      const payload = await api('/api/auth/login', { method: 'POST', body: data });
      state.user = payload.user;
      connectWs();
      await refreshMe();
      location.hash = '#/dashboard';
      render();
      return;
    }

    if (form.id === 'register-form') {
      const payload = await api('/api/auth/register', { method: 'POST', body: data });
      state.user = payload.user;
      connectWs();
      await refreshMe();
      location.hash = '#/dashboard';
      render();
      return;
    }

    if (form.id === 'profile-form') {
      const payload = await api('/api/profile', { method: 'PUT', body: data });
      state.user = payload.user;
      toast('Profil sauvegardé', 'good');
      render();
      return;
    }

    if (form.id === 'friend-search-form') {
      const payload = await api(`/api/users/search?q=${encodeURIComponent(data.q || '')}`);
      state.searchResults = payload.users;
      render();
      return;
    }

    if (form.id === 'create-lobby-form') {
      const payload = await api('/api/lobbies', { method: 'POST', body: data });
      state.activeLobby = payload.lobby;
      subscribeLobby(payload.lobby.code);
      location.hash = `#/lobby/${payload.lobby.code}`;
      render();
      return;
    }

    if (form.id === 'join-lobby-form') {
      await loadLobby(String(data.code || '').trim().toUpperCase(), true, data.firstAnimal);
      if (state.activeLobby) location.hash = `#/lobby/${state.activeLobby.code}`;
      return;
    }

    if (form.id === 'lobby-settings-form') {
      const code = form.dataset.code;
      const payload = await api(`/api/lobbies/${encodeURIComponent(code)}/settings`, { method: 'PUT', body: data });
      state.activeLobby = payload.lobby;
      render();
    }
  } catch (error) {
    toast(error.message, 'bad');
  }
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('[data-range-output]')) {
    const output = document.querySelector(`#${CSS.escape(input.dataset.rangeOutput)}`);
    if (output) output.textContent = `${input.value} secondes`;
  }
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  render();
});

setInterval(() => {
  if (state.game && location.hash.startsWith('#/game')) render();
}, 450);

async function init() {
  try {
    const payload = await api('/api/animals');
    state.animals = payload.animals;
  } catch {
    state.animals = fallbackAnimals;
  }
  await refreshMe();
  if (state.user) connectWs();
  if (!location.hash) location.hash = state.user ? '#/dashboard' : '#/';
  render();
}

init();
