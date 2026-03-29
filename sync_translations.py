#!/usr/bin/env python3
"""
sync_translations.py
把 blog (zh-TW) 文章的修改同步到其他語系翻譯檔案。

功能：
  - 同步圖片路徑（最主要用途）
  - 如果翻譯版本缺少圖片區塊，自動補入
  - 同步 heroImage

用法：
  python3 sync_translations.py                    # 掃描所有，有差異的才同步
  python3 sync_translations.py --dry-run          # 只看差異，不修改
  python3 sync_translations.py --slug SLUG        # 只處理指定文章
  python3 sync_translations.py --changed-files f  # 讀 git 變更清單（供 GitHub Action 用）
  python3 sync_translations.py --auto             # 全部自動，不問
"""

import re
import sys
from pathlib import Path

BASE   = Path(__file__).parent / 'src/content'
LANGS  = ['zh-hk', 'zh-cn', 'en']
RAW_IMG = re.compile(r'^!\[.*?\]\(.*?\)\s*$', re.MULTILINE)
ANY_IMG = re.compile(r'!\[.*?\]\(.*?\)')
HERO_RE = re.compile(r'^(heroImage:\s*["\']?)(.+?)(["\']?\s*)$', re.MULTILINE)
AGODA_RE = re.compile(r'agoda\.com[^)]*[?&]hid=(\d+)')
H2_RE   = re.compile(r'^## .+', re.MULTILINE)


# ─── 工具函式 ─────────────────────────────────────────────

def split_blocks(text):
    """以 ## 標題分割成 block list，每個 block 含標題行在內。"""
    parts = re.split(r'(?=^## )', text, flags=re.MULTILINE)
    return parts  # parts[0] 是標題前的 frontmatter+intro 區塊


def get_agoda_id(block):
    m = AGODA_RE.search(block)
    return m.group(1) if m else None


def get_anchor(block):
    """嘗試從 block 提取唯一識別碼（Agoda hid 或英文關鍵字）。"""
    hid = get_agoda_id(block)
    if hid:
        return f'hid:{hid}'
    # 從 h2 標題取英文關鍵字作為 fallback
    m = H2_RE.search(block)
    if m:
        words = re.findall(r'[A-Za-z0-9]+', m.group())
        if words:
            return 'en:' + '_'.join(w.lower() for w in words[:4])
    return None


def get_raw_images(block):
    """回傳 block 內所有 ![raw-image](...) 行。"""
    return [l.strip() for l in block.split('\n') if RAW_IMG.match(l + '\n')]


def sync_block_images(src_block, dst_block):
    """
    把 src_block 的圖片同步到 dst_block。
    - 若 dst 有圖片：原地替換 URL（按順序）
    - 若 dst 無圖片：在 h2 標題後插入
    回傳新的 dst_block（若無需修改則回傳 None）
    """
    src_imgs = get_raw_images(src_block)
    dst_imgs = get_raw_images(dst_block)

    if not src_imgs:
        return None  # 來源沒圖，不動

    if src_imgs == dst_imgs:
        return None  # 已相同

    dst_lines = dst_block.split('\n')

    if dst_imgs:
        # ── 有圖：逐行替換 ──
        if len(src_imgs) != len(dst_imgs):
            # 數量不同：移除舊圖，在第一張舊圖位置插入新圖
            first_img_idx = next(
                (i for i, l in enumerate(dst_lines) if RAW_IMG.match(l + '\n')), None
            )
            if first_img_idx is None:
                return None
            no_img = [l for l in dst_lines if not RAW_IMG.match(l + '\n')]
            # 重新計算插入位置
            removed = sum(1 for l in dst_lines[:first_img_idx] if RAW_IMG.match(l + '\n'))
            insert_at = first_img_idx - removed
            new_lines = no_img[:insert_at] + src_imgs + no_img[insert_at:]
        else:
            # 數量相同：一對一替換
            src_iter = iter(src_imgs)
            new_lines = []
            for l in dst_lines:
                if RAW_IMG.match(l + '\n'):
                    new_lines.append(next(src_iter))
                else:
                    new_lines.append(l)
    else:
        # ── 無圖：插入到 h2 標題後 ──
        h2_idx = next((i for i, l in enumerate(dst_lines) if l.startswith('## ')), 0)
        insert_pos = h2_idx + 1
        # 跳過標題後的空行
        while insert_pos < len(dst_lines) and not dst_lines[insert_pos].strip():
            insert_pos += 1
        new_lines = dst_lines[:insert_pos] + [''] + src_imgs + [''] + dst_lines[insert_pos:]

    # 清理多餘空行
    cleaned = []
    prev_blank = False
    for l in new_lines:
        is_blank = not l.strip()
        if is_blank and prev_blank:
            continue
        cleaned.append(l)
        prev_blank = is_blank

    new_block = '\n'.join(cleaned)
    return new_block if new_block != dst_block else None


