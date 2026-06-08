#!/usr/bin/env python3
"""
清理文章中的舊促銷區塊
"""

import os
import re
from pathlib import Path

BLOG_DIR = "src/content/blog"

def clean_content(content):
    # 1. 刪除「底下還有峇里島究極攻略」區塊（到下一個 ## 或文章結束）
    content = re.sub(
        r'###\s*底下還有峇里島究極攻略.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 2. 刪除「加入峇里島旅遊攻略」區塊
    content = re.sub(
        r'##\s*📩\s*[\*]*加入「峇里島旅遊攻略」.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 3. 刪除「訂閱峇里島旅遊攻略」區塊
    content = re.sub(
        r'##\s*📩?\s*[\*]*訂閱「峇里島旅遊攻略」.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 4. 刪除「我們的社團」區塊
    content = re.sub(
        r'###\s*我們的社團.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 5. 刪除「其他區域的住宿推薦」區塊
    content = re.sub(
        r'##\s*其他區域的住宿推薦.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 6. 刪除「峇里島優惠行程」區塊
    content = re.sub(
        r'[👉🏻]*\s*峇里島優惠行程\s*[👉🏻]*.*?(?=\n##|\Z)',
        '', content, flags=re.DOTALL
    )

    # 清理多餘的空行
    content = re.sub(r'\n{4,}', '\n\n\n', content)
    content = content.strip() + '\n'

    return content

def main():
    blog_path = Path(BLOG_DIR)
    files = list(blog_path.glob('*.md'))
    print(f"共找到 {len(files)} 篇文章")

    changed = 0
    for md_file in files:
        with open(md_file, 'r', encoding='utf-8') as f:
            original = f.read()

        cleaned = clean_content(original)

        if cleaned != original:
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(cleaned)
            changed += 1
            print(f"✅ 已清理：{md_file.name}")

    print(f"\n完成！共清理 {changed} 篇文章")

if __name__ == "__main__":
    main()