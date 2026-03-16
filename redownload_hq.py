import json, re, time, os, subprocess, urllib.request

with open('image_mapping.json', 'r') as f:
    mapping = json.load(f)

CF_ACCOUNT_ID = "otbanha"
CF_API_TOKEN = "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG"
R2_BUCKET = "baligo-image"
tmp_dir = "/tmp/baligo_hq"
os.makedirs(tmp_dir, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://vocus.cc/'
}

low_q = {old: new for old, new in mapping.items() 
         if 'quality=1&' in old or 'quality=1%' in old}

print(f"需要重新下載：{len(low_q)} 張")

success = 0
failed = 0

for i, (old_url, r2_url) in enumerate(low_q.items(), 1):
    # 換成高清網址
    better_url = re.sub(r'quality=1&', 'quality=80&', old_url)
    better_url = re.sub(r'quality=1%', 'quality=80%', better_url)
    
    # R2 key
    r2_key = 'vocus/' + r2_url.split('/')[-1]
    local_path = os.path.join(tmp_dir, r2_url.split('/')[-1])
    
    print(f"[{i}/{len(low_q)}]", end=' ', flush=True)
    
    try:
        req = urllib.request.Request(better_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(local_path, 'wb') as f:
                f.write(resp.read())
    except Exception as e:
        print(f"❌ 下載失敗: {str(e)[:40]}")
        failed += 1
        time.sleep(0.3)
        continue
    
    # 上傳覆蓋 R2
    ext = r2_key.split('.')[-1].lower()
    ct = {'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif'}.get(ext, 'image/jpeg')
    
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/r2/buckets/{R2_BUCKET}/objects/{r2_key}"
    result = subprocess.run([
        'curl', '-s', '-X', 'PUT',
        '-H', f'Authorization: Bearer {CF_API_TOKEN}',
        '-H', f'Content-Type: {ct}',
        '--data-binary', f'@{local_path}',
        url
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✅")
        success += 1
    else:
        print(f"❌ 上傳失敗")
        failed += 1
    
    time.sleep(0.3)

print(f"\n🎉 完成！成功：{success}，失敗：{failed}")
