/* dict/*.txt 생성 — 입력으로 인정할 두 글자 낱말 사전
 *
 * 출처: https://github.com/acidsound/korean_wordlist (wordslistUnique.txt)
 * 거기서 "순한글 두 음절"만 추려 자모 길이별 파일로 나눕니다.
 * 게임은 그날 정답의 자모 길이에 해당하는 파일 하나만 내려받습니다.
 *
 * 실행: node tools/build-dict.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = 'https://raw.githubusercontent.com/acidsound/korean_wordlist/master/wordslistUnique.txt';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dict');

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
    if (c < 0 || c > 11171) return [];
    const i = Math.floor(c / 588), m = Math.floor((c % 588) / 28), f = c % 28;
    out.push.apply(out, basics(CHO[i]));
    out.push.apply(out, basics(JUNG[m]));
    if (f) out.push.apply(out, basics(JONG[f]));
  }
  return out;
}

(async () => {
  process.stdout.write('내려받는 중… ');
  const res = await fetch(SRC);
  if (!res.ok) throw new Error('원본을 받지 못했습니다: ' + res.status);
  const text = await res.text();
  console.log((text.length / 1048576).toFixed(1) + 'MB');

  const words = new Set();
  for (const raw of text.split('\n')) {
    const w = raw.trim();
    if (/^[가-힣]{2}$/.test(w)) words.add(w);
  }
  console.log('두 음절 낱말: ' + words.size.toLocaleString());

  // 출제 후보는 반드시 입력도 가능해야 합니다 (정답을 못 쳐 넣으면 게임이 깨짐)
  const src = fs.readFileSync(path.join(ROOT, 'words.js'), 'utf8');
  const { ANSWERS } = eval('(()=>{' + src + '\nreturn {ANSWERS};})()');
  let added = 0;
  for (const w of ANSWERS) if (!words.has(w)) { words.add(w); added++; }
  if (added) console.log('출제 후보 중 원본에 없어 추가: ' + added);

  const byLen = new Map();
  for (const w of words) {
    const n = toJamo(w).length;
    if (!n) continue;
    if (!byLen.has(n)) byLen.set(n, []);
    byLen.get(n).push(w);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const index = {};
  for (const [n, list] of [...byLen].sort((a, b) => a[0] - b[0])) {
    list.sort();
    fs.writeFileSync(path.join(OUT, n + '.txt'), list.join(''), 'utf8');
    index[n] = list.length;
    console.log('  dict/' + n + '.txt  ' + String(list.length).padStart(6) + '개');
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index), 'utf8');

  // 출제 후보 중 사전 길이 파일이 없는 건 없어야 합니다
  const bad = ANSWERS.filter((w) => !byLen.has(toJamo(w).length));
  if (bad.length) console.warn('경고 — 사전에 없는 길이의 출제 후보:', bad.join(' '));
  console.log('완료');
})();
