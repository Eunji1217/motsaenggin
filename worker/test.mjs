/* 워커 로직 테스트 — KV 를 흉내 내어 배포 없이 돌립니다.
 * 실행: node worker/test.mjs
 */
import worker from './src/index.js';
import { ANSWERS } from './src/answers.js';
import { toJamo, hash } from './src/jamo.js';

const store = new Map();
const SCORES = {
  async getWithMetadata(k) {
    const e = store.get(k);
    return e ? { value: e.value, metadata: e.metadata } : { value: null, metadata: null };
  },
  async put(k, v, opts = {}) { store.set(k, { value: v, metadata: opts.metadata || null }); },
  async list({ prefix }) {
    return {
      keys: [...store.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, e]) => ({ name: k, metadata: e.metadata }))
    };
  }
};
const env = { SCORES };
const ORIGIN = 'https://eunji1217.github.io';

function today() {
  const d = new Date(Date.now() + 9 * 3600000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
const POOL = ANSWERS.slice().sort();
const DAY = today();
const ANSWER = POOL[hash('natmal5/' + DAY) % POOL.length];
const TARGET = toJamo(ANSWER).join('');
const LEN = TARGET.length;

// 같은 자모 길이의 아무 낱말이나 오답용으로 하나 구합니다
const other = POOL.find((w) => toJamo(w).length === LEN && toJamo(w).join('') !== TARGET);
const OTHER = toJamo(other).join('');

const post = (body) => worker.fetch(new Request('https://x/score', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify(body)
}), env);
const get = (path) => worker.fetch(new Request('https://x' + path, { headers: { origin: ORIGIN } }), env);

let pass = 0, fail = 0;
async function check(name, res, expectStatus, expectIn) {
  const body = await res.clone().json().catch(() => ({}));
  const okStatus = res.status === expectStatus;
  const okBody = expectIn == null || JSON.stringify(body).includes(expectIn);
  if (okStatus && okBody) { pass++; console.log('  ✔ ' + name); }
  else { fail++; console.log('  ✘ ' + name + '  → ' + res.status + ' ' + JSON.stringify(body)); }
  return body;
}

console.log('오늘(' + DAY + ') 정답: ' + ANSWER + '  (' + LEN + '칸)\n');

// 정상 제출 — 3번 만에 성공
await check('정상 제출', await post({ day: DAY, nick: '은지', pin: 'a'.repeat(32), guesses: [OTHER, OTHER, TARGET] }), 200, '"ok":true');

// 같은 사람이 또 올리기
await check('중복 제출은 거부', await post({ day: DAY, nick: '은지', pin: 'a'.repeat(32), guesses: [TARGET] }), 409, 'already');

// 남이 같은 닉네임 쓰기
await check('닉네임 가로채기 거부', await post({ day: DAY, nick: '은지', pin: 'b'.repeat(32), guesses: [TARGET] }), 409, '이미 쓰이는');

// 조작된 기록들
await check('자모 길이가 틀린 기록 거부', await post({ day: DAY, nick: '사기꾼', pin: 'c'.repeat(32), guesses: ['ㄱㄴ'] }), 400, '잘못된');
await check('정답 맞히고 더 친 기록 거부', await post({ day: DAY, nick: '사기꾼', pin: 'c'.repeat(32), guesses: [TARGET, OTHER] }), 400, '앞뒤');
await check('안 끝난 판 거부', await post({ day: DAY, nick: '사기꾼', pin: 'c'.repeat(32), guesses: [OTHER, OTHER] }), 400, '끝나지');
await check('어제 기록 거부', await post({ day: '2020-01-01', nick: '사기꾼', pin: 'c'.repeat(32), guesses: [TARGET] }), 400, '오늘');
await check('짧은 닉네임 거부', await post({ day: DAY, nick: 'ㅇ', pin: 'c'.repeat(32), guesses: [TARGET] }), 400, '2~12');
await check('열쇠 없는 요청 거부', await post({ day: DAY, nick: '무단', guesses: [TARGET] }), 400, '잘못된');

// 실패한 판 (다섯 번 다 틀림)
await check('실패 기록도 접수', await post({ day: DAY, nick: '아쉬움', pin: 'd'.repeat(32), guesses: Array(5).fill(OTHER) }), 200, '"ok":true');

// 한 번에 맞힌 사람
await check('1번 만에 성공', await post({ day: DAY, nick: '천재', pin: 'e'.repeat(32), guesses: [TARGET] }), 200, '"ok":true');

// 순위
const board = await (await get('/board')).json();
console.log('\n오늘 순위:', board.today.map((r, i) => (i + 1) + '위 ' + r.nick + ' ' + (r.won ? r.tries + '번' : '실패')).join(' / '));
console.log('누적 순위:', board.all.map((r, i) => (i + 1) + '위 ' + r.nick + ' ' + r.wins + '승 평균' + r.avg).join(' / '));

const order = board.today.map((r) => r.nick).join(',');
if (order === '천재,은지,아쉬움') { pass++; console.log('  ✔ 순위 정렬 (적은 시도 → 성공 우선 → 실패)'); }
else { fail++; console.log('  ✘ 순위 정렬 → ' + order); }

// CORS
const opt = await worker.fetch(new Request('https://x/score', { method: 'OPTIONS', headers: { origin: ORIGIN } }), env);
if (opt.headers.get('access-control-allow-origin') === ORIGIN) { pass++; console.log('  ✔ CORS 허용 헤더'); }
else { fail++; console.log('  ✘ CORS → ' + opt.headers.get('access-control-allow-origin')); }

console.log('\n통과 ' + pass + ' / 실패 ' + fail);
process.exit(fail ? 1 : 0);
