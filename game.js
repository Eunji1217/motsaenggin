/* 못생긴놈들 글자나 맞춰라 — 자모 낱말 맞추기
 *
 * 한글 낱말을 24개 기본 자모(ㄱ~ㅎ, ㅏ~ㅣ)로 쪼개어 한 칸에 하나씩 맞춥니다.
 * 겹자음·겹모음은 기본 자모로 풀어 씁니다. (ㅐ = ㅏ+ㅣ, ㄲ = ㄱ+ㄱ, ㅘ = ㅗ+ㅏ)
 *
 * 힌트는 자모가 몇 칸인지뿐이라 글자 수는 상관없습니다 —
 * 6칸 판에서는 박쥐도 소나기도 똑같이 valid 한 입력이고 정답 후보입니다.
 *
 * 두 가지 방식:
 *   오늘의 낱말  하루 한 문제, 모두 같은 낱말, 순위표에 올릴 수 있음
 *   무한 연습    아무 낱말이나 계속. 이미 깬 낱말은 다시 안 나옴
 */
(function () {
  'use strict';

  // ── 한글 자모 ──────────────────────────────────────────────
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
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

  // 낱말 번호는 서버와 공유합니다. 정렬해야 양쪽이 같은 번호를 씁니다.
  const POOL = ANSWERS.slice().sort();
  const ROWS = 5;

  // ── 날짜 (한국 시각) ───────────────────────────────────────
  const kstNow = () => new Date(Date.now() + 9 * 3600000);
  function dayKey(d) {
    d = d || kstNow();
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
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
  const DAILY = POOL[hash('natmal5/' + TODAY) % POOL.length];

  // ── 사전 ──────────────────────────────────────────────────
  // 자모 길이가 같은 낱말만 필요하므로 그 길이 파일 하나만 내려받아 캐시합니다.
  const dicts = new Map();
  function loadDict(len) {
    let e = dicts.get(len);
    if (e) return e;
    e = { state: 'loading', set: null };
    dicts.set(len, e);
    fetch('dict/' + len + '.txt')
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((txt) => {
        const set = new Set();
        for (const w of txt.split('\n')) if (w) set.add(toJamo(w).join(''));
        e.set = set;
        e.state = 'ready';
      })
      .catch(() => {
        e.state = 'failed';
        if (LEN === len) say('사전을 불러오지 못했어요 · 새로고침 해주세요', 'warn', true);
      });
    return e;
  }

  // ── 저장 ──────────────────────────────────────────────────
  const SKEY = 'natmal5:v1';
  const freshToday = () => ({ day: TODAY, guesses: [], done: false, won: false, posted: false });
  const blank = () => ({
    v: 2, nick: '', pin: '', mode: 'daily',
    stats: { plays: 0, wins: 0, triesSum: 0, streak: 0, best: 0 },
    today: freshToday(),
    endless: { cleared: [], plays: 0, wins: 0, cur: null }
  });
  let save;
  try { save = JSON.parse(localStorage.getItem(SKEY)) || blank(); } catch (e) { save = blank(); }
  if (!save || !save.stats) save = blank();
  if (!save.today || save.today.day !== TODAY) save.today = freshToday();
  if (!save.endless) save.endless = { cleared: [], plays: 0, wins: 0, cur: null };
  if (!Array.isArray(save.endless.cleared)) save.endless.cleared = [];
  if (save.mode !== 'endless') save.mode = 'daily';
  const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} };

  // 저장된 기록은 자모열로 보관합니다 (첫 판 기록은 낱말 두 글자로 저장돼 있음)
  const asJamo = (g) => (g.length === 2 ? toJamo(g) : g.split(''));

  // ── 요소 ──────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board'), kbEl = $('kb'), msgEl = $('msg');
  const veil = $('veil'), sheet = $('sheet');

  // ── 판 상태 ───────────────────────────────────────────────
  let MODE = save.mode;
  let ANSWER = '', TARGET = [], LEN = 0, IDX = -1;
  let tiles = [], rowEls = [];
  let cur = [], row = 0, locked = false, busy = false;

  // ── 자판 (한 번만 만듭니다) ────────────────────────────────
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
    if (e.key && e.key.length === 1 && VALID.has(e.key)) j = e.key;
    else if (SPLIT[e.key]) j = null;
    else if (CODE[e.code]) j = CODE[e.code];
    if (j) { e.preventDefault(); type(j); }
  });

  // ── 한 판 시작 ────────────────────────────────────────────
  function startRound() {
    const st = MODE === 'daily' ? save.today : save.endless.cur;
    ANSWER = MODE === 'daily' ? DAILY : POOL[st.idx];
    IDX = MODE === 'daily' ? POOL.indexOf(DAILY) : st.idx;
    TARGET = toJamo(ANSWER);
    LEN = TARGET.length;
    loadDict(LEN);

    cur = [];
    row = st.guesses.length;
    locked = !!st.done;
    busy = false;

    boardEl.textContent = '';
    tiles = [];
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
    rowEls = [...boardEl.children];

    keyEls.forEach((b) => { delete b.dataset.state; });
    st.guesses.forEach((g, i) => reveal(i, asJamo(g), false));
    setActiveRow();
    drawMeta();
    say('');
    if (st.done) setTimeout(openResult, 200);
  }

  function state() { return MODE === 'daily' ? save.today : save.endless.cur; }

  function newEndless() {
    const done = new Set(save.endless.cleared);
    const avail = [];
    for (let i = 0; i < POOL.length; i++) if (!done.has(i)) avail.push(i);
    if (!avail.length) return false;
    save.endless.cur = { idx: avail[Math.floor(Math.random() * avail.length)], guesses: [], done: false, won: false };
    persist();
    return true;
  }

  function setMode(m) {
    // 남은 낱말이 없으면 모드를 바꾸지 않고 안내만 합니다
    if (m === 'endless' && !save.endless.cur && !newEndless()) {
      paintModes();
      allClearedSheet();
      return;
    }
    MODE = m;
    save.mode = m;
    persist();
    paintModes();
    closeSheet();
    startRound();
  }
  function paintModes() {
    $('modeDaily').setAttribute('aria-selected', String(MODE === 'daily'));
    $('modeEndless').setAttribute('aria-selected', String(MODE === 'endless'));
  }
  $('modeDaily').addEventListener('click', () => setMode('daily'));
  $('modeEndless').addEventListener('click', () => setMode('endless'));

  function drawMeta() {
    if (MODE === 'daily') {
      $('metaLeft').textContent = dayLabel();
    } else {
      $('metaLeft').innerHTML = '깬 낱말 <strong>' + save.endless.cleared.length + '</strong> / ' + POOL.length;
    }
    $('metaRight').innerHTML = '자모 <strong>' + LEN + '</strong>칸 · 기회 <strong>' + ROWS + '</strong>번';
  }

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
    const dict = dicts.get(LEN);
    if (!dict || dict.state === 'loading') return reject('사전을 불러오는 중이에요 · 잠시만요');
    if (dict.state === 'failed') return reject('사전을 불러오지 못했어요 · 새로고침 해주세요');
    const key = cur.join('');
    if (!dict.set.has(key)) return reject('사전에 없는 낱말이에요');
    state().guesses.push(key);
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
    const step = animate ? 150 : 0;
    for (let i = 0; i < LEN; i++) {
      const t = tiles[r][i];
      t.textContent = guess[i];
      t.dataset.filled = '1';
      t.setAttribute('aria-label', guess[i] + ' ' + ({ hit: '정확', near: '위치 다름', miss: '없음' })[res[i]]);
      if (animate) {
        t.classList.add('flip');
        t.style.animationDelay = (i * step) + 'ms';
        setTimeout(() => { t.dataset.state = res[i]; }, i * step + 200);
      } else {
        t.dataset.state = res[i];
      }
    }
    const after = animate ? LEN * step + 300 : 0;
    setTimeout(() => {
      paintKeys(guess, res);
      busy = false;
      if (animate) finishTurn(res);
    }, after);
  }

  function finishTurn(res) {
    const won = res.every((s) => s === 'hit');
    const st = state();
    cur = [];
    row++;
    if (!won && row < ROWS) { persist(); setActiveRow(); return; }

    locked = true;
    st.done = true;
    st.won = won;

    if (MODE === 'daily') {
      save.stats.plays++;
      if (won) {
        save.stats.wins++;
        save.stats.triesSum += st.guesses.length;
        save.stats.streak++;
        save.stats.best = Math.max(save.stats.best, save.stats.streak);
      } else {
        save.stats.streak = 0;
      }
      drawStats();
    } else {
      save.endless.plays++;
      if (won) {
        save.endless.wins++;
        if (!save.endless.cleared.includes(st.idx)) save.endless.cleared.push(st.idx);
        pushClear(st.idx, st.guesses);
      }
      drawMeta();
    }
    persist();
    setActiveRow();
    setTimeout(openResult, 380);
  }

  function setActiveRow() {
    rowEls.forEach((el, i) => {
      if (!locked && i === row) el.dataset.active = '1';
      else delete el.dataset.active;
    });
  }

  // ── 내 기록 ───────────────────────────────────────────────
  const rate = () => (save.stats.plays ? Math.round((save.stats.wins / save.stats.plays) * 100) : 0);
  function avg() {
    if (!save.stats.wins) return null;
    return Math.round((save.stats.triesSum / save.stats.wins) * 10) / 10;
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
    return state().guesses.map((g) => score(asJamo(g)).map((s) => EMOJI[s]).join('')).join('\n');
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

  const post = (path, body) => fetch(API + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  async function fetchBoard() {
    const res = await fetch(API + '/board?day=' + TODAY, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    boardCache = await res.json();
  }

  async function postScore(nick) {
    const res = await post('/score', { day: TODAY, nick, pin: ensurePin(), guesses: save.today.guesses });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 409 && data.already) return data;
    if (!res.ok) throw new Error(data.error || '순위표에 올리지 못했어요');
    return data;
  }

  // 무한 연습에서 낱말을 깰 때마다 조용히 보냅니다 (실패해도 게임엔 지장 없음)
  function pushClear(idx, guesses) {
    if (!API || !save.nick) return;
    post('/clear', { nick: save.nick, pin: ensurePin(), idx, guesses }).catch(() => {});
  }

  // 닉네임을 새 기기에서 처음 쓸 때 서버에 쌓인 진도를 합칩니다
  async function syncProgress() {
    if (!API || !save.nick) return;
    try {
      const res = await fetch(API + '/progress?nick=' + encodeURIComponent(save.nick), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.cleared)) return;
      const merged = new Set(save.endless.cleared);
      let added = 0;
      for (const i of data.cleared) if (!merged.has(i)) { merged.add(i); added++; }
      if (added) {
        save.endless.cleared = [...merged];
        persist();
        if (MODE === 'endless') drawMeta();
      }
    } catch (e) {}
  }

  function rankHTML(rows, kind) {
    if (!rows || !rows.length) {
      return '<p class="empty">아직 아무도 없어요 · 첫 번째가 되어 보세요</p>';
    }
    return '<ol class="rank">' + rows.map((r, i) => {
      const me = save.nick && r.nick === save.nick ? ' data-me="1"' : '';
      let val;
      if (kind === 'today') val = r.won ? r.tries + '번 만에' : '실패';
      else if (kind === 'endless') val = r.cleared + '개';
      else val = r.wins + '승 · 평균 ' + (r.avg == null ? '—' : r.avg);
      return '<li' + me + '><span class="pos">' + (i + 1) + '</span>' +
        '<span class="who">' + esc(r.nick) + '</span>' +
        '<span class="val">' + val + '</span></li>';
    }).join('') + '</ol>';
  }

  function openBoard() {
    if (!API) {
      return openSheet(
        '<h2 id="sheetTitle">순위표</h2><p class="sub">아직 연결되지 않았어요</p>' +
        '<p class="empty">순위표 서버가 준비되면 여기에 나타납니다</p>' +
        '<div class="btnrow"><button class="btn" type="button" data-close>닫기</button></div>'
      );
    }
    const needPost = save.today.done && !save.today.posted;
    openSheet(
      '<h2 id="sheetTitle">순위</h2>' +
      '<p class="sub">' + dayLabel() + (save.nick ? ' · ' + esc(save.nick) : '') + '</p>' +
      '<div class="tabs" role="tablist">' +
        '<button class="tab" type="button" role="tab" data-tab="today">오늘</button>' +
        '<button class="tab" type="button" role="tab" data-tab="all">누적</button>' +
        '<button class="tab" type="button" role="tab" data-tab="endless">깬 낱말</button>' +
      '</div>' +
      '<div id="rankBody"><p class="empty">불러오는 중…</p></div>' +
      '<p class="hint">올린 기록이 모두에게 보이기까지 1분쯤 걸릴 수 있어요</p>' +
      '<div class="btnrow">' +
        (needPost ? '<button class="btn" type="button" id="btnGoPost">오늘 기록 올리기</button>' : '') +
        '<button class="btn ghost" type="button" data-close>닫기</button>' +
      '</div>'
    );
    const paint = () => {
      sheet.querySelectorAll('.tab').forEach((t) =>
        t.setAttribute('aria-selected', String(t.dataset.tab === boardTab)));
      const body = $('rankBody');
      if (!body || !boardCache) return;
      const rows = boardTab === 'today' ? boardCache.today
        : boardTab === 'endless' ? boardCache.endless : boardCache.all;
      body.innerHTML = rankHTML(rows, boardTab);
    };
    sheet.querySelectorAll('.tab').forEach((t) =>
      t.addEventListener('click', () => { boardTab = t.dataset.tab; paint(); }));
    const go = $('btnGoPost');
    if (go) go.addEventListener('click', () => { MODE = 'daily'; paintModes(); save.mode = 'daily'; startRound(); });
    paint();
    fetchBoard().then(paint).catch(() => {
      const body = $('rankBody');
      if (body) body.innerHTML = '<p class="empty">순위표를 불러오지 못했어요</p>';
    });
  }

  // 닉네임 입력 칸 — 무한 연습에서도 닉네임이 있어야 깬 개수가 순위에 오릅니다
  function nickSection(label) {
    if (!API) return '';
    if (save.nick) return '';
    return '<div class="nickrow">' +
        '<input id="nickInput" type="text" maxlength="12" autocomplete="nickname" placeholder="닉네임">' +
        '<button class="btn" type="button" id="btnPost">' + label + '</button>' +
      '</div>' +
      '<p class="hint" id="nickHint">한 번 정하면 이 기기에서 계속 그 이름으로 올라갑니다</p>';
  }

  function wireNick(onDone) {
    const post2 = $('btnPost');
    if (!post2) return;
    const run = async () => {
      const input = $('nickInput'), hint = $('nickHint');
      const nick = input.value.replace(/\s+/g, ' ').trim();
      if ([...nick].length < 2 || [...nick].length > 12) {
        hint.dataset.tone = 'warn';
        hint.textContent = '닉네임은 2~12자로 지어 주세요';
        input.focus();
        return;
      }
      post2.disabled = true;
      const was = post2.textContent;
      post2.textContent = '올리는 중…';
      try {
        await onDone(nick);
      } catch (err) {
        hint.dataset.tone = 'warn';
        hint.textContent = err.message;
        post2.disabled = false;
        post2.textContent = was;
      }
    };
    post2.addEventListener('click', run);
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

  function allClearedSheet() {
    openSheet(
      '<h2 id="sheetTitle">다 깼습니다</h2>' +
      '<p class="sub">' + POOL.length + '개 낱말을 전부 맞히셨어요</p>' +
      '<p class="empty">처음부터 다시 돌리려면 아래를 누르세요</p>' +
      '<div class="btnrow">' +
        '<button class="btn" type="button" id="btnResetAll">다시 처음부터</button>' +
        '<button class="btn ghost" type="button" data-close>닫기</button>' +
      '</div>'
    );
    $('btnResetAll').addEventListener('click', () => {
      save.endless.cleared = [];
      save.endless.cur = null;
      persist();
      setMode('endless');
    });
  }

  function openResult() {
    const st = state();
    const daily = MODE === 'daily';
    const head = st.won
      ? ['맞혔어요', st.guesses.length + '번 만에 찾았습니다']
      : ['아쉬워요', '다섯 번 안에 찾지 못했습니다'];
    const a = avg();

    let tail;
    if (daily) {
      tail = (save.today.posted
          ? '<div class="btnrow" style="margin-bottom:8px">' +
            '<button class="btn ghost" type="button" id="btnSeeRank">순위표 보기</button></div>' +
            '<p class="hint"><b>' + esc(save.nick) + '</b> 이름으로 올렸습니다</p>'
          : (save.nick && API
              ? '<div class="btnrow" style="margin-bottom:8px">' +
                '<button class="btn" type="button" id="btnPostNow">' + esc(save.nick) + ' 이름으로 순위 등록</button></div>'
              : nickSection('순위 등록'))) +
        '<div class="btnrow">' +
          '<button class="btn" type="button" id="btnCopy">결과 복사하기</button>' +
          '<button class="btn ghost" type="button" data-close>닫기</button>' +
        '</div>' +
        '<p class="next">다음 낱말까지 <span id="cd">--:--:--</span></p>' +
        '<dl class="stats" style="margin-top:14px">' +
          '<div class="stat"><dt>누적 플레이</dt><dd>' + save.stats.plays + ' ' + seedling() + '</dd></div>' +
          '<div class="stat"><dt>승률</dt><dd>' + rate() + '%</dd></div>' +
          '<div class="stat"><dt>평균 시도</dt><dd>' + (a === null ? '—' : a) + '</dd></div>' +
        '</dl>';
    } else {
      tail = (save.nick ? '' : nickSection('닉네임 정하기')) +
        '<div class="btnrow">' +
          '<button class="btn" type="button" id="btnNext">다음 낱말</button>' +
          '<button class="btn ghost" type="button" data-close>닫기</button>' +
        '</div>' +
        '<dl class="stats" style="margin-top:14px">' +
          '<div class="stat"><dt>깬 낱말</dt><dd>' + save.endless.cleared.length + '</dd></div>' +
          '<div class="stat"><dt>남은 낱말</dt><dd>' + (POOL.length - save.endless.cleared.length) + '</dd></div>' +
          '<div class="stat"><dt>푼 판</dt><dd>' + save.endless.plays + '</dd></div>' +
        '</dl>';
    }

    openSheet(
      '<h2 id="sheetTitle">' + head[0] + '</h2>' +
      '<p class="sub">' + (daily ? dayLabel() : '무한 연습') + ' · ' + head[1] + '</p>' +
      '<pre class="grid-emoji">' + emojiGrid() + '</pre>' +
      '<div class="answer-line"><span>' + (daily ? '오늘의 낱말' : '정답') + '</span><b>' + ANSWER + '</b></div>' +
      tail
    );

    const copy = $('btnCopy');
    if (copy) copy.addEventListener('click', (e) => copyShare(e.currentTarget));
    const see = $('btnSeeRank');
    if (see) see.addEventListener('click', openBoard);
    const next = $('btnNext');
    if (next) next.addEventListener('click', () => {
      if (!newEndless()) return allClearedSheet();
      closeSheet();
      startRound();
    });
    const now = $('btnPostNow');
    if (now) now.addEventListener('click', async () => {
      now.disabled = true;
      now.textContent = '올리는 중…';
      try {
        await postScore(save.nick);
        save.today.posted = true;
        persist();
        boardCache = null;
        openBoard();
      } catch (err) {
        now.disabled = false;
        now.textContent = err.message;
      }
    });

    wireNick(async (nick) => {
      if (daily) {
        await postScore(nick);
        save.today.posted = true;
      }
      save.nick = nick;
      persist();
      // 닉네임을 정하기 전에 깬 이 판은 아직 서버에 없으므로 지금 보냅니다
      if (!daily && st.won) pushClear(st.idx, st.guesses);
      syncProgress();
      boardCache = null;
      if (daily) openBoard(); else openResult();
    });

    if (daily) tickCountdown();
  }

  let cdTimer;
  function tickCountdown() {
    clearInterval(cdTimer);
    const run = () => {
      const el = $('cd');
      if (!el) return clearInterval(cdTimer);
      const d = kstNow();
      const ms = 86400000 - (d.getUTCHours() * 3600000 + d.getUTCMinutes() * 60000 + d.getUTCSeconds() * 1000);
      const p = (n) => String(n).padStart(2, '0');
      el.textContent = p(Math.floor(ms / 3600000)) + ':' + p(Math.floor(ms / 60000) % 60) + ':' + p(Math.floor(ms / 1000) % 60);
    };
    run();
    cdTimer = setInterval(run, 1000);
  }

  function openHelp() {
    openSheet(
      '<h2 id="sheetTitle">규칙</h2>' +
      '<p class="sub">다섯 번 안에 낱말을 찾으세요</p>' +
      '<ul class="rules">' +
        '<li>힌트는 <b>자모가 몇 칸인지</b>뿐입니다. 글자 수는 알려주지 않아요.</li>' +
        '<li>겹자모는 풀어서 셉니다. <b>번개 = ㅂ ㅓ ㄴ ㄱ ㅏ ㅣ</b> (여섯 칸)</li>' +
        '<li>그래서 6칸 판에는 <b>박쥐</b>도 <b>소나기</b>도 들어갑니다.</li>' +
        '<li><span class="swatch sw-hit">ㅂ</span> 자리까지 정확합니다.</li>' +
        '<li><span class="swatch sw-near">ㅏ</span> 낱말에 있지만 자리가 달라요.</li>' +
        '<li><span class="swatch sw-miss">ㅅ</span> 낱말에 없는 자모예요.</li>' +
        '<li>35만여 개 낱말이 입력으로 인정됩니다.</li>' +
        '<li><b>오늘의 낱말</b>은 하루 한 문제, 모두가 같은 낱말을 풉니다.</li>' +
        '<li><b>무한 연습</b>은 계속 새 낱말이 나오고, 한 번 깬 낱말은 다시 안 나옵니다.</li>' +
      '</ul>' +
      '<div class="btnrow"><button class="btn" type="button" data-close>시작하기</button></div>'
    );
  }

  $('btnHelp').addEventListener('click', openHelp);
  $('btnRank').addEventListener('click', openBoard);
  if (!API) $('btnRank').hidden = true;

  // ── 시작 ──────────────────────────────────────────────────
  if (MODE === 'endless' && !save.endless.cur && !newEndless()) MODE = save.mode = 'daily';
  paintModes();
  drawStats();
  startRound();
  syncProgress();
  if (!save.today.guesses.length && !save.stats.plays && MODE === 'daily') {
    say('자모 ' + LEN + '칸을 채우고 입력을 누르세요 · 규칙은 ?', '', true);
  }
})();
