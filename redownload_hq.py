#!/usr/bin/env python3
"""
重新抓取 vocus 高解析度圖片並更新 R2
"""

import os, re, time, requests, boto3, json
from pathlib import Path
from bs4 import BeautifulSoup

# ===== 設定 =====
CF_ACCOUNT_ID = "8539451c59b0447bc90fea01f29d10c8"
CF_API_TOKEN = "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG"
R2_BUCKET = "baligo-image"
R2_PUBLIC_URL = "https://pub-2ae820f1a8d646cda6ce17cdbe17e954.r2.dev"
BLOG_DIR = "src/content/blog"
TMP_DIR = "/tmp/baligo_hq"
# ================

os.makedirs(TMP_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'zh-TW,zh;q=0.9',
    'Referer': 'https://vocus.cc/'
}

# 連接 R2
s3 = boto3.client(
    's3',
    endpoint_url=f'https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
)

def get_original_image_url(vocus_url):
    """從 vocus 文章頁面抓取原始高解析度圖片 URL"""
    try:
        res = requests.get(vocus_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # 找所有圖片
        images = []
        
        # 方法1: 找 og:image
        og = soup.find('meta', property='og:image')
        if og:
            url = og.get('content', '')
            # 如果是 resize URL，提取原始 URL
            if 'resize-image.vocus.cc' in url:
                match = re.search(r'url=([^&]+)', url)
                if match:
                    import urllib.parse
                    url = urllib.parse.unquote(match.group(1))
            if 'images.vocus.cc' in url:
                images.append(url)
        
        # 方法2: 找文章內所有 images.vocus.cc 圖片
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if 'images.vocus.cc' in src:
                # 移除 resize 參數，取原圖
                if 'resize-image.vocus.cc' in src:
                    match = re.search(r'url=([^&]+)', src)
                    if match:
                        import urllib.parse
                        src = urllib.parse.unquote(match.group(1))
                images.append(src)
        
        return images[0] if images else None
        
    except Exception as e:
        print(f"  ❌ 抓取失敗: {e}")
        return None

def download_image(url, filepath):
    """下載圖片"""
    try:
        res = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        if res.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in res.iter_content(8192):
                    f.write(chunk)
            size = os.path.getsize(filepath)
            return size > 10000  # 至少要 10KB 才算成功
    except Exception as e:
        print(f"  ❌ 下載失敗: {e}")
    return False

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

def main():
    print("=" * 50)
    print("🌴 Vocus 高解析度圖片重新下載工具")
    print("=" * 50)

    # 讀取所有文章
    md_files = list(Path(BLOG_DIR).glob('*.md'))
    print(f"📂 共找到 {len(md_files)} 篇文章\n")

    success = 0
    skipped = 0
    failed = 0

    for i, md_path in enumerate(md_files, 1):
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 找 originalUrl
        url_match = re.search(r'originalUrl:\s*"(https://vocus\.cc/article/[^"]+)"', content)
        if not url_match:
            skipped += 1
            continue

        vocus_url = url_match.group(1)
        article_id = vocus_url.split('/')[-1]

        # 找目前的 heroImage
        hero_match = re.search(r'heroImage:\s*"([^"]*)"', content)
        current_hero = hero_match.group(1) if hero_match else ''

        print(f"[{i}/{len(md_files)}] {article_id[:20]}...", end=' ', flush=True)

        # 從 vocus 抓原始圖片 URL
        orig_url = get_original_image_url(vocus_url)
        if not orig_url:
            print("⚠️ 找不到圖片")
            failed += 1
            time.sleep(1)
            continue

        # 下載圖片
        ext = '.jpg' if orig_url.endswith('.jpeg') or orig_url.endswith('.jpg') else '.png'
        tmp_file = f"{TMP_DIR}/{article_id}{ext}"
        
        if not download_image(orig_url, tmp_file):
            print("❌ 下載失敗")
            failed += 1
            time.sleep(1)
            continue

        # 找 R2 的 key（從現有 heroImage URL 取）
        if 'r2.dev/vocus/' in current_hero:
            r2_key = 'vocus/' + current_hero.split('/vocus/')[-1]
            # 確保副檔名一致
            r2_key = re.sub(r'\.[^.]+$', ext, r2_key)
        else:
            r2_key = f"vocus/vocus_{article_id}{ext}"

        # 上傳到 R2
        if not upload_to_r2(tmp_file, r2_key):
            print("❌ 上傳失敗")
            failed += 1
            time.sleep(1)
            continue

        # 更新 markdown
        new_hero_url = f"{R2_PUBLIC_URL}/{r2_key}"
        update_markdown_heroimage(md_path, new_hero_url)

        file_size = os.path.getsize(tmp_file) // 1024
        print(f"✅ {file_size}KB")
        success += 1

        # 清理暫存
        os.remove(tmp_file)
        time.sleep(1.5)

    print("\n" + "=" * 50)
    print(f"✅ 成功：{success} 篇")
    print(f"⚠️  略過：{skipped} 篇（無 originalUrl）")
    print(f"❌ 失敗：{failed} 篇")
    print("=" * 50)

if __name__ == "__main__":
    main()