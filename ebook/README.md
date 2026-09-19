# 문화예술경영학 전자책 (Flip PDF 출력물)

이 폴더의 `index.html` 은 업로드해 주신 파일을 **원본 그대로** 보관한 것입니다.
아래는 참고 URL(`.../40/mobile/index.html`)처럼 깔끔한 플립 뷰어로 띄우기 위해
무엇이 더 필요한지 정리한 내용입니다.

---

## 1. 왜 지금은 안 나오나 (이미지처럼 깨져 보이는 이유)

업로드하신 `index.html` 은 **Flip PDF Professional 2.4.10.2** 가 만든
**Flash 실행용 껍데기(런처)** 입니다. 파일 안을 보면 이렇게 되어 있습니다.

| 이 파일이 실제로 하는 일 | 해당 코드 |
| --- | --- |
| Flash 책 파일을 불러옴 | `<param name="movie" value="book.swf" />` |
| 그 삽입을 담당하는 스크립트 | `js/swfobject.js`, `js/fbscript.js` |
| Flash 없을 때 대체 안내 문구 | `To view this page ensure that Adobe Flash Player ...` |
| 브라우저 정보 출력 | `showUserAgent()` |

문제는 두 가지입니다.

1. **Flash Player 는 이미 죽은 기술입니다.**
   Adobe 지원 종료 2020-12-31, 2021-01-12 부터 모든 주요 브라우저가 실행을 차단합니다.
   그래서 이 파일을 그대로 올리면 책이 아니라 *"Adobe Flash Player 를 설치하세요"* 안내문과
   `navigator.userAgent` 문자열만 뜹니다. 지금 보고 계신 화면이 바로 그 상태입니다.
2. **이 파일 하나만으로는 어차피 동작하지 않습니다.**
   `book.swf`, `js/`, `files/`, `mobile/` 등 같은 폴더에 있어야 하는 리소스를
   상대경로로 참조하는데, 지금은 `index.html` 단 하나뿐이라 전부 404 입니다.

### 참고 URL 이 깔끔하게 나오는 진짜 이유

```
https://elitekorea2133.cafe24.com/2026sungshin/40/mobile/index.html
                                              ^^^^^^^^^^^^^^^^^^^^
```

경로가 루트가 아니라 **`mobile/index.html`** 을 직접 가리키고 있습니다.
Flip PDF 출력물에서 `mobile/index.html` 이 **Flash 없이 동작하는 HTML5 플립 뷰어**이고,
페이지 넘김 애니메이션·썸네일·검색·전체화면이 다 여기에 들어 있습니다.
(`files/basic-html/index.html` 은 애니메이션 없는 최소 fallback 이라 이걸 쓰면 안 됩니다.)

---

## 2. 필요한 것: Flip PDF **출력 폴더 전체**

Flip PDF Professional 에서 `Publish → HTML` 로 내보내면 생기는 폴더를
**통째로** 올려야 합니다.

