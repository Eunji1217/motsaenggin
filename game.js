/* 못생긴놈들 글자나 맞춰라 — 자모 단어 맞추기
 * 한글 낱말을 24개 기본 자모(ㄱ~ㅎ, ㅏ~ㅣ)로 쪼개어 한 칸에 하나씩 맞춥니다.
 * 겹자음·겹모음은 기본 자모로 풀어 씁니다. (ㅐ = ㅏ+ㅣ, ㄲ = ㄱ+ㄱ, ㅘ = ㅗ+ㅏ)
 */
(function () {
  'use strict';

  // ── 한글 자모 ──────────────────────────────────────────────
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 겹자모 → 기본 자모
  const SPLIT = {
    'ㄲ':'ㄱㄱ','ㄸ':'ㄷㄷ','ㅃ':'ㅂㅂ','ㅆ':'ㅅㅅ','ㅉ':'ㅈㅈ',
    'ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ',
    'ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ',
    'ㅐ':'ㅏㅣ','ㅒ':'ㅑㅣ','ㅔ':'ㅓㅣ','ㅖ':'ㅕㅣ',
    'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅏㅣ','ㅚ':'ㅗㅣ',
    'ㅝ':'ㅜㅓ','ㅞ':'ㅜㅓㅣ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ'
  };
  const basics = (j) => (SPLIT[j] ? SPLIT[j].split('') : [j]);

  function toJamo(word) {
    const out = [];
    for (const ch of word) {
      const c = ch.charCodeAt(0) - 0xac00;
      if (c < 0 || c > 11171) continue;
      const i = Math.floor(c / 588), m = Math.floor((c % 588) / 28), f = c % 28;
      out.push.apply(out, basics(CHO[i]));
      out.push.apply(out, basics(JUNG[m]));
      if (f) out.push.apply(out, basics(JONG[f]));
    }
    return out;
  }

  const pool = ANSWERS.slice().sort();

  // ── 오늘 ──────────────────────────────────────────────────
  const KST = 9 * 3600000;
  const kstNow = () => new Date(Date.now() + KST);
  function dayKey(d) {
    d = d || kstNow();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  function dayLabel(d) {
    d = d || kstNow();
    return d.getUTCFullYear() + '년 ' + (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일';
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const TODAY = dayKey();
  const ANSWER = pool[hash('natmal5/' + TODAY) % pool.length];
  const TARGET = toJamo(ANSWER);
  const LEN = TARGET.length;
  const ROWS = 5;

  // ── 사전 ──────────────────────────────────────────────────
  // 자모 길이가 같은 낱말만 있으면 되므로 오늘 쓸 파일 하나만 내려받습니다.
  // 78,000여 개 두 음절 낱말 전체가 입력으로 인정됩니다.
  let WORDS = null;
  let dictState = 'loading';
  fetch('dict/' + LEN + '.txt')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((txt) => {
      const set = new Set();
      for (let i = 0; i + 2 <= txt.length; i += 2) set.add(toJamo(txt.substr(i, 2)).join(''));
      WORDS = set;
      dictState = 'ready';
    })
    .catch(() => {
      dictState = 'failed';
      say('사전을 불러오지 못했어요 · 새로고침 해주세요', 'warn', true);
    });

  // 저장된 기록은 자모열로 보관합니다 (예전 판은 낱말 두 글자로 저장돼 있음)
  const asJamo = (g) => (g.length === 2 ? toJamo(g) : g.split(''));

  // ── 저장 ──────────────────────────────────────────────────
  const SKEY = 'natmal5:v1';
  const blank = () => ({
    nick: '',
    pin: '',
    stats: { plays: 0, wins: 0, triesSum: 0, streak: 0, best: 0 },
    today: { day: TODAY, guesses: [], done: false, won: false, posted: false }
  });
  let save;
  try { save = JSON.parse(localStorage.getItem(SKEY)) || blank(); } catch (e) { save = blank(); }
  if (!save.stats) save = blank();
  if (!save.today || save.today.day !== TODAY) save.today = { day: TODAY, guesses: [], done: false, won: false, posted: false };
  const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} };

  // ── 상태 ──────────────────────────────────────────────────
  let cur = [];                       // 입력 중인 자모
  let row = save.today.guesses.length; // 현재 줄
  let locked = save.today.done;
  let busy = false;

  // ── 요소 ──────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board'), kbEl = $('kb'), msgEl = $('msg');
  const veil = $('veil'), sheet = $('sheet');

  $('metaDate').textContent = dayLabel();
  $('metaLen').textContent = LEN;

  // ── 보드 ──────────────────────────────────────────────────
  const tiles = [];
  for (let r = 0; r < ROWS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    rowEl.style.gridTemplateColumns = '18px repeat(' + LEN + ', 1fr)';
    const num = document.createElement('span');
    num.className = 'rownum';
    num.textContent = r + 1;
    rowEl.appendChild(num);
    const line = [];
    for (let c = 0; c < LEN; c++) {
      const t = document.createElement('div');
      t.className = 'tile';
      rowEl.appendChild(t);
      line.push(t);
    }
    tiles.push(line);
    boardEl.appendChild(rowEl);
  }
  const rowEls = [...boardEl.children];

  // ── 자판 ──────────────────────────────────────────────────
  const KB = [
    ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','⌫'],
    ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
    ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','입력']
  ];
  const keyEls = new Map();
  for (const line of KB) {
    const r = document.createElement('div');
    r.className = 'kbrow';
    for (const k of line) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = k;
      if (k === '입력') { b.classList.add('wide', 'enter'); b.setAttribute('aria-label', '입력'); }
      else if (k === '⌫') { b.setAttribute('aria-label', '지우기'); }
      else { keyEls.set(k, b); }
      b.addEventListener('click', () => {
        if (k === '입력') submit();
        else if (k === '⌫') back();
        else type(k);
      });
      r.appendChild(b);
    }
    kbEl.appendChild(r);
  }

  // 두벌식 물리 자판 (영문 입력 상태에서도 그대로 칠 수 있게)
  const CODE = {
    KeyQ:'ㅂ', KeyW:'ㅈ', KeyE:'ㄷ', KeyR:'ㄱ', KeyT:'ㅅ', KeyY:'ㅛ', KeyU:'ㅕ', KeyI:'ㅑ',
    KeyA:'ㅁ', KeyS:'ㄴ', KeyD:'ㅇ', KeyF:'ㄹ', KeyG:'ㅎ', KeyH:'ㅗ', KeyJ:'ㅓ', KeyK:'ㅏ', KeyL:'ㅣ',
    KeyZ:'ㅋ', KeyX:'ㅌ', KeyC:'ㅊ', KeyV:'ㅍ', KeyB:'ㅠ', KeyN:'ㅜ', KeyM:'ㅡ'
  };
  const VALID = new Set(Object.values(CODE));

  document.addEventListener('keydown', (e) => {
    if (!veil.hidden) { if (e.key === 'Escape') closeSheet(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
    let j = null;
    if (e.key && e.key.length === 1 && VALID.has(e.key)) j = e.key;       // 한글 자판 직접 입력
    else if (SPLIT[e.key]) j = null;                                       // 겹자모는 무시
    else if (CODE[e.code]) j = CODE[e.code];
    if (j) { e.preventDefault(); type(j); }
  });

  // ── 입력 ──────────────────────────────────────────────────
  function type(j) {
    if (locked || busy || cur.length >= LEN) return;
    if (msgEl.textContent) say('');
    cur.push(j);
    const t = tiles[row][cur.length - 1];
    t.textContent = j;
    t.dataset.filled = '1';
    t.classList.add('pop');
    setTimeout(() => t.classList.remove('pop'), 120);
    setActiveRow();
  }

  function back() {
    if (locked || busy || !cur.length) return;
    cur.pop();
    const t = tiles[row][cur.length];
    t.textContent = '';
    delete t.dataset.filled;
  }

  function submit() {
    if (locked || busy) return;
    if (cur.length < LEN) return reject('자모 ' + LEN + '칸을 모두 채워 주세요');
    if (dictState === 'loading') return reject('사전을 불러오는 중이에요 · 잠시만요');
    if (dictState === 'failed') return reject('사전을 불러오지 못했어요 · 새로고침 해주세요');
    const key = cur.join('');
    if (!WORDS.has(key)) return reject('사전에 없는 낱말이에요');
    save.today.guesses.push(key);
    reveal(row, cur.slice(), true);
  }

  function reject(text) {
    say(text, 'warn');
    rowEls[row].classList.remove('shake');
    void rowEls[row].offsetWidth;
    rowEls[row].classList.add('shake');
  }

  let msgTimer;
  function say(text, tone, sticky) {
    msgEl.textContent = text;
    msgEl.dataset.tone = tone || '';
    clearTimeout(msgTimer);
    if (text && !sticky) msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 2400);
  }

  // ── 채점 ──────────────────────────────────────────────────
  function score(guess) {
    const res = new Array(LEN).fill('miss');
    const left = new Map();
    for (let i = 0; i < LEN; i++) {
      if (guess[i] === TARGET[i]) res[i] = 'hit';
      else left.set(TARGET[i], (left.get(TARGET[i]) || 0) + 1);
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] === 'hit') continue;
      const n = left.get(guess[i]) || 0;
      if (n > 0) { res[i] = 'near'; left.set(guess[i], n - 1); }
    }
    return res;
  }

  const RANK = { miss: 1, near: 2, hit: 3 };
  function paintKeys(guess, res) {
    for (let i = 0; i < LEN; i++) {
      const b = keyEls.get(guess[i]);
      if (!b) continue;
      const now = b.dataset.state;
      if (!now || RANK[res[i]] > RANK[now]) b.dataset.state = res[i];
    }
  }

  function reveal(r, guess, animate) {
    const res = score(guess);
    busy = !!animate;
    const step = animate ? 170 : 0;
    for (let i = 0; i < LEN; i++) {
      const t = tiles[r][i];
      t.textContent = guess[i];
      t.dataset.filled = '1';
      t.setAttribute('aria-label', guess[i] + ' ' + ({ hit: '정확', near: '위치 다름', miss: '없음' })[res[i]]);
      if (animate) {
        t.classList.add('flip');
        t.style.animationDelay = (i * step) + 'ms';
        setTimeout(() => { t.dataset.state = res[i]; }, i * step + 220);
      } else {
        t.dataset.state = res[i];
      }
    }
    const after = animate ? LEN * step + 320 : 0;
    setTimeout(() => {
      paintKeys(guess, res);
      busy = false;
      if (animate) finishTurn(res);
    }, after);
  }

  function finishTurn(res) {
    const won = res.every((s) => s === 'hit');
    cur = [];
    row++;
    if (won || row >= ROWS) {
      locked = true;
      save.today.done = true;
      save.today.won = won;
      save.stats.plays++;
      if (won) {
        save.stats.wins++;
        save.stats.triesSum += save.today.guesses.length;
        save.stats.streak++;
        save.stats.best = Math.max(save.stats.best, save.stats.streak);
      } else {
        save.stats.streak = 0;
      }
      persist();
      drawStats();
      setTimeout(() => openResult(), 380);
    } else {
      persist();
      setActiveRow();
    }
  }

  function setActiveRow() {
    rowEls.forEach((el, i) => {
      if (!locked && i === row) el.dataset.active = '1';
      else delete el.dataset.active;
    });
  }

  // ── 기록 ──────────────────────────────────────────────────
  const rate = () => (save.stats.plays ? Math.round((save.stats.wins / save.stats.plays) * 100) : 0);
  function avg() {
    if (!save.stats.wins) return null;
    const a = save.stats.triesSum / save.stats.wins;
    return Math.round(a * 10) / 10;
  }
  function seedling() {
    const p = save.stats.plays;
    if (p >= 50) return '🌳';
    if (p >= 20) return '🌿';
    if (p >= 5) return '🍀';
    return '🌱';
  }
  function drawStats() {
    $('sPlays').textContent = save.stats.plays;
    $('sRate').textContent = save.stats.plays ? rate() + '%' : '—';
    const a = avg();
    $('sAvg').textContent = a === null ? '—' : a;
  }

  // ── 공유 ──────────────────────────────────────────────────
  const EMOJI = { hit: '🟩', near: '🟨', miss: '⬛' };
  function emojiGrid() {
    return save.today.guesses
      .map((g) => score(asJamo(g)).map((s) => EMOJI[s]).join(''))
      .join('\n');
  }
  function shareText() {
    const a = avg();
    const lines = [
      dayLabel() + ' ' + (save.today.won ? '성공!' : '실패'),
      '',
      emojiGrid(),
      '',
      '누적 플레이 수: ' + save.stats.plays + ' ' + seedling(),
      '승률: ' + rate() + '%',
      '평균 시도 횟수: ' + (a === null ? '—' : a)
    ];
    if (location.protocol.startsWith('http')) lines.push('', location.origin + location.pathname);
    return lines.join('\n');
  }

  async function copyShare(btn) {
    const text = shareText();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch (e2) { ok = false; }
    }
    btn.textContent = ok ? '복사했어요' : '복사에 실패했어요';
    setTimeout(() => { btn.textContent = '결과 복사하기'; }, 1800);
  }

  // ── 순위표 ────────────────────────────────────────────────
  const API = String(window.BOARD_API || '').replace(/\/+$/, '');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 닉네임을 남이 가로채지 못하도록 이 기기에서만 아는 열쇠를 함께 보냅니다
  function ensurePin() {
    if (!save.pin) {
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      save.pin = [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
      persist();
    }
    return save.pin;
  }

  let boardCache = null;
  let boardTab = 'today';

  async function fetchBoard() {
    const res = await fetch(API + '/board?day=' + TODAY, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    boardCache = await res.json();
  }

  async function postScore(nick) {
    const res = await fetch(API + '/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day: TODAY, nick: nick, pin: ensurePin(), guesses: save.today.guesses })
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 409 && data.already) return data;   // 이미 올린 건 성공으로 봅니다
    if (!res.ok) throw new Error(data.error || '순위표에 올리지 못했어요');
    return data;
  }

  function rankHTML(rows, kind) {
    if (!rows || !rows.length) {
      return '<p class="empty">아직 아무도 없어요 · 첫 번째가 되어 보세요</p>';
    }
    return '<ol class="rank">' + rows.map((r, i) => {
      const me = save.nick && r.nick === save.nick ? ' data-me="1"' : '';
      const val = kind === 'today'
        ? (r.won ? r.tries + '번 만에' : '실패')
        : (r.wins + '승 · 평균 ' + (r.avg == null ? '—' : r.avg));
      return '<li' + me + '>' +
        '<span class="pos">' + (i + 1) + '</span>' +
        '<span class="who">' + esc(r.nick) + '</span>' +
        '<span class="val">' + val + '</span></li>';
    }).join('') + '</ol>';
  }

  function openBoard() {
    if (!API) {
      return openSheet(
        '<h2 id="sheetTitle">순위표</h2>' +
        '<p class="sub">아직 연결되지 않았어요</p>' +
        '<p class="empty">순위표 서버가 준비되면 여기에 나타납니다</p>' +
        '<div class="btnrow"><button class="btn" type="button" data-close>닫기</button></div>'
      );
    }
    const needPost = save.today.done && !save.today.posted;
    openSheet(
      '<h2 id="sheetTitle">순위</h2>' +
      '<p class="sub">' + dayLabel() + '</p>' +
      '<div class="tabs" role="tablist">' +
        '<button class="tab" type="button" role="tab" data-tab="today">오늘</button>' +
        '<button class="tab" type="button" role="tab" data-tab="all">누적</button>' +
      '</div>' +
      '<div id="rankBody"><p class="empty">불러오는 중…</p></div>' +
      '<p class="hint">올린 기록이 모두에게 보이기까지 1분쯤 걸릴 수 있어요</p>' +
      '<div class="btnrow">' +
        (needPost ? '<button class="btn" type="button" id="btnGoPost">내 기록 올리기</button>' : '') +
        '<button class="btn ghost" type="button" data-close>닫기</button>' +
      '</div>'
    );
    const paint = () => {
      sheet.querySelectorAll('.tab').forEach((t) =>
        t.setAttribute('aria-selected', String(t.dataset.tab === boardTab)));
      const body = $('rankBody');
      if (!body || !boardCache) return;
      body.innerHTML = rankHTML(boardTab === 'today' ? boardCache.today : boardCache.all, boardTab);
    };
    sheet.querySelectorAll('.tab').forEach((t) =>
      t.addEventListener('click', () => { boardTab = t.dataset.tab; paint(); }));
    const go = $('btnGoPost');
    if (go) go.addEventListener('click', openResult);
    paint();
    fetchBoard().then(paint).catch(() => {
      const body = $('rankBody');
      if (body) body.innerHTML = '<p class="empty">순위표를 불러오지 못했어요</p>';
    });
  }

  // 결과 겹창 안의 등록 칸
  function postSection() {
    if (!API || !save.today.done) return '';
    if (save.today.posted) {
      return '<div class="btnrow" style="margin-bottom:8px">' +
        '<button class="btn ghost" type="button" id="btnSeeRank">순위표 보기</button></div>' +
        '<p class="hint"><b>' + esc(save.nick) + '</b> 이름으로 올렸습니다</p>';
    }
    return '<div class="nickrow">' +
        '<input id="nickInput" type="text" maxlength="12" autocomplete="nickname" ' +
        'placeholder="닉네임" value="' + esc(save.nick || '') + '">' +
        '<button class="btn" type="button" id="btnPost">순위 등록</button>' +
      '</div>' +
      '<p class="hint" id="nickHint">한 번 정하면 이 기기에서 계속 그 이름으로 올라갑니다</p>';
  }

  function wirePost() {
    const see = $('btnSeeRank');
    if (see) see.addEventListener('click', openBoard);
    const post = $('btnPost');
    if (!post) return;
    const run = async () => {
      const input = $('nickInput'), hint = $('nickHint');
      const nick = input.value.replace(/\s+/g, ' ').trim();
      if ([...nick].length < 2 || [...nick].length > 12) {
        hint.dataset.tone = 'warn';
        hint.textContent = '닉네임은 2~12자로 지어 주세요';
        input.focus();
        return;
      }
      post.disabled = true;
      post.textContent = '올리는 중…';
      try {
        await postScore(nick);
        save.nick = nick;
        save.today.posted = true;
        persist();
        boardCache = null;
        openBoard();
      } catch (err) {
        hint.dataset.tone = 'warn';
        hint.textContent = err.message;
        post.disabled = false;
        post.textContent = '순위 등록';
      }
    };
    post.addEventListener('click', run);
    $('nickInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); run(); }
    });
  }

  // ── 겹창 ──────────────────────────────────────────────────
  function openSheet(html) {
    sheet.innerHTML = html;
    veil.hidden = false;
    sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));
    const first = sheet.querySelector('button');
    if (first) first.focus();
  }
  function closeSheet() { veil.hidden = true; }
  veil.addEventListener('click', (e) => { if (e.target === veil) closeSheet(); });

  function openResult() {
    const a = avg();
    const head = save.today.won
      ? ['맞혔어요', save.today.guesses.length + '번 만에 찾았습니다']
      : ['아쉬워요', '다섯 번 안에 찾지 못했습니다'];
    openSheet(
      '<h2 id="sheetTitle">' + head[0] + '</h2>' +
      '<p class="sub">' + dayLabel() + ' · ' + head[1] + '</p>' +
      '<pre class="grid-emoji">' + emojiGrid() + '</pre>' +
      '<div class="answer-line"><span>오늘의 낱말</span><b>' + ANSWER + '</b></div>' +
      postSection() +
      '<div class="btnrow">' +
        '<button class="btn" type="button" id="btnCopy">결과 복사하기</button>' +
        '<button class="btn ghost" type="button" data-close>닫기</button>' +
      '</div>' +
      '<p class="next">다음 낱말까지 <span id="cd">--:--:--</span></p>' +
      '<dl class="stats" style="margin-top:14px">' +
        '<div class="stat"><dt>누적 플레이</dt><dd>' + save.stats.plays + ' ' + seedling() + '</dd></div>' +
        '<div class="stat"><dt>승률</dt><dd>' + rate() + '%</dd></div>' +
        '<div class="stat"><dt>평균 시도</dt><dd>' + (a === null ? '—' : a) + '</dd></div>' +
      '</dl>'
    );
    $('btnCopy').addEventListener('click', (e) => copyShare(e.currentTarget));
    wirePost();
    tickCountdown();
  }

  let cdTimer;
  function tickCountdown() {
    clearInterval(cdTimer);
    const run = () => {
      const el = $('cd');
      if (!el) return clearInterval(cdTimer);
      const d = kstNow();
      let ms = 86400000 - (d.getUTCHours() * 3600000 + d.getUTCMinutes() * 60000 + d.getUTCSeconds() * 1000);
      const p = (n) => String(n).padStart(2, '0');
      el.textContent = p(Math.floor(ms / 3600000)) + ':' + p(Math.floor(ms / 60000) % 60) + ':' + p(Math.floor(ms / 1000) % 60);
    };
    run();
    cdTimer = setInterval(run, 1000);
  }

  function openHelp() {
    openSheet(
      '<h2 id="sheetTitle">규칙</h2>' +
      '<p class="sub">다섯 번 안에 오늘의 낱말을 찾으세요</p>' +
      '<ul class="rules">' +
        '<li>낱말은 두 글자입니다. 힌트는 <b>자모가 몇 칸인지</b>뿐이에요.</li>' +
        '<li>겹자모는 풀어서 셉니다. <b>번개 = ㅂ ㅓ ㄴ ㄱ ㅏ ㅣ</b> (여섯 칸)</li>' +
        '<li><span class="swatch sw-hit">ㅂ</span> 자리까지 정확합니다.</li>' +
        '<li><span class="swatch sw-near">ㅏ</span> 낱말에 있지만 자리가 달라요.</li>' +
        '<li><span class="swatch sw-miss">ㅅ</span> 낱말에 없는 자모예요.</li>' +
        '<li>두 음절 낱말 78,000여 개가 입력으로 인정됩니다.</li>' +
        '<li>낱말은 한국 시각 자정에 바뀌고, 그날은 모두가 같은 낱말을 풉니다.</li>' +
        '<li>다 풀면 닉네임을 정해 <b>순위표</b>에 올릴 수 있어요.</li>' +
      '</ul>' +
      '<div class="btnrow"><button class="btn" type="button" data-close>시작하기</button></div>'
    );
  }

  $('btnHelp').addEventListener('click', openHelp);
  $('btnRank').addEventListener('click', openBoard);
  if (!API) $('btnRank').hidden = true;   // 순위표 서버가 없으면 조용히 숨깁니다

  // ── 되살리기 ───────────────────────────────────────────────
  save.today.guesses.forEach((g, i) => reveal(i, asJamo(g), false));
  drawStats();
  setActiveRow();
  if (save.today.done) setTimeout(openResult, 200);
  else if (!save.today.guesses.length) say('자모 ' + LEN + '칸을 채우고 입력을 누르세요 · 규칙은 ?', '', true);
})();
