#!/usr/bin/env python3
"""
sync_blocks.py
同步 src/content/blocks/ 內容區塊的多語言翻譯。

功能：
  1. 偵測已修改的來源 block (透過 _srcHash 比對)
  2. 只更新 hash 的檔案 → 直接更新 _srcHash
  3. zh-cn 有 ⚠️ 未翻譯項目 → 用 OpenCC + 詞彙表轉換
  4. 補充缺少的新項目（各語言翻譯版本）
  5. 修正 zh-hk 錯誤 URL
  6. 更新所有 _srcHash

用法：
  python3 sync_blocks.py            # 執行所有更新
  python3 sync_blocks.py --dry-run  # 只顯示，不修改
"""

import hashlib
import re
import sys
from pathlib import Path

try:
    import opencc
    HAS_OPENCC = True
except ImportError:
    HAS_OPENCC = False
    print("⚠️  opencc-python-reimplemented 未安裝，zh-cn 翻譯將跳過")

BASE = Path(__file__).parent / 'src/content/blocks'
LANGS = ['en', 'zh-cn', 'zh-hk']
DRY_RUN = '--dry-run' in sys.argv


# ─── zh-cn 詞彙修正表（OpenCC t2s 後再套用）─────────────────
ZH_CN_VOCAB = [
    ('峇里岛',  '巴厘岛'),
    ('峇里島',  '巴厘岛'),   # 防止漏網
    ('渡假村',  '度假村'),
    ('饭店',   '酒店'),     # 大陸住宿語境用 酒店
]

