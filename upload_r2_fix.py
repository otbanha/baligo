import os, subprocess, json

CF_ACCOUNT_ID = "8539451c59b0447bc90fea01f29d10c8"
CF_API_TOKEN = "RPzv_OhlpvgzYHly08Zwrj55ohizVc8CB8HUetfG/"
R2_BUCKET = "baligo-image"
tmp_dir = "/tmp/baligo_images"

files = [f for f in os.listdir(tmp_dir) if os.path.isfile(os.path.join(tmp_dir, f))]
print(f"本地圖片：{len(files)} 張")

success = 0
failed = 0

for i, fname in enumerate(files, 1):
    local_path = os.path.join(tmp_dir, fname)
    r2_key = f"vocus/{fname}"
    ext = fname.split(".")[-1].lower()
    ct = {"png": "image/png", "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/jpeg")
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/r2/buckets/{R2_BUCKET}/objects/{r2_key}"
    
    result = subprocess.run([
        "curl", "-s", "-X", "PUT",
        "-H", f"Authorization: Bearer {CF_API_TOKEN}",
        "-H", f"Content-Type: {ct}",
        "--data-binary", f"@{local_path}",
        url
    ], capture_output=True, text=True)
    
    try:
        resp = json.loads(result.stdout)
        if resp.get("success"):
            success += 1
            print(f"[{i}/{len(files)}] OK", end="\r")
        else:
            print(f"[{i}/{len(files)}] FAIL: {resp.get('errors')}")
            failed += 1
    except:
        failed += 1

print(f"\n完成！成功：{success}，失敗：{failed}")
