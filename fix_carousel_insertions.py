#!/usr/bin/env python3
"""
修復 carousel 插入失敗的文章（H2 名稱含地圖連結、表情符號等導致匹配失敗）
改善 normalize 函式，重新插入圖片
"""

import asyncio
import json
import os
import re
import hashlib

BLOG_DIR = "src/content/blog"
PROGRESS_FILE = "carousel_progress.json"
R2_BASE_URL = "https://images.gobaligo.id"

# 失敗的 carousel 名稱
FAILED_CAROUSEL_NAMES = {
    "icon bali mall",
    "grand mirage resort",
    "holiday inn resort, nusa dua",
    "revivo wellness resort",
    "conrad bali",
    "renaissance bali nusa dua resort",
    "the royal santrian",
    "melia bali",
    "sofitel bali nusa dua beach resort",
    "the ritz-carlton bali",
    "the st. regis bali resort",
    "the apurva kempinski bali",
    "the westin resort nusa dua",
    "grand hyatt bali",
    "lembongan harmony villas",
    "lembongan cliff villas",
    "villa waru one",
    "komodo garden",
}


def r2_key_for(vocus_url: str) -> str:
    h = hashlib.md5(vocus_url.encode()).hexdigest()
    ext = ".jpg"
    for e in [".png", ".webp", ".gif"]:
        if e in vocus_url.lower():
            ext = e
            break
    return f"vocus/vocus_{h}{ext}"


def public_url_for(vocus_url: str) -> str:
    return f"{R2_BASE_URL}/{r2_key_for(vocus_url)}"


def normalize_name(text: str) -> str:
    """改善版：移除 markdown 連結、括號內容、表情符號"""
    # 移除 markdown 連結 [text](url) → text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # 移除全形/半形括號及內容
    text = re.sub(r"[（(][^）)]{0,100}[）)]", "", text)
    # 移除 emoji（補充平面字元）
    text = re.sub(r"[\U00010000-\U0010ffff]", "", text)
    # 移除 🗺️ 等 BMP emoji
    text = re.sub(r"[\U0001F300-\U0001F9FF]", "", text)
    text = re.sub(r"[🗺️🌟🎉🎆🏨🔥📌⭐🏆]", "", text)
    # 移除計數和序號
    text = re.sub(r"共\d+張圖", "", text)
    text = re.sub(r"^\d+[.、]\s*", "", text)
    # 移除 markdown bold
    text = re.sub(r"\*+", "", text)
    # 標準化標點
    text = re.sub(r"[,，、/]", " ", text)
    # 壓縮空格
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def find_h2_line_improved(lines: list, h2_text: str):
    """改善版匹配：允許 target 是 line 的子字串"""
    norm_target = normalize_name(h2_text)
    if not norm_target:
        return -1, 0.0

    best_idx = -1
    best_score = 0.0

    for i, line in enumerate(lines):
        if not (line.startswith("## ") or line.startswith("### ")):
            continue
        norm_line = normalize_name(line.lstrip("#").strip())
        if not norm_line:
            continue

        # 方法 1：target 是 line 的子字串 → 高分
        if norm_target in norm_line or norm_line in norm_target:
            score = 0.95
        else:
            # 方法 2：字元重疊率（原邏輯）
            common = sum(1 for c in norm_target if c in norm_line)
            score = common / max(len(norm_target), len(norm_line))

        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx, best_score


def insert_carousel_into_markdown(filepath: str, carousel: dict, r2_urls: list) -> bool:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if r2_urls and r2_urls[0] in content:
        return False  # 已插入，跳過

    lines = content.split("\n")

    h2_idx, score = find_h2_line_improved(lines, carousel["prev_h2"])

    if h2_idx == -1 or score < 0.4:
        # Fallback：嘗試以 carousel 名稱（去掉數字後）找 H2
        carousel_name = normalize_name(carousel["name"])
        h2_idx, score = find_h2_line_improved(lines, carousel_name)

    if h2_idx == -1 or score < 0.35:
        print(f"    ❌ 仍找不到插入點 ({score:.2f}): {carousel['name'][:50]}")
        return False

    print(f"    🎯 找到 H2 at line {h2_idx} (score={score:.2f}): {lines[h2_idx][:50]}")

    # 找 bullet list 行
    insert_before = -1
    for i in range(h2_idx + 1, min(h2_idx + 40, len(lines))):
        s = lines[i].strip()
        if s.startswith("* ") or s.startswith("- "):
            insert_before = i
            break
        if (lines[i].startswith("## ") or lines[i].startswith("### ")) and i != h2_idx:
            insert_before = i
            break

    if insert_before == -1:
        insert_before = len(lines)

    img_lines = [""] + [f"![raw-image]({url})" for url in r2_urls] + [""]
    new_lines = lines[:insert_before] + img_lines + lines[insert_before:]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))

    return True