# ─── 需要補充的新項目（各語言翻譯）────────────────────────────
# 格式：{source_filename: {lang: translated_line}}
NEW_ITEMS = {
    '住宿.md': {
        'zh-tw': '- [【2026 努沙杜瓦新飯店】Paradisus by Meliá Bali ：亞洲首間奢華全包式度假村](/blog/Paradisus-by-Melia-Bali/)',
        'en':    '- [Paradisus by Meliá Bali: Asia\'s First Luxury All-Inclusive Resort (Nusa Dua, 2026)](/blog/Paradisus-by-Melia-Bali/)',
        'zh-cn': '- [【2026年努沙杜瓦新酒店】Paradisus by Meliá Bali：亚洲首间奢华全包式度假村](/blog/Paradisus-by-Melia-Bali/)',
        'zh-hk': '- [【2026 努沙杜瓦新酒店】Paradisus by Meliá Bali：亞洲首間奢華全包式度假村](/blog/Paradisus-by-Melia-Bali/)',
    },
    '戶外.md': {
        'zh-tw': '- [海豚樂園 Bali Exotic Marine Park：與海豚親密互動，親子必訪樂園](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'en':    '- [Bali Exotic Marine Park: Swim with Dolphins — Must-Visit Family Experience](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'zh-cn': '- [海豚乐园 Bali Exotic Marine Park：与海豚亲密互动，亲子必访乐园](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'zh-hk': '- [海豚樂園 Bali Exotic Marine Park：與海豚親密互動，親子必訪樂園](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
    },
    '親子.md': {
        'zh-tw': '- [海豚樂園 Bali Exotic Marine Park：與海豚親密互動，親子必訪樂園](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'en':    '- [Bali Exotic Marine Park: Swim with Dolphins — Must-Visit Family Experience](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'zh-cn': '- [海豚乐园 Bali Exotic Marine Park：与海豚亲密互动，亲子必访乐园](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
        'zh-hk': '- [海豚樂園 Bali Exotic Marine Park：與海豚親密互動，親子必訪樂園](https://tw.trip.com/travel-guide/attraction/bali/bali-exotic-marine-park-104151065?curr=TWD&locale=zh-TW&poiType=3&ext-searchpage=1&Allianceid=6817581&SID=311634184&trip_sub1=&trip_sub3=D17259713)',
    },
}

# zh-hk 錯誤 URL 修正
ZH_HK_URL_FIXES = {
    '住宿.md': [
        ('https://gobaligo.id/admin/', '/blog/kuta-beach-hotels/'),
    ],
}


# ─── 工具函式 ─────────────────────────────────────────────

def src_hash(text: str) -> str:
    return hashlib.md5(text.encode('utf-8')).hexdigest()


def get_stored_hash(text: str):
    m = re.search(r'^_srcHash:\s*(\S+)', text, re.MULTILINE)
    return m.group(1) if m else None


def set_hash_in_frontmatter(text: str, new_hash: str) -> str:
    if re.search(r'^_srcHash:', text, re.MULTILINE):
        return re.sub(r'^_srcHash:\s*\S+', f'_srcHash: {new_hash}', text, flags=re.MULTILINE)
    # 沒有 _srcHash → 在 lang: 行後插入，或在 --- 前插入
    if re.search(r'^lang:', text, re.MULTILINE):
        return re.sub(r'^(lang:\s*\S+)', r'\1\n_srcHash: ' + new_hash, text, flags=re.MULTILINE, count=1)
    # 在第二個 --- 前插入（frontmatter 結尾前）
    parts = text.split('---', 2)
    if len(parts) >= 2:
        parts[1] = parts[1].rstrip() + f'\n_srcHash: {new_hash}\n'
        return '---'.join(parts)
    return text


def translate_zh_tw_to_zh_cn(text: str) -> str:
    if not HAS_OPENCC:
        return text
    c = opencc.OpenCC('t2s')
    result = c.convert(text)
    for old, new in ZH_CN_VOCAB:
        result = result.replace(old, new)
    return result


def translate_warning_lines_zh_cn(content: str) -> tuple[str, int]:
    """把 zh-cn 檔案中的 ⚠️ 行翻譯並移除 ⚠️ 前綴。返回 (新內容, 修改行數)。"""
    lines = content.split('\n')
    count = 0
    new_lines = []
    for line in lines:
        if '⚠️' in line:
            # 提取 ⚠️ 後面的鏈接文字部分翻譯，URL 不動
            # 格式: - ⚠️ [繁體中文文字](url)
            m = re.match(r'^(-\s*)⚠️\s*(\[)([^\]]+)(\]\(.+\))(.*)$', line)
            if m:
                prefix, lb, zh_tw_text, url_part, suffix = m.groups()
                zh_cn_text = translate_zh_tw_to_zh_cn(zh_tw_text)
                new_line = f'{prefix}{lb}{zh_cn_text}{url_part}{suffix}'
                new_lines.append(new_line)
                count += 1
            else:
                # 無法匹配，直接移除 ⚠️
                new_lines.append(line.replace('⚠️ ', '').replace('⚠️', ''))
        else:
            new_lines.append(line)
    return '\n'.join(new_lines), count


def item_url(line: str):
    """從 markdown 鏈接行提取 URL。"""
    m = re.search(r'\]\(([^)]+)\)', line)
    return m.group(1) if m else None


def translation_already_has(content: str, new_item: str) -> bool:
    """檢查翻譯檔案是否已有某個項目（透過 URL 比對）。"""
    url = item_url(new_item)
    if not url:
        return False
    # 將 URL 中的特殊字符轉義，以正確匹配
    return url in content


def write_file(path: Path, content: str, label: str):
    if DRY_RUN:
        print(f'  [DRY] 會寫入: {path.relative_to(BASE.parent.parent.parent)}')
    else:
        path.write_text(content, encoding='utf-8')
        print(f'  ✓ 寫入: {path.relative_to(BASE.parent.parent.parent)}')


# ─── 主處理邏輯 ────────────────────────────────────────────

def process_translation_file(src_path: Path, lang: str, src_text: str, new_src_hash: str):
    """處理單一翻譯檔案，回傳 True 表示有修改。"""
    lang_map = {'en': 'en', 'zh-cn': 'zh-cn', 'zh-hk': 'zh-hk'}
    dst_path = BASE / lang / src_path.name
    changes = []

    if not dst_path.exists():
        print(f'  跳過（不存在）: {lang}/{src_path.name}')
        return False

    content = dst_path.read_text('utf-8')
    stored = get_stored_hash(content)
    new_content = content

    # 1. 修正 zh-hk 錯誤 URL
    if lang == 'zh-hk' and src_path.name in ZH_HK_URL_FIXES:
        for old_url, new_url in ZH_HK_URL_FIXES[src_path.name]:
            if old_url in new_content:
                new_content = new_content.replace(old_url, new_url)
                changes.append(f'修正錯誤 URL: {old_url[:30]}...')

    # 2. 翻譯 zh-cn 的 ⚠️ 項目
    if lang == 'zh-cn' and '⚠️' in new_content:
        translated, cnt = translate_warning_lines_zh_cn(new_content)
        if cnt > 0:
            new_content = translated
            changes.append(f'翻譯 {cnt} 個 ⚠️ 項目')

    # 3. 補充缺少的新項目
    if src_path.name in NEW_ITEMS:
        new_item = NEW_ITEMS[src_path.name].get(lang)
        if new_item and not translation_already_has(new_content, new_item):
            # 加到末尾（在最後一個非空行後）
            stripped = new_content.rstrip()
            new_content = stripped + '\n' + new_item + '\n'
            changes.append(f'新增: {new_item[:60]}...')

    # 4. 更新 _srcHash
    if stored != new_src_hash or new_content != content:
        new_content = set_hash_in_frontmatter(new_content, new_src_hash)
        if stored != new_src_hash:
            changes.append(f'更新 _srcHash ({(stored or "無")[:8]}... → {new_src_hash[:8]}...)')

    if new_content == content:
        return False

    print(f'\n  {lang}/{src_path.name}')
    for c in changes:
        print(f'    • {c}')

    write_file(dst_path, new_content, f'{lang}/{src_path.name}')
    return True


def main():
    src_files = sorted(BASE.glob('*.md'))
    total_updated = 0
    total_skipped = 0

    print(f'掃描 {len(src_files)} 個來源 block 檔案...\n')

    for src_path in src_files:
        src_text = src_path.read_text('utf-8')
        new_hash = src_hash(src_text)

        file_needs_work = False
        for lang in LANGS:
            dst = BASE / lang / src_path.name
            if not dst.exists():
                continue
            dst_text = dst.read_text('utf-8')
            stored = get_stored_hash(dst_text)
            has_warning = '⚠️' in dst_text
            has_url_fix = (lang == 'zh-hk' and src_path.name in ZH_HK_URL_FIXES and
                           any(old in dst_text for old, _ in ZH_HK_URL_FIXES.get(src_path.name, [])))
            needs_new_item = (src_path.name in NEW_ITEMS and
                              NEW_ITEMS[src_path.name].get(lang) and
                              not translation_already_has(dst_text, NEW_ITEMS[src_path.name][lang]))

            if stored != new_hash or has_warning or has_url_fix or needs_new_item:
                file_needs_work = True
                break

        if not file_needs_work:
            total_skipped += 1
            continue

        print(f'📄 {src_path.name}')
        for lang in LANGS:
            if process_translation_file(src_path, lang, src_text, new_hash):
                total_updated += 1

    print(f'\n{"[DRY RUN] " if DRY_RUN else ""}完成：更新 {total_updated} 個翻譯檔案，略過 {total_skipped} 個（無需更新）')


if __name__ == '__main__':
    main()
