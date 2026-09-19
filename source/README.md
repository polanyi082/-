# source/

Drop the original material here, then run the build.

Accepted input:

- a **PDF** — each page becomes one e-book page
- a **folder of images** — `1.jpg`, `2.jpg`, … (or `page-1.png`, …); they are
  sorted naturally, so `2` comes before `10`

Then, from the repository root:

```bash
pip install pymupdf pillow
python3 tools/build_ebook.py source/ --title "한성대학교 AI 바이브코딩 기초·심화 프로그램"
```

That regenerates `files/mobile/`, `files/thumb/` and `files/book.json`.
Commit those and GitHub Pages serves the updated book.

The source files themselves do not need to be committed — only the generated
assets under `files/` are used by the viewer.
