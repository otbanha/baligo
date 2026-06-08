#!/usr/bin/env python3
"""
fix_hq_images.py
────────────────
對指定分類的文章，找出 R2 上的低解析度圖片，
從 Vocus 下載原圖（images.vocus.cc）後直接覆蓋到 R2。
不需要改 markdown。

用法：
  python3 fix_hq_images.py                        # 預設：峇里島分區攻略
  python3 fix_hq_images.py --cat 住宿推薦
  python3 fix_hq_images.py --cat all              # 全部分類
  python3 fix_hq_images.py --dry-run              # 只看不改
"""

import argparse, hashlib, io, os, re, subprocess, sys, time, urllib.parse
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image

# ── Config ────────────────────────────────────────────────────────────────────
CF_ACCOUNT_ID   = "8539451c59b0447bc90fea01f29d10c8"
CF_API_TOKEN    = os.environ.get("CF_API_TOKEN", "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG")
R2_BUCKET       = "baligo-image"
R2_PUBLIC_BASE  = "https://images.gobaligo.id"   # public CDN

BLOG_DIR   = "src/content/blog"
TMP_DIR    = "/tmp/baligo_fix_hq"
SIZE_LIMIT  = 30_000   # bytes — files smaller than this are considered low-res
MAX_PIXELS  = 1920     # max dimension for very large images
MAX_FILESIZE = 2_000_000  # files > 2MB get resized/converted
JPEG_QUALITY = 88
DELAY       = 0.8      # seconds between vocus requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9",
    "Referer": "https://vocus.cc/",
}
# ─────────────────────────────────────────────────────────────────────────────

os.makedirs(TMP_DIR, exist_ok=True)


