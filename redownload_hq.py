#!/usr/bin/env python3
"""
重新抓取 vocus 高解析度圖片並更新 R2 (Playwright 版)
"""

import os, re, time, requests, boto3, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

# ===== 設定 =====
CF_ACCOUNT_ID = "8539451c59b0447bc90fea01f29d10c8"
R2_BUCKET = "baligo-image"
R2_PUBLIC_URL = "https://pub-2ae820f1a8d646cda6ce17cdbe17e954.r2.dev"
BLOG_DIR = "src/content/blog"
TMP_DIR = "/tmp/baligo_hq"
MIN_SIZE = 50000  # 最小 50KB 才算真實圖片
# ================

os.makedirs(TMP_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'zh-TW,zh;q=0.9',
    'Referer': 'https://vocus.cc/'
}

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
)

def check_r2_image_size(r2_key):
    """檢查 R2 上的圖片大小"""
    try:
        resp = s3.head_object(Bucket=R2_BUCKET, Key=r2_key)
        return resp['ContentLength']
    except:
        return 0

async def get_image_url_playwright(browser, vocus_url):
    """用 Playwright 抓取 vocus 文章的原始圖片 URL"""
    try:
        page = await browser.new_page()
        await page.goto(vocus_url, wait_until="networkidle", timeout=20000)

        # 抓 og:image
        og_image = await page.evaluate('''() => {
            const meta = document.querySelector('meta[property="og:image"]');
            return meta ? meta.getAttribute('content') : null;
        }''')

        await page.close()

        if og_image:
            # 如果是 resize URL，提取原始 URL
            if 'resize-image.vocus.cc' in og_image:
                match = re.search(r'url=([^&]+)', og_image)
                if match:
                    import urllib.parse
                    og_image = urllib.parse.unquote(match.group(1))
            if 'images.vocus.cc' in og_image:
                return og_image

    except Exception as e:
        print(f"  ⚠️ Playwright 錯誤: {e}")
    return None

def download_image(url, filepath):
    """下載圖片"""
    try:
        res = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        if res.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in res.iter_content(8192):
                    f.write(chunk)
            return os.path.getsize(filepath)
    except Exception as e:
        print(f"  ❌ 下載失敗: {e}")
    return 0

def upload_to_r2(filepath, r2_key):
    """上傳到 R2"""
    try:
        ext = Path(filepath).suffix.lower()
        content_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        with open(filepath, 'rb') as f:
            s3.put_object(
                Bucket=R2_BUCKET,
                Key=r2_key,
                Body=f,
                ContentType=content_type,
            )
        return True
    except Exception as e:
        print(f"  ❌ 上傳失敗: {e}")
        return False

def update_markdown_heroimage(md_path, new_url):
    """更新 markdown 文章的 heroImage"""
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(
        r'heroImage:\s*"[^"]*"',
        f'heroImage: "{new_url}"',
        content
    )
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

async def main():
    print("=" * 50)
    print("🌴 Vocus 高解析度圖片重新下載工具 v2")
    print("=" * 50)

    md_files = list(Path(BLOG_DIR).glob('*.md'))
    print(f"📂 共找到 {len(md_files)} 篇文章")

    # 找出需要更新的文章（R2 圖片小於 50KB）
    need_update = []
    print("🔍 檢查哪些圖片需要更新...")
    for md_path in md_files:
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()

        url_match = re.search(r'originalUrl:\s*"(https://vocus\.cc/article/[^"]+)"', content)
        hero_match = re.search(r'heroImage:\s*"([^"]*r2\.dev/([^"]+))"', content)

        if not url_match or not hero_match:
            continue

        r2_key = hero_match.group(2)
        size = check_r2_image_size(r2_key)

        if size < MIN_SIZE:
            need_update.append({
                'md_path': md_path,
                'vocus_url': url_match.group(1),
                'r2_key': r2_key,
                'current_size': size,
            })

    print(f"⚠️  需要更新：{len(need_update)} 篇\n")

    if not need_update:
        print("✅ 所有圖片都已是高解析度！")
        return

    success = 0
    failed = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for i, item in enumerate(need_update, 1):
            md_path = item['md_path']
            vocus_url = item['vocus_url']
            r2_key = item['r2_key']
            article_id = vocus_url.split('/')[-1]

            print(f"[{i}/{len(need_update)}] {article_id[:20]}...", end=' ', flush=True)

            # 用 Playwright 抓圖片 URL
            orig_url = await get_image_url_playwright(browser, vocus_url)
            if not orig_url:
                print("⚠️ 找不到圖片")
                failed += 1
                continue

            # 下載圖片
            ext = '.png' if orig_url.endswith('.png') else '.jpg'
            tmp_file = f"{TMP_DIR}/{article_id}{ext}"
            size = download_image(orig_url, tmp_file)

            if size < 1000:
                print(f"❌ 下載失敗 ({size} bytes)")
                failed += 1
                continue

            # 上傳到 R2
            final_key = re.sub(r'\.[^.]+$', ext, r2_key)
            if not upload_to_r2(tmp_file, final_key):
                print("❌ 上傳失敗")
                failed += 1
                continue

            # 更新 markdown
            new_hero_url = f"{R2_PUBLIC_URL}/{final_key}"
            update_markdown_heroimage(md_path, new_hero_url)

            print(f"✅ {size//1024}KB")
            success += 1

            os.remove(tmp_file)
            await asyncio.sleep(1.5)

        await browser.close()

    print("\n" + "=" * 50)
    print(f"✅ 成功：{success} 篇")
    print(f"❌ 失敗：{failed} 篇")
    print("=" * 50)

    if success > 0:
        print("\n💡 記得執行:")
        print("   git add . && git commit -m '更新高解析度圖片' && git push")

if __name__ == "__main__":
    asyncio.run(main())