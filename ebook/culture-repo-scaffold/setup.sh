#!/usr/bin/env bash
# =============================================================================
# 문화예술경영학과 E-BOOK 리포 구성 스크립트
#
# 사용 전 준비: GitHub 에서 빈 리포를 하나 만들어 주세요.
#   이름 예: 2026_sswu_major_ebook_culture   /  Public  /  README·gitignore 체크 해제
#
# 사용법:
#   chmod +x setup.sh
#   ./setup.sh https://github.com/polanyi082/2026_sswu_major_ebook_culture.git
# =============================================================================
set -euo pipefail

REPO_URL="${1:-}"
if [ -z "$REPO_URL" ]; then
  echo "사용법: $0 <빈 리포의 git URL>"
  echo "예:     $0 https://github.com/polanyi082/2026_sswu_major_ebook_culture.git"
  exit 1
fi

WORK="$(pwd)/ebook-culture-build"
SCAFFOLD="$(cd "$(dirname "$0")" && pwd)"

# 문화예술경영학과 = 창의융합 전공 E-BOOK 허브의 10번
SRC_HTTP="https://elitekorea2133.cafe24.com/2026sungshin/10/"

echo "==> 작업 폴더: $WORK"
mkdir -p "$WORK"
cd "$WORK"

# -----------------------------------------------------------------------------
# 1단계: 본문(Flip PDF 출력물) 확보  ← 셋 중 하나만 하면 됩니다
# -----------------------------------------------------------------------------
if [ -d mobile ] && [ -d files ]; then
  echo "==> mobile/ 와 files/ 가 이미 있습니다. 1단계 건너뜀."
else
  cat <<'GUIDE'

------------------------------------------------------------------------------
 본문이 아직 없습니다. 아래 (A) (B) (C) 중 하나로 이 폴더에 채워 넣으세요.
 필요한 것: mobile/  files/    (js/ 와 *.swf 는 없어도 뷰어가 동작합니다)
------------------------------------------------------------------------------

 (A) cafe24 FTP  ─ 가장 확실함. 권장.
     이미 서버에 올라가 있는 원본을 그대로 가져옵니다.
     FileZilla 로 elitekorea2133 계정에 접속 →
       /2026sungshin/10/  폴더 전체를 이 폴더로 다운로드.
     CLI 를 쓰신다면:
       lftp -u <아이디>,<비밀번호> elitekorea2133.cafe24.com \
            -e "mirror -c --parallel=4 /2026sungshin/10/ . ; quit"

 (B) Flip PDF 에서 재출력
     원본 PDF 를 Flip PDF Professional 로 열고
       Publish → HTML → Mobile Version(HTML5) 체크 → 출력
     생성된 폴더의 내용 전체를 이 폴더로 복사.
     제출 원본 PDF 위치(창의융합 E-BOOK 허브 기준):
       https://drive.google.com/open?id=1EiEdn1NeBw70wSH12lfsrS2Mpw567lnB

 (C) HTTP 로 긁어오기 ─ 최후의 수단
     Flip PDF 뷰어는 페이지 이미지를 자바스크립트로 불러오기 때문에
     wget 재귀 다운로드로는 files/page/ 가 누락됩니다.
     아래처럼 config.xml 에서 페이지 수를 먼저 확인한 뒤 번호로 받아야 합니다.
       curl -s "https://elitekorea2133.cafe24.com/2026sungshin/10/files/config.xml" | grep -i totalpage
       # 예: 40페이지면
       mkdir -p files/page
       for i in $(seq 1 40); do
         curl -sf -o "files/page/${i}.jpg" \
           "https://elitekorea2133.cafe24.com/2026sungshin/10/files/page/${i}.jpg" || echo "누락: $i"
       done
     확장자·경로가 다를 수 있으니 (A) 나 (B) 를 먼저 시도하세요.

GUIDE
  echo "본문을 채운 뒤 이 스크립트를 다시 실행하세요: $0 $REPO_URL"
  exit 2
fi

# -----------------------------------------------------------------------------
# 2단계: 진입점 교체 + Pages 설정 파일
# -----------------------------------------------------------------------------
echo "==> Flash 런처를 legacy/ 로 옮기고 루트를 HTML5 뷰어로 리다이렉트"
mkdir -p legacy
if [ -f index.html ] && grep -qi 'swfobject\|book\.swf' index.html; then
  mv index.html legacy/flash-index.html
fi
cp "$SCAFFOLD/index.html" ./index.html
cp "$SCAFFOLD/.nojekyll" ./.nojekyll
[ -f legacy/flash-index.html ] || cp "$SCAFFOLD/legacy/flash-index.html" legacy/flash-index.html
[ -f README.md ] || cp "$SCAFFOLD/README.md" ./README.md

# -----------------------------------------------------------------------------
# 3단계: 용량 점검 (GitHub 파일 1개 100MB 제한)
# -----------------------------------------------------------------------------
echo "==> 100MB 초과 파일 점검"
BIG=$(find . -path ./.git -prune -o -type f -size +100M -print)
if [ -n "$BIG" ]; then
  echo "!! 100MB 를 넘는 파일이 있어 push 가 거부됩니다:"
  echo "$BIG"
  echo "   해당 파일을 줄이거나 Git LFS 를 쓰세요. 중단합니다."
  exit 3
fi
echo "   총 용량: $(du -sh . | cut -f1)"

# -----------------------------------------------------------------------------
# 4단계: 커밋 & push
# -----------------------------------------------------------------------------
if [ ! -d .git ]; then
  git init -q
  git remote add origin "$REPO_URL"
else
  git remote set-url origin "$REPO_URL"
fi
git add -A
git commit -q -m "Add 문화예술경영학과 E-BOOK (Flip PDF HTML5 viewer)" || echo "==> 변경 없음"
git branch -M main
git push -u origin main

cat <<EOF

=============================================================================
 push 완료.

 마지막 한 단계 (GitHub 웹에서 한 번만):
   Settings → Pages → Source: Deploy from a branch
                    → Branch: main / (root) → Save
   반영까지 1~2분.

 확인 URL:
   https://polanyi082.github.io/2026_sswu_major_ebook_culture/
   https://polanyi082.github.io/2026_sswu_major_ebook_culture/mobile/index.html
=============================================================================
EOF
