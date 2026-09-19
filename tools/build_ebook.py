#!/usr/bin/env python3
"""
Build the e-book page assets from source material.

Input is either a PDF or a folder of images (or a folder containing a PDF).
Output is written next to the viewer:

    files/mobile/<n>.jpg   full-size page images
    files/thumb/<n>.jpg    thumbnails
    files/book.json        manifest the viewer reads

Usage
    python3 tools/build_ebook.py source/
    python3 tools/build_ebook.py source/ebook.pdf --title "..." --dpi 170
    python3 tools/build_ebook.py source/slides/ --width 1600

Requires: pymupdf (PDF input only), pillow.
    pip install pymupdf pillow
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PAGE_DIR = REPO / "files" / "mobile"
THUMB_DIR = REPO / "files" / "thumb"
MANIFEST = REPO / "files" / "book.json"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".gif"}

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("pillow is required:  pip install pillow")


def natural_key(path: Path):
    """Sort 2.jpg before 10.jpg, and page-2 before page-10."""
    import re

    parts = re.split(r"(\d+)", path.stem)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def collect_sources(src: Path):
    """Return ('pdf', path) or ('images', [paths...])."""
    if src.is_file():
        if src.suffix.lower() == ".pdf":
            return "pdf", src
        if src.suffix.lower() in IMAGE_EXT:
            return "images", [src]
        sys.exit(f"unsupported file type: {src.suffix}")

    if not src.is_dir():
        sys.exit(f"no such path: {src}")

    pdfs = sorted(src.glob("*.pdf")) + sorted(src.glob("*.PDF"))
    images = sorted(
        (p for p in src.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXT),
        key=natural_key,
    )

    if pdfs and not images:
        if len(pdfs) > 1:
            print(f"! {len(pdfs)} PDFs found, using {pdfs[0].name}", file=sys.stderr)
        return "pdf", pdfs[0]
    if images:
        return "images", images
    sys.exit(f"no PDF or images found in {src}")


def render_pdf(pdf_path: Path, dpi: int, out_dir: Path):
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf  # older releases
        except ImportError:
            sys.exit("pymupdf is required for PDF input:  pip install pymupdf")

    doc = pymupdf.open(pdf_path)
    zoom = dpi / 72.0
    matrix = pymupdf.Matrix(zoom, zoom)
    rendered = []

    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        out = out_dir / f"{i}.png"
        pix.save(out)
        rendered.append(out)
        print(f"  rendered page {i}/{doc.page_count}", end="\r", flush=True)

    print(f"  rendered {len(rendered)} page(s) from {pdf_path.name}      ")
    doc.close()
    return rendered


def save_resized(src_img: Image.Image, target_w: int, dest: Path, quality: int):
    img = src_img
    if img.mode not in ("RGB", "L"):
        # flatten transparency onto white so JPEG output stays clean
        bg = Image.new("RGB", img.size, (255, 255, 255))
        img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode == "L":
        img = img.convert("RGB")

    if img.width > target_w:
        h = max(1, round(img.height * target_w / img.width))
        img = img.resize((target_w, h), Image.LANCZOS)

    img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return img.size


def clean(directory: Path):
    if directory.exists():
        shutil.rmtree(directory)
    directory.mkdir(parents=True, exist_ok=True)


def main():
    ap = argparse.ArgumentParser(description="Build e-book page assets.")
    ap.add_argument("source", help="PDF file, image file, or folder holding either")
    ap.add_argument("--title", default=None, help="book title stored in the manifest")
    ap.add_argument("--width", type=int, default=1400, help="page image width in px (default 1400)")
    ap.add_argument("--thumb-width", type=int, default=480, help="thumbnail width in px (default 480)")
    ap.add_argument("--dpi", type=int, default=150, help="PDF render DPI (default 150)")
    ap.add_argument("--quality", type=int, default=82, help="JPEG quality (default 82)")
    args = ap.parse_args()

    src = Path(args.source)
    if not src.is_absolute():
        src = (REPO / src).resolve()

    kind, payload = collect_sources(src)

    clean(PAGE_DIR)
    clean(THUMB_DIR)

    tmp_dir = REPO / "files" / ".render-tmp"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)

    if kind == "pdf":
        tmp_dir.mkdir(parents=True, exist_ok=True)
        sources = render_pdf(payload, args.dpi, tmp_dir)
    else:
        sources = payload
        print(f"  found {len(sources)} image(s)")

    pages = []
    for i, path in enumerate(sources, start=1):
        with Image.open(path) as im:
            im.load()
            w, h = save_resized(im, args.width, PAGE_DIR / f"{i}.jpg", args.quality)
            save_resized(im, args.thumb_width, THUMB_DIR / f"{i}.jpg", 76)
        pages.append({"src": f"{i}.jpg", "thumb": f"{i}.jpg", "width": w, "height": h})
        print(f"  packed page {i}/{len(sources)}", end="\r", flush=True)

    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)

    title = args.title
    if title is None:
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        if MANIFEST.exists():
            try:
                title = json.loads(MANIFEST.read_text(encoding="utf-8")).get("title")
            except (ValueError, OSError):
                title = None
    if title is None:
        title = payload.stem if kind == "pdf" else src.name

    first = pages[0]
    manifest = {
        "title": title,
        "pageCount": len(pages),
        "pageWidth": first["width"],
        "pageHeight": first["height"],
        "pages": pages,
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\n  {len(pages)} page(s) -> files/mobile, files/thumb")
    print(f"  manifest -> {MANIFEST.relative_to(REPO)}")
    print(f"  title: {title}")


if __name__ == "__main__":
    main()
