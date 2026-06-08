#!/usr/bin/env python3
"""
修復 R2 內文圖片 - 重新下載高解析度版本
"""

import os, re, json, time, requests, boto3, urllib.parse
from pathlib import Path

# ===== 設定 =====
CF_ACCOUNT_ID = "8539451c59b0447bc90fea01f29d10c8"
R2_BUCKET = "baligo-image"
R2_PUBLIC_URL = "https://pub-2ae820f1a8d646cda6ce17cdbe17e954.r2.dev"
TMP_DIR = "/tmp/baligo_fix"
MIN_SIZE = 20000  # 小於 20KB 才算壞圖
# ================

os.makedirs(TMP_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://vocus.cc/'
}

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
)

def check_r2_size(r2_key):
    try:
        resp = s3.head_object(Bucket=R2_BUCKET, Key=r2_key)
        return resp['ContentLength']
    except:
        return 0

def extract_original_url(vocus_resize_url):
    """從 resize URL 提取原始 images.vocus.cc URL"""
    if 'images.vocus.cc' in vocus_resize_url and 'resize-image' not in vocus_resize_url:
        return vocus_resize_url
    match = re.search(r'url=([^&]+)', vocus_resize_url)
    if match:
        return urllib.parse.unquote(match.group(1))
    return None

def download_image(url, filepath):
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
    try:
        ext = Path(filepath).suffix.lower()
        content_type = 'image/png' if ext == '.png' else 'image/jpeg'
        with open(filepath, 'rb') as f:
            s3.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f, ContentType=content_type)
        return True
    except Exception as e:
        print(f"  ❌ 上傳失敗: {e}")
        return False

def main():
    print("=" * 50)
    print("🔧 R2 內文圖片修復工具")
    print("=" * 50)

    # 讀取對照表
    with open('image_mapping.json', 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    print(f"📂 對照表共 {len(mapping)} 張圖片")
    print("🔍 檢查哪些圖片需要修復...")

    need_fix = []
    for vocus_url, r2_url in mapping.items():
        r2_key = r2_url.replace(R2_PUBLIC_URL + '/', '')
        size = check_r2_size(r2_key)
        if size < MIN_SIZE:
            orig_url = extract_original_url(vocus_url)
            if orig_url and 'images.vocus.cc' in orig_url:
                need_fix.append({
                    'vocus_url': vocus_url,
                    'orig_url': orig_url,
                    'r2_key': r2_key,
                    'current_size': size,
                })

    print(f"⚠️  需要修復：{len(need_fix)} 張\n")

    if not need_fix:
        print("✅ 所有圖片都正常！")
        return

    success = 0
    failed = 0

    for i, item in enumerate(need_fix, 1):
        orig_url = item['orig_url']
        r2_key = item['r2_key']

        print(f"[{i}/{len(need_fix)}] {r2_key[-30:]}...", end=' ', flush=True)

        ext = '.png' if orig_url.endswith('.png') else '.jpg'
        tmp_file = f"{TMP_DIR}/fix_{i}{ext}"

        size = download_image(orig_url, tmp_file)
        if size < 1000:
            print(f"❌ 下載失敗 ({size} bytes)")
            failed += 1
            time.sleep(1)
            continue

        if not upload_to_r2(tmp_file, r2_key):
            print("❌ 上傳失敗")
            failed += 1
            time.sleep(1)
            continue

        print(f"✅ {size//1024}KB (原本 {item['current_size']} bytes)")
        success += 1
        os.remove(tmp_file)
        time.sleep(0.5)

    print("\n" + "=" * 50)
    print(f"✅ 成功：{success} 張")
    print(f"❌ 失敗：{failed} 張")
    print("=" * 50)

if __name__ == "__main__":
    main()