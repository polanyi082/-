# AI 바이브코딩 e-book

한성대학교 AI 바이브코딩 기초·심화 프로그램 안내 e-book.
GitHub Pages로 바로 서비스되는 모바일 우선 플립북 뷰어입니다.

- 뷰어: `mobile/index.html`
- 루트(`index.html`)는 뷰어로 자동 이동합니다.
- 기존 포스터 페이지는 `poster/index.html` 로 옮겨 그대로 보존했습니다.

## ⚠️ 현재 페이지 내용은 임시입니다

이 작업 환경에서는 Google Drive 에 접근할 수 없어(네트워크 정책상 차단),
공유해 주신 자료를 내려받지 못했습니다. 그래서 지금 `files/` 에 들어 있는
**1페이지는 저장소에 있던 기존 포스터를 변환한 임시 페이지**입니다.

실제 자료로 교체하려면 아래 "페이지 만들기" 절차대로 한 번만 돌리면 됩니다.

## 페이지 만들기

원본 PDF 나 이미지들을 `source/` 에 넣고:

```bash
pip install pymupdf pillow
python3 tools/build_ebook.py source/ --title "한성대학교 AI 바이브코딩 기초·심화 프로그램"
```

그러면 아래가 새로 생성됩니다.

| 경로 | 내용 |
| --- | --- |
| `files/mobile/<n>.jpg` | 본문 페이지 이미지 (기본 가로 1400px) |
| `files/thumb/<n>.jpg` | 썸네일 (기본 가로 480px) |
| `files/book.json` | 뷰어가 읽는 페이지 목록 |

생성된 `files/` 를 커밋·푸시하면 GitHub Pages 에 그대로 반영됩니다.
`source/` 원본은 커밋하지 않아도 됩니다(`.gitignore` 처리됨).

### 자주 쓰는 옵션

```bash
python3 tools/build_ebook.py source/slides.pdf --dpi 170    # 더 선명하게
python3 tools/build_ebook.py source/images/ --width 1600    # 더 큰 페이지
python3 tools/build_ebook.py source/ --quality 90           # JPEG 화질
```

## 뷰어 기능

| 기능 | 조작 |
| --- | --- |
| 페이지 넘기기 | 좌우 스와이프 · 양쪽 끝 탭 · 화살표 키 · 하단 버튼 |
| 두 쪽 펼침 | 가로 화면 & 폭 900px 이상에서 자동 전환 |
| 페이지 목록 | 하단 격자 버튼 (썸네일 드로어) |
| 확대 | 핀치 · 더블탭 · 돋보기 버튼 · `+` / `-` / `0` |
| 자동 넘김 | 하단 재생 버튼 (기본 5초 간격) |
| 특정 페이지 이동 | 가운데 페이지 번호 탭 |
| 전체화면 / 공유 | 상단 우측 버튼 |
| 딥링크 | `.../mobile/index.html#page/7` |

화면 가운데를 탭하면 상·하단 바가 숨겨져 페이지만 크게 볼 수 있습니다.

## 설정

`mobile/javascript/config.js` 에서 제목, 펼침 기준 폭, 자동 넘김 간격,
원본 다운로드 링크, 우철(RTL) 여부를 바꿀 수 있습니다.
페이지 수와 이미지 목록은 `files/book.json` 이 관리하므로 손댈 필요가 없습니다.

## GitHub Pages 켜기

저장소 **Settings → Pages → Source** 를 `Deploy from a branch` 로 두고
브랜치와 `/ (root)` 를 선택하면 `https://<사용자>.github.io/<저장소>/` 로 열립니다.

## 구조

```
index.html              루트 → mobile/index.html 리다이렉트
mobile/
  index.html            뷰어
  style/style.css
  javascript/config.js  책 설정
  javascript/flipbook.js뷰어 엔진 (의존성 없음)
files/
  book.json             페이지 목록 (자동 생성)
  mobile/*.jpg          본문 이미지 (자동 생성)
  thumb/*.jpg           썸네일 (자동 생성)
poster/index.html       기존 포스터 (보존)
source/                 원본 자료를 넣는 곳 (커밋 제외)
tools/build_ebook.py    PDF·이미지 → 페이지 자산 변환
```
