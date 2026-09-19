# 문화예술경영학과 전공 E-BOOK

2026 성신여자대학교 창의융합학부 문화예술경영학과 전공 E-BOOK.
Flip PDF Professional 로 출력한 HTML5 플립 뷰어를 GitHub Pages 로 서빙합니다.

- 진입점: `/` → `mobile/index.html` 로 리다이렉트
- 실제 뷰어: `mobile/index.html` (Flash 불필요)
- Flash 런처 원본은 `legacy/flash-index.html` 에 보관 (동작하지 않음, 기록용)

---

## 이 리포를 새로 구성하는 방법

### 1. 빈 리포 만들기 (직접 해주셔야 하는 유일한 단계)

GitHub → New repository
- Name: `2026_sswu_major_ebook_culture`
- Public
- **Add a README / .gitignore / license 는 모두 체크 해제** (빈 리포로)

### 2. `setup.sh` 실행

```bash
chmod +x setup.sh
./setup.sh https://github.com/polanyi082/2026_sswu_major_ebook_culture.git
```

처음 실행하면 본문이 없다고 알려주면서 (A)(B)(C) 세 가지 확보 방법을 안내합니다.
본문을 채운 뒤 같은 명령을 다시 실행하면 커밋·push 까지 끝냅니다.

### 3. Pages 켜기

`Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save`

---

## 본문(Flip PDF 출력물)은 어디에 있나

문화예술경영학과는 창의융합 전공 E-BOOK 허브에서 **10번**이고,
이미 cafe24 에 배포되어 있습니다.

| 위치 | 경로 |
| --- | --- |
| 배포본 (cafe24) | `https://elitekorea2133.cafe24.com/2026sungshin/10/mobile/index.html` |
| 원본 폴더 (FTP) | `/2026sungshin/10/` |
| 제출 원본 PDF | [Google Drive](https://drive.google.com/open?id=1EiEdn1NeBw70wSH12lfsrS2Mpw567lnB) |
| 허브 페이지 | [sswu_major_ebook_check_final](https://github.com/polanyi082/sswu_major_ebook_check_final) |

**cafe24 FTP 로 `/2026sungshin/10/` 을 통째로 내려받는 것이 가장 빠르고 확실합니다.**

---

## 리포에 있어야 하는 구조

아래는 이미 정상 동작 중인
[`2026_sswu_major_ebook_busi`](https://github.com/polanyi082/2026_sswu_major_ebook_busi)
(경영학과 이북) 를 실제로 확인한 구조입니다. 문화예술경영학도 동일하게 맞추면 됩니다.

```
/
├── index.html            ← mobile/index.html 로 리다이렉트 (이 스캐폴드에 포함)
├── .nojekyll             ← Jekyll 우회 (이 스캐폴드에 포함)
├── README.md
├── legacy/
│   └── flash-index.html  ← Flash 런처 원본 (기록용)
├── mobile/                            ★ 필수
│   ├── index.html                     ★ 실제 HTML5 플립 뷰어
│   ├── javascript/
│   └── style/
├── files/                             ★ 필수
│   ├── config.xml        ← 책 제목·페이지 수·옵션
│   ├── page/             ← 페이지 이미지 (용량 대부분)
│   ├── thumb/            ← 썸네일
│   ├── pageConfig/
│   ├── search/           ← 본문 검색 인덱스
│   ├── mobile/
│   ├── mobile-ext/
│   ├── extfiles/
│   ├── basic-html/       ← 애니메이션 없는 fallback
│   └── shot.png          ← 링크 공유 썸네일
├── js/                   ← Flash 용. 생략 가능
│   ├── swfobject.js
│   ├── fbscript.js
│   ├── ActionHtmlWindow.js
│   └── fbendscript.js
├── book.swf              ← Flash 용. 생략 가능
└── bookContent.swf       ← Flash 용. 생략 가능
```

`mobile/` 과 `files/` 가 없으면 플립 뷰어는 어떤 방법으로도 나오지 않습니다.
반대로 `*.swf` 와 `js/` 는 전부 빼도 뷰어는 정상 동작합니다
(Flash Player 는 2020-12-31 지원 종료, 2021-01-12 부터 모든 브라우저에서 차단).

---

## 제약

| 항목 | 한도 |
| --- | --- |
| 파일 1개 | 100 MB (초과 시 push 거부 → Git LFS 필요) |
| 리포 권장 | 1 GB |
| Pages 사이트 | 1 GB |
| Pages 월 트래픽 | 100 GB (soft limit) |

웹 브라우저 드래그&드롭 업로드는 **한 번에 100개 파일** 제한이 있어
페이지 이미지가 많으면 실패합니다. `setup.sh` 나 git CLI 를 쓰세요.

---

## 완성 후 공유 URL

```
https://polanyi082.github.io/2026_sswu_major_ebook_culture/
https://polanyi082.github.io/2026_sswu_major_ebook_culture/mobile/index.html
```
