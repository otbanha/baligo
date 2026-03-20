#!/usr/bin/env python3
"""
Vocus 安全版爬蟲 - 只新增缺少的文章
- 先讀取現有所有 MD 檔，提取 article ID
- 去 vocus 掃全部文章
- 只下載「現有檔案裡沒有」的文章
- 絕對不覆蓋、不修改現有任何檔案
"""

import asyncio
import re
import os
import time
import requests
from bs4 import BeautifulSoup
import markdownify
from datetime import datetime
from playwright.async_api import async_playwright

# ===== 設定區（請修改這裡）=====
OUTPUT_DIR = "src/content/blog"   # 你的 blog 資料夾路徑
DELAY = 2                          # 每篇文章間隔秒數

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

ROOM_PAGES = {
    "https://vocus.cc/salon/bali/room/bali_guide": "峇里島分區攻略",
    "https://vocus.cc/salon/bali/room/baliaccomendations": "住宿推薦",
    "https://vocus.cc/salon/bali/room/visa": "簽證通關",
    "https://vocus.cc/salon/bali/room/chartered_car": "叫車包車",
    "https://vocus.cc/salon/bali/room/bali-with-kids": "家庭親子",
    "https://vocus.cc/salon/bali/room/itinerary": "遊記分享",
    "https://vocus.cc/salon/bali/room/bali_recommendations": "美食景點活動",
    "https://vocus.cc/salon/bali/room/traverltips": "旅行技巧",
}

# ============================================================
# Step 0：掃描現有檔案，建立「已存在的 article ID」集合
# ============================================================
def get_existing_article_ids(blog_dir: str) -> set:
    """從現有 MD 檔名提取 article ID，例如
       2019-07-15-64db6b57fd897800013a8e48.md → 64db6b57fd897800013a8e48
    """
    ids = set()
    if not os.path.exists(blog_dir):
        print(f"⚠️  找不到資料夾：{blog_dir}")
        return ids

    for fname in os.listdir(blog_dir):
        if not fname.endswith(".md"):
            continue
        # 命名格式：YYYY-MM-DD-{articleID}.md
        m = re.match(r"^\d{4}-\d{2}-\d{2}-([a-f0-9]+)\.md$", fname)
        if m:
            ids.add(m.group(1))
    return ids

# ============================================================
# Step 1：用 Playwright 滾動頁面，收集所有文章 URL
# ============================================================
async def scroll_and_collect(page, url: str, category: str) -> list:
    print(f"\n📂 掃描分類：{category}")
    try:
        await page.goto(url, wait_until="networkidle", timeout=45000)
    except Exception as e:
        print(f"  ⚠️  載入失敗：{e}")
        return []

    collected = set()
    no_new_count = 0

    while no_new_count < 3:
        links = await page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => e.href)"
        )
        article_links = {
            l for l in links
            if re.search(r"/article/[a-f0-9]{24}", l)
        }

        prev_count = len(collected)
        collected.update(article_links)

        if len(collected) > prev_count:
            print(f"  已找到 {len(collected)} 篇...", end="\r")
            no_new_count = 0
        else:
            no_new_count += 1

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2)

    print(f"  ✅ 共找到 {len(collected)} 篇")
    return [(url, category) for url in collected]


async def get_all_article_urls() -> list:
    all_articles = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers(HEADERS)

        for room_url, category in ROOM_PAGES.items():
            results = await scroll_and_collect(page, room_url, category)
            all_articles.extend(results)
            await asyncio.sleep(1)

        await browser.close()

    # 去重（同一篇可能出現在多個分類）
    seen_ids = set()
    unique = []
    for url, cat in all_articles:
        m = re.search(r"/article/([a-f0-9]{24})", url)
        if m and m.group(1) not in seen_ids:
            seen_ids.add(m.group(1))
            unique.append((url, cat))

    print(f"\n✅ vocus 上共有 {len(unique)} 篇不重複文章")
    return unique


