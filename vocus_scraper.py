#!/usr/bin/env python3
"""
Vocus 文章爬蟲 v3 - Playwright 版
用真實瀏覽器模擬滾動，抓取所有文章
"""
 
import asyncio
import re
import json
import os
import time
import requests
from bs4 import BeautifulSoup
import markdownify
from datetime import datetime
from playwright.async_api import async_playwright
 
OUTPUT_DIR = "src/content/blog"
DELAY = 2
 
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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
 
 
async def scroll_and_collect(page, url, category):
    """開啟頁面，一直滾動直到沒有新文章出現"""
    print(f"\n📂 掃描：{category}")
    await page.goto(url, wait_until="networkidle", timeout=30000)
 
    collected = set()
    no_new_count = 0
 
    while no_new_count < 3:  # 連續3次沒有新文章才停止
        # 抓目前頁面所有文章連結
        links = await page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => e.getAttribute('href'))"
        )
 
        before = len(collected)
        for href in links:
            if href and re.match(r"^/article/[a-f0-9]+$", href):
                collected.add("https://vocus.cc" + href)
 
        after = len(collected)
        new_count = after - before
 
        if new_count == 0:
            no_new_count += 1
        else:
            no_new_count = 0
            print(f"  已找到 {after} 篇...", end="\r")
 
        # 滾到底部
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2)  # 等待新內容載入
 
    print(f"  ✅ 共找到 {len(collected)} 篇")
    return [(url, category) for url in collected]
 
 
async def get_all_article_urls():
    """用 Playwright 瀏覽器滾動抓取所有文章網址"""
    all_urls = {}
 
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
 
        # 設定語言
        await page.set_extra_http_headers({"Accept-Language": "zh-TW,zh;q=0.9"})
 
        for room_url, category in ROOM_PAGES.items():
            try:
                results = await scroll_and_collect(page, room_url, category)
                for url, cat in results:
                    if url not in all_urls:
                        all_urls[url] = cat
            except Exception as e:
                print(f"  ⚠️ 錯誤：{e}")
 
        await browser.close()
 
    result = [(url, cat) for url, cat in all_urls.items()]
    print(f"\n✅ 合計不重複文章：{len(result)} 篇")
    return result
 
 
def scrape_article(url, category):
    """用 requests 抓取單篇文章內容（速度快）"""
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(res.text, "html.parser")
 
        # 標題
        title_tag = soup.find("h1")
        title = title_tag.get_text(strip=True) if title_tag else "無標題"
 
        # 日期
        date_str = ""
        pub_time = soup.find("meta", property="article:published_time")
        if pub_time:
            raw = pub_time.get("content", "")
            match = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
            if match:
                date_str = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
 
        if not date_str:
            date_match = re.search(r"(\d{4})/(\d{2})/(\d{2})", res.text)
            if date_match:
                date_str = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
 
        if not date_str:
            date_str = datetime.now().strftime("%Y-%m-%d")
 
        # 封面圖
        hero_image = ""
        og_image = soup.find("meta", property="og:image")
        if og_image:
            hero_image = og_image.get("content", "")
 
        # 描述
        description = ""
        og_desc = soup.find("meta", property="og:description")
        if og_desc:
            description = og_desc.get("content", "").replace('"', "'")[:200]
 
        # 標籤
        tags = []
        tag_links = soup.find_all("a", href=re.compile(r"/tags/"))
        for tag in tag_links:
            tag_text = tag.get_text(strip=True).replace("#", "").strip()
            if tag_text and tag_text not in tags:
                tags.append(tag_text)
        tags = tags[:5]
 
        # 文章內容
        content_md = ""
        h1 = soup.find("h1")
        if h1:
            content_parts = []
            for sibling in h1.find_next_siblings():
                cls = " ".join(sibling.get("class", []))
                if any(x in cls.lower() for x in ["comment", "footer", "sidebar", "related"]):
                    break
                for tag in sibling.find_all(["script", "style"]):
                    tag.decompose()
                content_parts.append(str(sibling))
 
            content_html = "\n".join(content_parts)
            content_md = markdownify.markdownify(
                content_html, heading_style="ATX", bullets="-"
            )
 
        content_md = re.sub(r'\n{3,}', '\n\n', content_md)
        content_md = re.sub(r'\[點我進入.*?\]\(.*?\)', '', content_md)
        content_md = content_md.strip()
 
        return {
            "id": url.split("/")[-1],
            "title": title,
            "date": date_str,
            "category": category,
            "description": description,
            "hero_image": hero_image,
            "tags": tags,
            "content": content_md,
            "original_url": url,
        }
 
    except Exception as e:
        print(f"  ❌ {e}")
        return None
 
 
def save_as_markdown(article, output_dir):
    filename = f"{article['date']}-{article['id']}.md"
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
 
    tags_yaml = ""
    if article['tags']:
        tags_list = '", "'.join(article['tags'])
        tags_yaml = f'tags: ["{tags_list}"]'
 
    title_safe = article['title'].replace('"', "'").replace('\n', ' ')
    desc_safe = article['description'].replace('"', "'").replace('\n', ' ')
 
    content = f"""---
title: "{title_safe}"
description: "{desc_safe}"
pubDate: "{article['date']}"
category: "{article['category']}"
heroImage: "{article['hero_image']}"
{tags_yaml}
originalUrl: "{article['original_url']}"
---
 
{article['content']}
"""
 
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath
 
 
async def main():
    print("=" * 50)
    print("🌴 Vocus → Astro 文章搬移工具 v3")
    print("=" * 50)
 
    os.makedirs(OUTPUT_DIR, exist_ok=True)
 
    # Step 1: 用 Playwright 滾動抓網址
    print("\n📡 Step 1: 用瀏覽器滾動抓取所有文章...")
    article_urls = await get_all_article_urls()
 
    with open("article_urls.json", "w", encoding="utf-8") as f:
        json.dump(article_urls, f, ensure_ascii=False, indent=2)
    print(f"💾 網址清單已存到 article_urls.json")
 
    # Step 2: 逐篇抓取內容
    print(f"\n📥 Step 2: 抓取文章內容...")
    print(f"   共 {len(article_urls)} 篇，約需 {len(article_urls) * DELAY // 60} 分鐘")
 
    success = 0
    failed = 0
    failed_urls = []
 
    for i, (url, category) in enumerate(article_urls, 1):
        article_id = url.split("/")[-1]
        print(f"[{i}/{len(article_urls)}] {article_id[:20]}...", end=" ", flush=True)
 
        article = scrape_article(url, category)
 
        if article:
            save_as_markdown(article, OUTPUT_DIR)
            print(f"✅ {article['title'][:25]}")
            success += 1
        else:
            print("❌ 失敗")
            failed += 1
            failed_urls.append(url)
 
        if i < len(article_urls):
            time.sleep(DELAY)
 
    print("\n" + "=" * 50)
    print("🎉 完成！")
    print(f"   ✅ 成功：{success} 篇")
    print(f"   ❌ 失敗：{failed} 篇")
    print(f"   📁 位置：{OUTPUT_DIR}/")
 
    if failed_urls:
        with open("failed_urls.txt", "w") as f:
            f.write("\n".join(failed_urls))
        print(f"   ⚠️  失敗清單：failed_urls.txt")
    print("=" * 50)
 
 
if __name__ == "__main__":
    asyncio.run(main())