아래 구조는 추측이 아니라, 이미 정상 동작 중인
[`polanyi082/2026_sswu_major_ebook_busi`](https://github.com/polanyi082/2026_sswu_major_ebook_busi)
(경영학과 이북) 리포를 실제로 확인한 결과입니다. 문화예술경영학도 똑같이 맞춰 주시면 됩니다.

```
/
├── index.html            ← mobile/index.html 로 보내는 리다이렉트 (아래 3-(3))
├── book.swf              ← Flash 로더 (7 KB, 안 올려도 무관)
├── bookContent.swf       ← Flash 본체 (약 900 KB, 안 올려도 무관)
├── shot.png              ← 링크 공유 썸네일
├── js/
│   ├── swfobject.js
│   ├── fbscript.js
│   ├── ActionHtmlWindow.js
│   └── fbendscript.js
├── mobile/                            ★ 여기가 핵심
│   ├── index.html                     ★ 실제 HTML5 플립 뷰어
│   ├── javascript/
│   └── style/
└── files/
    ├── config.xml        ← 책 제목·페이지 수·옵션
    ├── page/             ← 페이지 이미지 (용량 대부분)
    ├── thumb/            ← 썸네일
    ├── pageConfig/       ← 페이지별 설정
    ├── search/           ← 본문 검색 인덱스
    ├── mobile/           ← 모바일용 리소스
    ├── mobile-ext/
    ├── extfiles/
    ├── basic-html/       ← 애니메이션 없는 fallback
    └── shot.png
```

**핵심: `mobile/` 과 `files/` 가 없으면 무엇을 해도 플립 뷰어는 나오지 않습니다.**
반대로 Flash 파일(`book.swf`, `bookContent.swf`, `js/`)은 전부 빼도 뷰어는 정상 동작합니다.
원본 출력 폴더(보통 수십~수백 MB)를 찾아 주시면 그 다음은 간단합니다.

---

## 3. 전체 폴더가 준비된 뒤 작업 순서

### (1) 리포에 push

GitHub 웹 드래그&드롭은 **한 번에 100개 파일 제한**이 있어 페이지 이미지가 많으면 실패합니다.
git CLI 를 쓰세요.

```bash
git clone https://github.com/polanyi082/-.git
cd -
cp -r /경로/FlipPDF출력폴더/* .
git add -A
git commit -m "Add Flip PDF HTML5 output"
git push -u origin main
```

### (2) GitHub Pages 켜기

`Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save`
반영까지 1~2분 걸립니다.

### (3) 루트 진입점을 `mobile/index.html` 로 보내기

Flash 런처를 그대로 두면 방문자가 또 Flash 안내문을 봅니다.
루트 `index.html` 을 리다이렉트로 바꾸세요.
이 폴더의 **`root-index-redirect.html`** 을 `index.html` 로 이름만 바꿔 루트에 두면 됩니다.
`2026_sswu_major_ebook_busi` 리포의 루트 `index.html` 이 바로 이 방식(361 바이트 리다이렉트)이고,
참고 URL 과 동일하게 동작하는 것이 확인된 형태입니다.

### (4) `.nojekyll` 추가

GitHub Pages 는 기본적으로 Jekyll 을 거치는데, 이 과정에서 `_` 로 시작하는
폴더·파일이 무시됩니다. 리포 루트에 빈 `.nojekyll` 파일을 두면 그냥 정적 파일로 서빙합니다.
(이 리포에는 이미 추가해 두었습니다.)

### (5) 최종 확인 URL

```
https://polanyi082.github.io/-/                     ← 리다이렉트
https://polanyi082.github.io/-/mobile/index.html    ← 직접 접속
```

---

## 4. 미리 알아두실 제약

| 항목 | 한도 |
| --- | --- |
| 파일 1개 크기 | 100 MB (초과 시 push 거부, Git LFS 필요) |
| 리포 권장 크기 | 1 GB |
| Pages 사이트 크기 | 1 GB |
| Pages 월 트래픽 | 100 GB (soft limit) |

**리포 이름 관련 주의:** 이 리포 이름이 `-` (하이픈 하나) 라서 Pages URL 이
`https://polanyi082.github.io/-/` 가 됩니다. 카카오톡·메신저·일부 링크 파서에서
하이픈 단독 경로를 제대로 처리하지 못하는 경우가 있으니,
공유용이라면 `2026-sswu-ebook` 같은 **별도 리포를 새로 만들어 올리는 쪽을 권장**합니다.

또한 이 리포 루트에는 이미 무관한 페이지(`한성대학교 AI 바이브코딩 프로그램` 포스터)가
`index.html` 로 들어 있습니다. 그래서 이번 파일은 덮어쓰지 않고 `ebook/` 하위에 넣었습니다.

---

## 5. 원본 출력 폴더를 못 찾는 경우 — 대안

1. **Flip PDF 에서 재출력 (가장 권장)**
   원본 PDF 가 있으면 Flip PDF 로 다시 열어 `Publish → HTML` 하면 됩니다.
   출력 설정에서 Flash 대신 **HTML5 / Mobile Version** 을 체크하세요.
2. **오픈소스 플립 뷰어로 교체**
   PDF 페이지를 이미지로 내보낸 뒤 [StPageFlip](https://github.com/Nodlik/StPageFlip) 또는
   `turn.js` 로 직접 뷰어를 구성합니다. Flip PDF 라이선스·용량 부담이 없고 모바일 대응이 깔끔합니다.
   페이지 이미지만 주시면 이 방식으로 만들어 드릴 수 있습니다.
3. **PDF 그대로 제공**
   플립 애니메이션을 포기하고 PDF 파일만 올려 링크하는 방법입니다. 가장 가볍고 확실합니다.