def sync_intro_images(src_intro, dst_intro):
    """同步 intro 區塊（h2 之前）的圖片。"""
    src_imgs = get_raw_images(src_intro)
    dst_imgs = get_raw_images(dst_intro)
    if not src_imgs or src_imgs == dst_imgs:
        return None
    if len(src_imgs) != len(dst_imgs):
        return None  # 數量不同，跳過（保守處理）
    dst_lines = dst_intro.split('\n')
    src_iter = iter(src_imgs)
    new_lines = [next(src_iter) if RAW_IMG.match(l + '\n') else l for l in dst_lines]
    result = '\n'.join(new_lines)
    return result if result != dst_intro else None


def sync_hero(src_text, dst_text):
    """同步 frontmatter 的 heroImage。"""
    sm = HERO_RE.search(src_text)
    dm = HERO_RE.search(dst_text)
    if not sm or not dm:
        return None
    src_url = sm.group(2).strip()
    dst_url = dm.group(2).strip()
    if src_url == dst_url:
        return None
    new_text = HERO_RE.sub(
        lambda m: m.group(1) + src_url + m.group(3),
        dst_text, count=1
    )
    return new_text if new_text != dst_text else None


# ─── 主要同步函式 ─────────────────────────────────────────

def sync_file(src_path, dst_path, dry_run=False, verbose=True):
    src = src_path.read_text(encoding='utf-8')
    dst = dst_path.read_text(encoding='utf-8')

    new_dst = dst
    changes = []

    # 1. heroImage
    result = sync_hero(src, new_dst)
    if result:
        changes.append('heroImage 更新')
        new_dst = result

    # 2. 分 block 同步圖片
    src_blocks = split_blocks(src)
    dst_blocks = split_blocks(new_dst)

    # 建立 src block 的 anchor → block 對應表
    src_map = {}
    for i, b in enumerate(src_blocks):
        a = get_anchor(b)
        if a:
            src_map[a] = b
    src_by_idx = src_blocks  # fallback：按位置

    # 同步 intro（第一個 block，h2 之前）
    if src_blocks and dst_blocks:
        new_intro = sync_intro_images(src_blocks[0], dst_blocks[0])
        if new_intro:
            changes.append('intro 圖片更新')
            dst_blocks[0] = new_intro

    # 同步每個 h2 block
    for i, db in enumerate(dst_blocks[1:], 1):
        anchor = get_anchor(db)
        sb = src_map.get(anchor) if anchor else None
        if sb is None and i < len(src_by_idx):
            sb = src_by_idx[i]  # fallback 按位置
        if sb is None:
            continue
        result = sync_block_images(sb, db)
        if result:
            # 取標題做描述
            h = H2_RE.search(db)
            label = h.group()[:40] if h else f'block[{i}]'
            changes.append(f'圖片更新：{label}')
            dst_blocks[i] = result

    if not changes:
        return False

    if verbose:
        print(f'  {dst_path.relative_to(BASE.parent)}')
        for c in changes:
            print(f'    • {c}')

    if dry_run:
        return True  # 有差異但沒寫入

    new_dst = ''.join(dst_blocks)
    dst_path.write_text(new_dst, encoding='utf-8')
    return True


# ─── CLI 入口 ─────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    auto    = '--auto'    in args

    # --slug SLUG
    slug = None
    if '--slug' in args:
        idx = args.index('--slug')
        if idx + 1 < len(args):
            slug = args[idx + 1]

    # --changed-files FILE (GitHub Action 用)
    changed_file = None
    if '--changed-files' in args:
        idx = args.index('--changed-files')
        if idx + 1 < len(args):
            changed_file = args[idx + 1]

    src_dir = BASE / 'blog'

    if slug:
        articles = [src_dir / (slug + '.md')]
    elif changed_file:
        paths = Path(changed_file).read_text().splitlines()
        articles = [Path(__file__).parent / p for p in paths if p.strip() and 'content/blog/' in p]
    else:
        articles = sorted(src_dir.glob('*.md'))

    total = 0
    for src_path in articles:
        if not src_path.exists():
            print(f'找不到：{src_path}')
            continue

        # 快速檢查：哪些語系有差異
        has_diff = []
        for lang in LANGS:
            dst = BASE / lang / src_path.name
            if not dst.exists():
                continue
            if sync_file(src_path, dst, dry_run=True, verbose=False):
                has_diff.append((lang, dst))

        if not has_diff:
            continue

        print(f'\n📄 {src_path.name}')
        for lang, dst in has_diff:
            print(f'   → {lang} 有差異')

        if dry_run:
            continue

        if not auto:
            ans = input('同步？[y/N] ').strip().lower()
            if ans != 'y':
                continue

        for lang, dst in has_diff:
            if sync_file(src_path, dst, dry_run=False, verbose=True):
                total += 1

    if dry_run:
        print('\n（dry-run，沒有實際修改）')
    else:
        print(f'\n完成，共更新 {total} 個翻譯檔案')


if __name__ == '__main__':
    main()