def md5_hex(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()


def r2_key_from_url(url: str) -> str:
    """
    Mirror the exact logic of the original upload_to_r2.py get_filename().
    R2 key = vocus/vocus_{md5(url)}.{ext}
    """
    h = md5_hex(url)
    url_lower = url.lower()
    if ".png" in url_lower:
        ext = ".png"
    elif ".gif" in url_lower:
        ext = ".gif"
    elif ".webp" in url_lower:
        ext = ".webp"
    else:
        ext = ".jpg"
    return f"vocus/vocus_{h}{ext}"


def r2_file_size(r2_key: str) -> int:
    """Return file size via public CDN HEAD request."""
    try:
        r = requests.head(f"{R2_PUBLIC_BASE}/{r2_key}", timeout=10, allow_redirects=True)
        return int(r.headers.get("content-length", 0))
    except Exception:
        return -1  # network error → treat as unknown


def decode_vocus_resize_url(resize_url: str):
    """
    Extract the original images.vocus.cc URL from a resize proxy URL.
    e.g. https://resize-image.vocus.cc/resize?quality=80&url=https%3A%2F%2Fimages.vocus.cc%2Fxxx.jpg
    → https://images.vocus.cc/xxx.jpg
    """
    m = re.search(r"[?&]url=([^&\s]+)", resize_url)
    if not m:
        return None
    orig = urllib.parse.unquote(m.group(1))
    if "images.vocus.cc" in orig:
        return orig
    return None


def get_article_image_map(vocus_url: str):
    """
    Fetch a Vocus article (via requests) and return a list of
    (resize_url_in_html, original_images_vocus_url).
    Duplicates (same original URL) are de-duplicated.
    """
    try:
        r = requests.get(vocus_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"    ⚠️  fetch error: {e}")
        return []

    seen_orig = set()
    results = []

    for img in soup.find_all("img", src=True):
        src = img["src"]
        if "resize-image.vocus.cc" in src:
            orig = decode_vocus_resize_url(src)
            if orig and orig not in seen_orig:
                seen_orig.add(orig)
                results.append((src, orig))
        elif "images.vocus.cc" in src and src not in seen_orig:
            seen_orig.add(src)
            results.append((src, src))   # no resize wrapper

    # Also check og:image (heroImage)
    og = soup.find("meta", property="og:image")
    if og:
        og_url = og.get("content", "")
        if "resize-image.vocus.cc" in og_url:
            orig = decode_vocus_resize_url(og_url)
            if orig and orig not in seen_orig:
                seen_orig.add(orig)
                results.append((og_url, orig))
        elif "images.vocus.cc" in og_url and og_url not in seen_orig:
            seen_orig.add(og_url)
            results.append((og_url, og_url))

    return results


def download_and_optimize(url: str, dest: str) -> tuple:
    """
    Download image from url, optimize if needed, save to dest.
    Returns (file_size, final_ext) or (0, '') on failure.
    """
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return 0, ""

        raw_bytes = r.content
        raw_size = len(raw_bytes)

        # Determine if we need to optimize
        try:
            img = Image.open(io.BytesIO(raw_bytes))
        except Exception:
            # Not a valid image
            return 0, ""

        orig_format = img.format or "JPEG"
        w, h = img.size
        needs_resize = max(w, h) > MAX_PIXELS
        needs_convert = orig_format == "PNG" and raw_size > MAX_FILESIZE

        if needs_resize or needs_convert:
            # Convert to RGB JPEG
            if img.mode in ("RGBA", "P", "LA"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")

            if needs_resize:
                img.thumbnail((MAX_PIXELS, MAX_PIXELS), Image.LANCZOS)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            final_bytes = buf.getvalue()
            final_ext = ".jpg"
            action = f"resized {w}x{h}→{img.size[0]}x{img.size[1]}, {raw_size//1024}KB→{len(final_bytes)//1024}KB"
        else:
            final_bytes = raw_bytes
            final_ext = ".png" if orig_format == "PNG" else ".jpg"
            action = f"{raw_size//1024}KB"

        with open(dest, "wb") as f:
            f.write(final_bytes)

        print(f"    ({action})")
        return len(final_bytes), final_ext

    except Exception as e:
        print(f"    ❌ download/optimize error: {e}")
    return 0, ""


def upload_to_r2(local_path: str, r2_key: str) -> bool:
    """Upload a file to R2 via wrangler CLI."""
    ext = Path(local_path).suffix.lower().lstrip(".")
    ct_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
               "png": "image/png", "webp": "image/webp", "gif": "image/gif"}
    ct = ct_map.get(ext, "image/jpeg")

    result = subprocess.run(
        ["wrangler", "r2", "object", "put",
         f"{R2_BUCKET}/{r2_key}",
         "--file", local_path,
         "--content-type", ct,
         "--remote"],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0 or "Upload complete" not in result.stdout + result.stderr:
        out = (result.stdout + result.stderr).strip()[:200]
        print(f"    ❌ upload error: {out}")
        return False
    return True


def collect_target_articles(target_cat: str):
    """Return list of (md_path, vocus_url) for articles in target_cat.
    Handles both formats:
      category: ["峇里島分區攻略"]   ← JSON array on one line
      category:                       ← YAML list
        - 峇里島分區攻略
    """
    results = []
    for md in sorted(Path(BLOG_DIR).glob("*.md")):
        text = md.read_text(encoding="utf-8")

        # Extract the frontmatter category block (between --- markers)
        fm_m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
        if not fm_m:
            continue
        fm = fm_m.group(1)

        # Match inline format: category: ["foo"] or category: "foo"
        cat_inline = re.search(r'^category:\s*(.+)$', fm, re.MULTILINE)
        # Match YAML list format: category:\n  - foo
        cat_list = re.findall(r'^  - (.+)$', re.sub(r'^(?!category).*$', '', fm, flags=re.MULTILINE), re.MULTILINE)
        # simpler: find all "  - value" lines after category:
        cat_block = re.search(r'^category:\s*\n((?:  -.+\n?)+)', fm, re.MULTILINE)

        cat_values = ""
        if cat_inline:
            cat_values = cat_inline.group(1)
        if cat_block:
            cat_values += cat_block.group(1)

        if not cat_values:
            continue
        if target_cat != "all" and target_cat not in cat_values:
            continue

        url_m = re.search(r'originalUrl:\s*"?(https://vocus\.cc/article/[^\s"]+)"?', text)
        if url_m:
            results.append((md, url_m.group(1)))
    return results


def process_articles(articles: list, dry_run: bool):
    total = replaced = skipped = errors = 0

    for idx, (md_path, vocus_url) in enumerate(articles, 1):
        print(f"\n[{idx}/{len(articles)}] {md_path.name}")
        print(f"  {vocus_url}")

        image_map = get_article_image_map(vocus_url)
        if not image_map:
            print("  ⚠️  no images found")
            errors += 1
            time.sleep(DELAY)
            continue

        print(f"  found {len(image_map)} unique images")

        for resize_url, orig_url in image_map:
            total += 1
            r2_key = r2_key_from_url(resize_url)
            size = r2_file_size(r2_key)

            if size < 0:
                # Check if file even exists by trying both extensions
                alt_key = r2_key.replace(".jpg", ".png") if r2_key.endswith(".jpg") else r2_key.replace(".png", ".jpg")
                size = r2_file_size(alt_key)
                if size >= 0:
                    r2_key = alt_key

            if size >= SIZE_LIMIT:
                skipped += 1
                continue   # already high-res

            print(f"  📸 {size:,}B  {orig_url[-70:]}")
            if dry_run:
                print("     [dry-run, skip]")
                continue

            tmp = f"{TMP_DIR}/{md5_hex(orig_url)}"
            dl_size, final_ext = download_and_optimize(orig_url, tmp)

            if dl_size < 1000:
                print(f"     ❌ download too small ({dl_size}B)")
                errors += 1
                continue

            # Update extension in r2_key to match final saved format
            r2_key = re.sub(r'\.(jpg|jpeg|png|webp|gif)$', final_ext, r2_key)

            if upload_to_r2(tmp, r2_key):
                print(f"     ✅ replaced → {dl_size//1024}KB  ({r2_key})")
                replaced += 1
            else:
                errors += 1

            try:
                os.remove(tmp)
            except Exception:
                pass

            time.sleep(0.3)

        time.sleep(DELAY)

    print("\n" + "=" * 55)
    print(f"Total images checked : {total}")
    print(f"✅ Replaced (was low-res): {replaced}")
    print(f"⏭️  Skipped (already OK)  : {skipped}")
    print(f"❌ Errors               : {errors}")
    print("=" * 55)
    if replaced > 0 and not dry_run:
        print("\n✨ Done! No markdown changes needed — R2 files overwritten in-place.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cat", default="峇里島分區攻略",
                        help="Category name, or 'all' for everything")
    parser.add_argument("--dry-run", action="store_true",
                        help="Check only, don't download or upload")
    args = parser.parse_args()

    print("=" * 55)
    print(f"🌴 Vocus 原圖修復工具")
    print(f"   Category : {args.cat}")
    print(f"   Dry-run  : {args.dry_run}")
    print(f"   Threshold: {SIZE_LIMIT:,} bytes")
    print("=" * 55)

    articles = collect_target_articles(args.cat)
    print(f"\n📂 Found {len(articles)} articles\n")

    if not articles:
        print("No articles found. Check --cat value.")
        sys.exit(1)

    process_articles(articles, args.dry_run)


if __name__ == "__main__":
    main()
