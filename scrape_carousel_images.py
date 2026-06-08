#!/usr/bin/env python3
"""
Vocus 住宿推薦 carousel 圖片補抓腳本
1. 讀所有住宿推薦文章，取得 originalUrl
2. 用 Playwright 抓 Vocus 頁面上的 carousel data-images
3. 下載圖片 → 上傳 R2
4. 把圖片插入對應 markdown 的正確位置（描述段後、bullet list 前）
"""

import asyncio
import json
import os
import re
import hashlib
import time
import urllib.request
import subprocess
from pathlib import Path

# ── 設定 ──────────────────────────────────────────────────────
CF_ACCOUNT_ID = "otbanha"
CF_API_TOKEN  = "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG"
R2_BUCKET     = "baligo-image"
R2_BASE_URL   = "https://images.gobaligo.id"

BLOG_DIR = "src/content/blog"
TMP_DIR  = "/tmp/baligo_carousel"
PROGRESS_FILE = "carousel_progress.json"

os.makedirs(TMP_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer":    "https://vocus.cc/",
}

# ── 工具函式 ────────────────────────────────────────────────────

def r2_key_for(vocus_url: str) -> str:
    """把 Vocus 圖片 URL 轉成 R2 key（與現有命名一致：vocus/vocus_{md5}.ext）"""
    url_hash = hashlib.md5(vocus_url.encode()).hexdigest()
    if ".png" in vocus_url.lower():
        ext = ".png"
    elif ".webp" in vocus_url.lower():
        ext = ".webp"
    elif ".gif" in vocus_url.lower():
        ext = ".gif"
    else:
        ext = ".jpg"
    return f"vocus/vocus_{url_hash}{ext}"


def public_url_for(vocus_url: str) -> str:
    return f"{R2_BASE_URL}/{r2_key_for(vocus_url)}"


def download_image(url: str, dest: str) -> bool:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            with open(dest, "wb") as f:
                f.write(resp.read())
        return True
    except Exception as e:
        print(f"    ❌ 下載失敗 {url[-40:]}: {e}")
        return False


def upload_to_r2(local_path: str, r2_key: str) -> bool:
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CF_ACCOUNT_ID}/r2/buckets/{R2_BUCKET}/objects/{r2_key}"
    )
    if r2_key.endswith(".png"):
        ct = "image/png"
    elif r2_key.endswith(".webp"):
        ct = "image/webp"
    elif r2_key.endswith(".gif"):
        ct = "image/gif"
    else:
        ct = "image/jpeg"

    result = subprocess.run(
        ["curl", "-s", "-X", "PUT",
         "-H", f"Authorization: Bearer {CF_API_TOKEN}",
         "-H", f"Content-Type: {ct}",
         "--data-binary", f"@{local_path}", url],
        capture_output=True, text=True,
    )
    return result.returncode == 0


def normalize_name(text: str) -> str:
    """標準化名字以進行模糊匹配"""
    text = re.sub(r"共\d+張圖", "", text)     # 移除「共N張圖」
    text = re.sub(r"^\d+[.、]\s*", "", text)  # 移除開頭數字
    text = re.sub(r"\*+", "", text)            # 移除 markdown bold
    text = text.strip().lower()
    return text


# ── Playwright 抓 carousel ──────────────────────────────────────

async def scrape_article_carousels(page, url: str) -> list[dict]:
    """
    回傳 list of {
        'name': str,            # carousel 名稱（e.g. "Villa Kayu Raja"）
        'images': [str, ...]    # images.vocus.cc 完整 URL
        'prev_h2': str          # 前一個 H2 文字
        'prev_para': str        # carousel 前一段落文字（前50字）
    }
    """
    try:
        await page.goto(url, timeout=30000, wait_until="networkidle")
    except Exception as e:
        print(f"  ⚠️ 無法開啟 {url}: {e}")
        return []

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

        // Find preceding H2/H3
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

        // Find preceding paragraph text
        var prevPara = '';
        el = pre.previousElementSibling;
        for (var i=0; i<5; i++) {
            if (!el) break;
            if (el.tagName === 'P' && el.textContent.trim().length > 5) {
                prevPara = el.textContent.trim().slice(0, 60);
                break;
            }
            el = el.previousElementSibling;
        }

        results.push({
            name: pre.textContent.trim(),
            images: images,
            prev_h2: prevH2,
            prev_para: prevPara
        });
    });
    return results;
})()
"""
    try:
        carousels = await page.evaluate(script)
        return carousels
    except Exception as e:
        print(f"  ⚠️ evaluate 失敗: {e}")
        return []


# ── Markdown 插入邏輯 ───────────────────────────────────────────

def find_h2_line(lines: list[str], h2_text: str) -> int:
    """找 markdown 中最接近 h2_text 的 ## 行，回傳行號（0-based），找不到回傳 -1"""
    norm_target = normalize_name(h2_text)
    best_idx = -1
    best_score = 0

    for i, line in enumerate(lines):
        if not line.startswith("## ") and not line.startswith("### "):
            continue
        norm_line = normalize_name(line.lstrip("#").strip())
        # 計算共同字元比例
        common = sum(1 for c in norm_target if c in norm_line)
        if len(norm_target) == 0:
            continue
        score = common / max(len(norm_target), len(norm_line))
        if score > best_score and score > 0.5:
            best_score = score
            best_idx = i

    return best_idx