async def reprocess_failed():
    from playwright.async_api import async_playwright

    # 清除有失敗 carousel 的文章 progress，讓主腳本可重跑
    # 但這裡直接重新抓取並插入

    # 找出包含失敗 carousel 的文章
    target_articles = []
    for fname in sorted(os.listdir(BLOG_DIR)):
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(BLOG_DIR, fname)
        with open(fpath, encoding="utf-8") as f:
            content = f.read()
        if "住宿推薦" not in content:
            continue
        m = re.search(r'originalUrl:\s*"(https://vocus\.cc/article/[^"]+)"', content)
        if not m:
            continue
        target_articles.append({
            "file": fpath,
            "fname": fname,
            "url": m.group(1),
            "article_id": m.group(1).split("/")[-1],
        })

    print(f"重新處理 {len(target_articles)} 篇文章中的失敗 carousel\n")

    stats = {"fixed": 0, "still_fail": 0}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(locale="zh-TW")
        page = await ctx.new_page()

        for article in target_articles:
            # 先快速檢查這篇文章是否有失敗 carousel
            # (靠名字比對文章內容)
            with open(article["file"], encoding="utf-8") as f:
                content = f.read()

            might_have_failed = any(
                name in content.lower() for name in FAILED_CAROUSEL_NAMES
            )
            if not might_have_failed:
                continue

            print(f"→ {article['fname']}")

            # 抓 Vocus carousel
            try:
                await page.goto(article["url"], timeout=30000, wait_until="networkidle")
            except Exception as e:
                print(f"  ⚠️ 無法開啟: {e}")
                continue

            script = """
(function() {
    var results = [];
    var pres = document.querySelectorAll('.carousel-prerender');
    pres.forEach(function(pre) {
        var di = pre.getAttribute('data-images');
        if (!di) return;
        var data;
        try { data = JSON.parse(di); } catch(e) { return; }
        var images = data.map(function(d) {
            return 'https://images.vocus.cc/' + d.relPath;
        });
        var prevH2 = '';
        var el = pre.previousElementSibling;
        for (var i=0; i<10; i++) {
            if (!el) break;
            if (el.tagName === 'H2' || el.tagName === 'H3') {
                prevH2 = el.textContent.trim();
                break;
            }
            el = el.previousElementSibling;
        }
        results.push({name: pre.textContent.trim(), images: images, prev_h2: prevH2});
    });
    return results;
})()
"""
            try:
                carousels = await page.evaluate(script)
            except Exception as e:
                print(f"  ⚠️ evaluate 失敗: {e}")
                continue

            fixed_count = 0
            for carousel in carousels:
                norm_name = normalize_name(carousel["name"])
                # 只處理失敗的 carousel
                if not any(fn in norm_name or norm_name in fn for fn in FAILED_CAROUSEL_NAMES):
                    continue

                r2_urls = [public_url_for(img) for img in carousel["images"]]
                # 只插入確實已上傳到 R2 的圖片
                r2_urls_valid = [u for u in r2_urls if u]

                modified = insert_carousel_into_markdown(
                    article["file"], carousel, r2_urls_valid
                )
                if modified:
                    print(f"  ✅ 已插入 {len(r2_urls_valid)} 張: {carousel['name'][:40]}")
                    stats["fixed"] += 1
                    fixed_count += 1
                else:
                    stats["still_fail"] += 1

        await browser.close()

    print(f"\n修復完成：成功 {stats['fixed']} 個，仍失敗 {stats['still_fail']} 個")


if __name__ == "__main__":
    asyncio.run(reprocess_failed())
