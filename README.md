# 못생긴놈들 글자나 맞춰라

**놀러 오세요 → https://eunji1217.github.io/motsaenggin/**

한글 두 글자 낱말을 **기본 자모 24개**로 쪼개어 다섯 번 안에 맞히는 하루 한 번짜리 퍼즐.
(꼬들·Wordle 계열, 숫자야구와 같은 힌트 구조)

## 규칙

- 힌트는 **자모가 몇 칸인지**뿐. 예: `번개` → `ㅂ ㅓ ㄴ ㄱ ㅏ ㅣ` (6칸)
- 겹자모는 풀어서 셉니다. `ㅐ = ㅏ+ㅣ`, `ㄲ = ㄱ+ㄱ`, `ㅘ = ㅗ+ㅏ`, `ㅄ = ㅂ+ㅅ`
- 🟩 자리까지 정확 / 🟨 낱말엔 있지만 다른 자리 / ⬛ 없는 자모
- 두 음절 낱말 **78,448개**가 입력으로 인정됩니다 (`dict/*.txt`)
- 정답은 한국 시각(KST) 자정에 바뀌며, 날짜 해시로 결정되어 모두에게 같습니다

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 마크업 + 스타일 (원고지 모티프, 라이트/다크) |
| `words.js` | 출제 후보 458개 — 누구나 아는 두 글자 낱말 |
| `dict/N.txt` | 입력 허용 사전, 자모 길이 N칸짜리. 그날 쓰는 파일 하나만 내려받습니다 |
| `tools/build-dict.cjs` | `dict/*.txt` 생성기 — `node tools/build-dict.cjs` |
| `game.js` | 자모 분해, 채점, 자판, 기록·공유 |
| `og.png` | 카톡·트위터 링크 미리보기 카드 (1200×630) |
| `icon.svg` | 파비콘 |
| `tools/make-og.cjs` | `og.png` 생성기 — `node tools/make-og.cjs` |

의존성 없음. `index.html`을 브라우저로 열면 바로 돌아갑니다.

## 배포

`main` 브랜치 루트를 GitHub Pages가 그대로 서비스합니다. 빌드 단계 없음 —
고치고 `git push` 하면 1분쯤 뒤 반영됩니다.

```bash
git add -A && git commit -m "..." && git push
```

## 순위표

`worker/` 는 Cloudflare Worker + KV 로 도는 순위표 API 입니다.
게임은 서버 없이도 돌아가며, `config.js` 의 `BOARD_API` 가 비어 있으면 순위 버튼이 숨겨집니다.

| 엔드포인트 | 하는 일 |
| --- | --- |
| `POST /score` | 기록 접수. **서버가 그날 정답으로 다시 채점해서** 앞뒤가 맞는 기록만 받습니다 |
| `GET /board` | 오늘 순위 + 누적 순위 |

닉네임은 기기마다 만든 임의의 열쇠와 묶여서, 남이 같은 닉네임으로 올리면 거부됩니다.
KV 는 키 메타데이터에 기록을 담아 `list()` 한 번으로 전체 순위를 읽습니다.

```bash
node worker/test.mjs          # KV 를 흉내 내어 배포 없이 로직 검증

npx wrangler login                          # 최초 1회
cd worker
npx wrangler kv namespace create SCORES     # 나온 id 를 wrangler.toml 에 적기
npx wrangler deploy                         # 주소를 config.js 의 BOARD_API 에 적기
```

### 부정 방지의 한계

서버가 재채점하므로 "5번 다 틀렸는데 1번 만에 맞혔다"처럼 **앞뒤가 안 맞는 기록은 막힙니다.**
다만 그날 정답이 `words.js` 안에 들어 있어서, 페이지 소스를 읽을 줄 아는 사람은
정답을 미리 알고 1번 만에 맞힐 수 있습니다. 친구들끼리 하는 판을 전제로 한 수준입니다.
정말로 막으려면 채점 자체를 서버로 옮겨야 합니다(정답을 클라이언트에 아예 안 보내기).

## 조작

- 화면 자판 클릭, 또는 **두벌식 그대로 타이핑** (영문 입력 상태에서도 `Q`→`ㅂ` 식으로 동작)
- `Enter` 입력, `Backspace` 지우기
- 기록은 이 브라우저 `localStorage`에만 저장됩니다

## 공유 결과 형식

```
2026년 9월 16일 성공!

⬛🟨⬛⬛⬛🟩
⬛🟨⬛🟨⬛⬛
🟩⬛⬛🟨🟨🟩
🟩🟩🟩🟩🟩🟩

누적 플레이 수: 1 🌱
승률: 100%
평균 시도 횟수: 4
```

마지막 줄에 게임 주소가 한 줄 더 붙습니다. 빼려면 `game.js`의 `shareText()`에서
`if (location.protocol.startsWith('http')) …` 줄을 지우면 됩니다.

## 사전

입력 허용 사전은 [acidsound/korean_wordlist](https://github.com/acidsound/korean_wordlist)에서
순한글 두 음절만 추려 자모 길이별로 나눈 것입니다. `node tools/build-dict.cjs` 로 다시 만들 수 있습니다.

| 자모 | 낱말 수 |  | 자모 | 낱말 수 |
| --- | ---: | --- | --- | ---: |
| 4칸 | 4,059 | | 8칸 | 1,069 |
| 5칸 | 24,039 | | 9칸 | 39 |
| 6칸 | 39,692 | | 10칸 | 43 |
| 7칸 | 9,505 | | 12칸 | 3 |

출제 후보를 바꾸려면 `words.js`의 `ANSWERS_RAW`에 두 글자 낱말을 띄어쓰기로 추가한 뒤
`node tools/build-dict.cjs`를 다시 돌리면 됩니다 (정답이 입력도 가능하도록 사전에 자동으로 합쳐집니다).