def insert_carousel_into_markdown(filepath: str, carousel: dict, r2_urls: list[str]) -> bool:
    """
    把 carousel 圖片插入 markdown 的正確位置。
    位置規則：前一個 H2 之後，第一個 bullet list（* 或 -）之前。
    若已有圖片插入（防重複），跳過。
    回傳是否修改了檔案。
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 防重複：若第一張 R2 URL 已在檔案中，跳過
    if r2_urls and r2_urls[0] in content:
        return False

    lines = content.split("\n")

    # 找 H2
    h2_idx = find_h2_line(lines, carousel["prev_h2"])
    if h2_idx == -1:
        # Fallback：用 prev_para 文字找位置
        norm_para = carousel["prev_para"][:30].strip()
        for i, line in enumerate(lines):
            if norm_para and norm_para in line:
                h2_idx = i
                break

    if h2_idx == -1:
        print(f"    ⚠️ 找不到插入點 for carousel: {carousel['name']}")
        return False

    # 找 H2 後第一個 bullet list 行
    insert_before = -1
    for i in range(h2_idx + 1, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith("* ") or stripped.startswith("- "):
            insert_before = i
            break
        # 碰到下一個 H2，就插在下一個 H2 前
        if (lines[i].startswith("## ") or lines[i].startswith("### ")) and i != h2_idx:
            insert_before = i
            break

    if insert_before == -1:
        insert_before = len(lines)

    # 建立圖片行
    img_lines = [""] + [f"![raw-image]({url})" for url in r2_urls] + [""]

    # 插入
    new_lines = lines[:insert_before] + img_lines + lines[insert_before:]
    new_content = "\n".join(new_lines)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True


# ── 主程式 ─────────────────────────────────────────────────────

def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def get_accom_articles() -> list[dict]:
    articles = []
    for fname in sorted(os.listdir(BLOG_DIR)):
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(BLOG_DIR, fname)
        with open(fpath, encoding="utf-8") as f:
            content = f.read()
        if "住宿推薦" not in content:
            continue
        # Extract originalUrl
        m = re.search(r'originalUrl:\s*"(https://vocus\.cc/article/[^"]+)"', content)
        if not m:
            continue
        articles.append({
            "file": fpath,
            "fname": fname,
            "url": m.group(1),
            "article_id": m.group(1).split("/")[-1],
        })
    return articles


async def process_all():
    from playwright.async_api import async_playwright

    articles = get_accom_articles()
    progress = load_progress()

    print(f"📂 住宿推薦文章: {len(articles)} 篇")
    print(f"📋 已處理: {len([v for v in progress.values() if v.get('done')])} 篇\n")

    stats = {"articles": 0, "carousels": 0, "images_new": 0, "md_updated": 0}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(locale="zh-TW")
        page = await ctx.new_page()

        for idx, article in enumerate(articles, 1):
            aid = article["article_id"]
            url = article["url"]
            fpath = article["file"]

            if progress.get(aid, {}).get("done"):
                continue

            print(f"[{idx}/{len(articles)}] {article['fname']}")

            # Scrape carousels
            carousels = await scrape_article_carousels(page, url)

            if not carousels:
                print(f"  → 無 carousel，跳過")
                progress[aid] = {"done": True, "carousels": 0}
                save_progress(progress)
                continue

            print(f"  → {len(carousels)} 個 carousel")
            stats["articles"] += 1

            carousel_r2_data = []

            for ci, carousel in enumerate(carousels):
                print(f"  [{ci+1}/{len(carousels)}] {carousel['name']} - {len(carousel['images'])} 張")
                stats["carousels"] += 1

                r2_urls = []
                for img_url in carousel["images"]:
                    key = r2_key_for(img_url)
                    r2_url = public_url_for(img_url)
                    local_file = os.path.join(TMP_DIR, key.replace("/", "_"))

                    # 下載
                    if not os.path.exists(local_file):
                        if not download_image(img_url, local_file):
                            continue
                        time.sleep(0.2)

                    # 上傳 R2
                    if upload_to_r2(local_file, key):
                        stats["images_new"] += 1
                    else:
                        print(f"    ⚠️ R2 上傳失敗: {key}")

                    r2_urls.append(r2_url)

                carousel_r2_data.append((carousel, r2_urls))

            # 更新 markdown（從後往前插，避免行號偏移）
            for carousel, r2_urls in reversed(carousel_r2_data):
                if r2_urls:
                    modified = insert_carousel_into_markdown(fpath, carousel, r2_urls)
                    if modified:
                        stats["md_updated"] += 1
                        print(f"    ✅ 已插入 {len(r2_urls)} 張圖到 {carousel['prev_h2'][:30]}")

            progress[aid] = {"done": True, "carousels": len(carousels)}
            save_progress(progress)

            # 每10篇暫停一下，避免被封
            if idx % 10 == 0:
                print("  😴 短暫暫停...")
                await asyncio.sleep(3)

        await browser.close()

    print(f"\n{'='*50}")
    print(f"✅ 完成！")
    print(f"   有 carousel 的文章: {stats['articles']} 篇")
    print(f"   carousel 總數:      {stats['carousels']} 個")
    print(f"   圖片已上傳 R2:      {stats['images_new']} 張")
    print(f"   Markdown 已更新:    {stats['md_updated']} 次")


if __name__ == "__main__":
    asyncio.run(process_all())
