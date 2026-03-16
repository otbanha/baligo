#!/usr/bin/env python3
"""
下載 vocus 圖片並上傳到 Cloudflare R2
"""

import os, re, time, hashlib, urllib.request, json, subprocess
from pathlib import Path

# ===== 設定區（換成你的資料）=====
CF_ACCOUNT_ID = "otbanha"
CF_API_TOKEN = "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG"
R2_BUCKET = "baligo-image"
R2_PUBLIC_URL = "https://pub-2ae820f1a8d646cda6ce17cdbe17e954.r2.dev"
# =================================

blog_dir = "src/content/blog"
tmp_dir = "/tmp/baligo_images"
os.makedirs(tmp_dir, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://vocus.cc/'
}

# Step 1: 收集所有圖片網址
print("📡 掃描文章中的圖片...")
all_images = set()
for fname in os.listdir(blog_dir):
    if not fname.endswith('.md'):
        continue
    with open(os.path.join(blog_dir, fname), 'r', encoding='utf-8') as f:
        content = f.read()
    images = re.findall(r'https://(?:resize-image\.vocus\.cc|images\.vocus\.cc)[^\s\)\"\'>\]]+', content)
    all_images.update(images)

print(f"✅ 找到 {len(all_images)} 張圖片")

# Step 2: 下載 + 上傳
success = 0
failed = 0
skipped = 0
mapping = {}

def get_filename(url):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    if '.png' in url.lower():
        ext = '.png'
    elif '.webp' in url.lower():
        ext = '.webp'
    elif '.gif' in url.lower():
        ext = '.gif'
    else:
        ext = '.jpg'
    return f"vocus/{url_hash}{ext}"

def upload_to_r2(local_path, r2_key):
    """用 curl 上傳到 R2"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/r2/buckets/{R2_BUCKET}/objects/{r2_key}"
    
    # 判斷 content-type
    if r2_key.endswith('.png'):
        ct = 'image/png'
    elif r2_key.endswith('.webp'):
        ct = 'image/webp'
    elif r2_key.endswith('.gif'):
        ct = 'image/gif'
    else:
        ct = 'image/jpeg'
    
    result = subprocess.run([
        'curl', '-s', '-X', 'PUT',
        '-H', f'Authorization: Bearer {CF_API_TOKEN}',
        '-H', f'Content-Type: {ct}',
        '--data-binary', f'@{local_path}',
        url
    ], capture_output=True, text=True)
    
    return result.returncode == 0

for i, url in enumerate(all_images, 1):
    r2_key = get_filename(url)
    new_url = f"{R2_PUBLIC_URL}/{r2_key}"
    mapping[url] = new_url
    
    local_path = os.path.join(tmp_dir, r2_key.replace('/', '_'))
    
    print(f"[{i}/{len(all_images)}]", end=' ', flush=True)
    
    # 下載
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(local_path, 'wb') as f:
                f.write(resp.read())
    except Exception as e:
        print(f"❌ 下載失敗: {str(e)[:40]}")
        failed += 1
        time.sleep(0.5)
        continue
    
    # 上傳到 R2
    if upload_to_r2(local_path, r2_key):
        print(f"✅ {r2_key}")
        success += 1
    else:
        print(f"❌ 上傳失敗")
        failed += 1
    
    time.sleep(0.3)

# 儲存對照表
with open("image_mapping.json", "w", encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print(f"\n{'='*50}")
print(f"🎉 完成！成功：{success}，失敗：{failed}")
print(f"🗺️  對照表：image_mapping.json")
