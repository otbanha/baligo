#!/usr/bin/env python3
"""
sync_images.py
把 blog (zh-TW) 文章裡的圖片路徑同步到其他語系 (zh-hk, zh-cn, en)

用法：
  python3 sync_images.py                   # 掃描所有文章，有差異就問你
  python3 sync_images.py --dry-run         # 只顯示差異，不修改
  python3 sync_images.py --slug 2024-08-07-66b20b15fd89780001ceef6b  # 只處理指定文章
  python3 sync_images.py --auto            # 全部自動同步，不問
"""

import re
import sys
import os
from pathlib import Path

BASE = Path(__file__).parent / 'src/content'
LANGS = ['zh-hk', 'zh-cn', 'en']
IMG_RE = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
HERO_RE = re.compile(r'^(heroImage:\s*)(.+)$', re.MULTILINE)

def get_image_urls(text):
    """Extract all image URLs in order from markdown text."""
    return [m.group(2) for m in IMG_RE.finditer(text)]

def get_hero_image(text):
    m = HERO_RE.search(text)
    return m.group(2).strip().strip('"') if m else None

def sync_file(src_path, dst_path, dry_run=False):
    src = src_path.read_text(encoding='utf-8')
    dst = dst_path.read_text(encoding='utf-8')

    src_imgs = get_image_urls(src)
    dst_imgs = get_image_urls(dst)

    src_hero = get_hero_image(src)
    dst_hero = get_hero_image(dst)

    changes = []

    # Check heroImage
    if src_hero and dst_hero and src_hero != dst_hero:
        changes.append(f'  heroImage: {dst_hero[:60]} → {src_hero[:60]}')

    # Check body images
    if src_imgs != dst_imgs:
        if len(src_imgs) != len(dst_imgs):
            changes.append(f'  ⚠️  圖片數量不一致！src={len(src_imgs)}, dst={len(dst_imgs)}，跳過')
            return False
        diff_count = sum(1 for a, b in zip(src_imgs, dst_imgs) if a != b)
        changes.append(f'  {diff_count} 張圖片路徑不同')

    if not changes:
        return False  # nothing to do

    print(f'\n{dst_path.relative_to(BASE.parent)}')
    for c in changes:
        print(c)

    if dry_run:
        return False

    # Apply changes
    new_dst = dst

    # Sync heroImage
    if src_hero and dst_hero and src_hero != dst_hero:
        new_dst = HERO_RE.sub(lambda m: m.group(1) + src_hero, new_dst)

    # Sync body images (replace in order)
    if src_imgs != dst_imgs and len(src_imgs) == len(dst_imgs):
        url_map = {}
        for old, new in zip(dst_imgs, src_imgs):
            if old != new:
                url_map[old] = new

        def replace_url(m):
            alt = m.group(1)
            url = m.group(2)
            return f'![{alt}]({url_map.get(url, url)})'

        new_dst = IMG_RE.sub(replace_url, new_dst)

    dst_path.write_text(new_dst, encoding='utf-8')
    return True

def main():
    dry_run = '--dry-run' in sys.argv
    auto = '--auto' in sys.argv

    slug = None
    for i, a in enumerate(sys.argv[1:]):
        if a == '--slug' and i + 2 < len(sys.argv):
            slug = sys.argv[i + 2]

    src_dir = BASE / 'blog'
    articles = [src_dir / (slug + '.md')] if slug else sorted(src_dir.glob('*.md'))

    total_updated = 0

    for src_path in articles:
        if not src_path.exists():
            print(f'找不到：{src_path}')
            continue

        needs_update = []
        for lang in LANGS:
            dst_path = BASE / lang / src_path.name
            if not dst_path.exists():
                continue  # no translation yet, skip

            src = src_path.read_text(encoding='utf-8')
            dst = dst_path.read_text(encoding='utf-8')

            src_imgs = get_image_urls(src)
            dst_imgs = get_image_urls(dst)
            src_hero = get_hero_image(src)
            dst_hero = get_hero_image(dst)

            hero_diff = src_hero and dst_hero and src_hero != dst_hero
            img_diff = src_imgs != dst_imgs and len(src_imgs) == len(dst_imgs)

            if hero_diff or img_diff:
                needs_update.append((lang, dst_path))

        if not needs_update:
            continue

        print(f'\n📄 {src_path.name}')
        for lang, dst_path in needs_update:
            print(f'   → {lang} 有差異')

        if dry_run:
            continue

        if not auto:
            ans = input('同步這篇？[y/N] ').strip().lower()
            if ans != 'y':
                continue

        for lang, dst_path in needs_update:
            updated = sync_file(src_path, dst_path, dry_run=False)
            if updated:
                print(f'   ✅ {lang} 已同步')
                total_updated += 1

    if dry_run:
        print('\n(dry-run 模式，沒有實際修改)')
    else:
        print(f'\n完成，共更新 {total_updated} 個翻譯檔案')

if __name__ == '__main__':
    main()