# ============================================================
# Step 2：抓單篇文章內容，轉成 MD
# ============================================================
def scrape_article(url: str, category: str):
    try:
        res = requests.get(url, headers=HEADERS, timeout=20)
        res.raise_for_status()
    except Exception as e:
        print(f"  ❌ 抓取失敗：{e}")
        return None

    soup = BeautifulSoup(res.text, "html.parser")

    # 標題
    h1 = soup.find("h1")
    title = h1.get_text(strip=True) if h1 else "無標題"

    # 發布日期
    time_tag = soup.find("time")
    if time_tag and time_tag.get("datetime"):
        raw_date = time_tag["datetime"][:10]
    else:
        raw_date = datetime.today().strftime("%Y-%m-%d")

    # 分類
    article_id = re.search(r"/article/([a-f0-9]{24})", url).group(1)

    # 封面圖
    og_img = soup.find("meta", property="og:image")
    hero_image = og_img["content"] if og_img and og_img.get("content") else ""

    # 描述
    og_desc = soup.find("meta", property="og:description")
    description = og_desc["content"] if og_desc and og_desc.get("content") else ""
    description = description.replace('"', '\\"')

    # Tags
    tag_els = soup.select("a[href*='/tag/']")
    tags = list(dict.fromkeys([t.get_text(strip=True) for t in tag_els]))[:8]
    tags_str = ", ".join([f'"{t}"' for t in tags]) if tags else '"峇里島"'

    # 文章內容（selector: article.editor-content-block）
    content_el = soup.find("article", class_=re.compile(r"editor-content-block"))
    if not content_el:
        # fallback
        content_el = soup.find("main")

    if content_el:
        # 移除不需要的元素
        for el in content_el.select("button, .ad, script, style"):
            el.decompose()
        md_content = markdownify.markdownify(
            str(content_el),
            heading_style="ATX",
            bullets="-",
            strip=["script", "style"],
        )
        # 清理多餘空行
        md_content = re.sub(r"\n{3,}", "\n\n", md_content).strip()
    else:
        md_content = ""

    return {
        "article_id": article_id,
        "date": raw_date,
        "title": title,
        "description": description,
        "hero_image": hero_image,
        "tags_str": tags_str,
        "category": category,
        "url": url,
        "content": md_content,
    }


def save_article(data: dict, blog_dir: str) -> str:
    filename = f"{data['date']}-{data['article_id']}.md"
    filepath = os.path.join(blog_dir, filename)

    title_escaped = data["title"].replace('"', '\\"')

    md = f"""---
title: "{title_escaped}"
description: "{data['description']}"
pubDate: "{data['date']}"
heroImage: "{data['hero_image']}"
tags: [{data['tags_str']}]
originalUrl: "{data['url']}"
category: ["{data['category']}"]
---

{data['content']}
"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(md)

    return filename


# ============================================================
# 主程式
# ============================================================
async def main():
    print("=" * 55)
    print("🛡️  Vocus 安全爬蟲 — 只新增缺少的文章")
    print("=" * 55)

    # Step 0：讀取現有 article ID
    existing_ids = get_existing_article_ids(OUTPUT_DIR)
    print(f"\n📁 現有 MD 檔：{len(existing_ids)} 篇（這些全部跳過）")

    # Step 1：掃描 vocus 全部文章
    print("\n📡 Step 1：用瀏覽器掃描 vocus 所有文章...")
    all_articles = await get_all_article_urls()

    # Step 2：過濾出「需要下載」的文章
    to_download = []
    for url, cat in all_articles:
        m = re.search(r"/article/([a-f0-9]{24})", url)
        if m and m.group(1) not in existing_ids:
            to_download.append((url, cat))

    print(f"\n🆕 需要新增：{len(to_download)} 篇")
    print(f"⏭️  跳過（已存在）：{len(all_articles) - len(to_download)} 篇")

    if not to_download:
        print("\n✅ 所有文章都已存在，不需要下載！")
        return

    # 確認
    print(f"\n開始下載 {len(to_download)} 篇新文章...\n")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    success, failed = 0, 0
    failed_urls = []

    for i, (url, cat) in enumerate(to_download, 1):
        article_id = re.search(r"/article/([a-f0-9]{24})", url).group(1)
        print(f"[{i}/{len(to_download)}] {article_id[:12]}... ", end="")

        data = scrape_article(url, cat)
        if data:
            filename = save_article(data, OUTPUT_DIR)
            print(f"✅ {filename}")
            success += 1
        else:
            print(f"❌ 失敗 {url}")
            failed += 1
            failed_urls.append(url)

        if i < len(to_download):
            time.sleep(DELAY)

    # 結果報告
    print("\n" + "=" * 55)
    print("🎉 完成！")
    print(f"   ✅ 新增成功：{success} 篇")
    print(f"   ❌ 失敗：{failed} 篇")
    print(f"   🛡️  原有檔案：完全未動")
    print(f"   📁 位置：{OUTPUT_DIR}/")

    if failed_urls:
        with open("vocus_failed_urls.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(failed_urls))
        print(f"   ⚠️  失敗清單：vocus_failed_urls.txt")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(main())
