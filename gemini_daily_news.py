"""
峇里島每日旅遊情報 — Gemini AI 自動生成腳本

使用方式：
  python3 gemini_daily_news.py --test       # 只輸出到終端機，不寫入檔案
  python3 gemini_daily_news.py              # 生成文章並寫入 src/content/blog/

環境變數：
  GEMINI_API_KEY   — Google AI Studio 的免費 API Key

排程設計：
  - 每天雅加達時間 22:00 執行（UTC+7，即 UTC 15:00）
  - pubDate 設為隔天（明天），pubHour 設為 6
  - 凌晨翻譯排程會將文章翻譯為其他語系
"""

import json
import os
import re
import sys
import requests
from datetime import date, timedelta
from html.parser import HTMLParser

# ── 設定 ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR      = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR     = os.path.join(SCRIPT_DIR, "src/content/blog")
HISTORY_FILE    = os.path.join(SCRIPT_DIR, "scripts/topics-history.json")
GEMINI_MODELS   = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
]
GEMINI_API_BASE  = "https://generativelanguage.googleapis.com/v1beta/models"
HISTORY_MAX_DAYS = 30

NEWS_CATEGORIES = [
    "簽證與入境最新規定",
    "安全事件與旅遊警示",
    "天氣與自然災害",
    "節慶與文化活動",
    "交通與機場動態",
    "熱門景點新資訊",
    "餐廳與美食話題",
    "住宿與訂房注意事項",
    "消費物價與匯率",
    "當地法規與旅客須知",
    "台灣／香港／新加坡／馬來西亞與峇里島互動新聞",
    "峇里島直航航班動態",
]


FESTIVAL_GUIDE_URL = "https://gobaligo.id/blog/2026-bali-festival-guide/"


# ── 工具函式 ──────────────────────────────────────────────────────────────────

def fetch_festival_guide() -> str:
    """抓取 gobaligo.id 節慶日期指南，回傳純文字供 Gemini 查證"""
    class _TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts = []
            self._skip = False

        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style", "nav", "footer", "header"):
                self._skip = True

        def handle_endtag(self, tag):
            if tag in ("script", "style", "nav", "footer", "header"):
                self._skip = False

        def handle_data(self, data):
            if not self._skip and data.strip():
                self.parts.append(data.strip())

    try:
        resp = requests.get(FESTIVAL_GUIDE_URL, timeout=15)
        resp.raise_for_status()
        extractor = _TextExtractor()
        extractor.feed(resp.text)
        text = "\n".join(extractor.parts)
        # 只保留含節慶資訊的段落（約 6000 字元以內）
        return text[:6000]
    except Exception as e:
        print(f"   ⚠️ 無法抓取節慶指南（{e}），Gemini 將自行判斷")
        return ""


def load_history() -> dict:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"recent_topics": []}


def save_history(history: dict, new_topics: list):
    today = date.today().isoformat()
    history["recent_topics"].append({"date": today, "topics": new_topics})
    history["recent_topics"] = history["recent_topics"][-HISTORY_MAX_DAYS:]
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def get_recent_topics(history: dict) -> list:
    topics = []
    for entry in history["recent_topics"][-7:]:
        topics.extend(entry.get("topics", []))
    return topics


def build_prompt(recent_topics: list, festival_guide: str = "") -> str:
    today    = date.today()
    tomorrow = today + timedelta(days=1)
    today_str  = today.strftime("%Y 年 %m 月 %d 日")
    week7_str  = (today + timedelta(days=7)).strftime("%Y 年 %m 月 %d 日")
    pub_date   = tomorrow.strftime("%Y/%m/%d")
    is_sunday  = (today.weekday() == 6)   # 0=Mon … 6=Sun
    recent_str = "、".join(recent_topics[:20]) if recent_topics else "（無）"
    festival_section = festival_guide if festival_guide else "（無法取得，請保守處理節慶日期）"

    # ── 共用：節慶日期警告區塊 ─────────────────────────────────────────────
    festival_warning = f"""**⚠️ 重要：節慶與活動日期必須以下方參考資料為準**
節慶相關內容的日期容易出錯，請務必對照「2026 峇里島節慶日期參考」查證，不得憑記憶猜測。
若參考資料中找不到該節慶，請只寫「約在 X 月」等模糊描述，不要捏造日期。
只要文章內容提到任何節慶或年度活動預告，請在該段落結尾加入（Markdown 連結格式）：
「想了解 2026 年峇里島完整節慶日期，可參考：[2026 峇里島節慶完整指南](https://gobaligo.id/blog/2026-bali-festival-guide/)」

**2026 峇里島節慶日期參考（來源：gobaligo.id，請以此為準）：**
{festival_section}"""

    # ── 禮拜天：全部寫節慶預告 ────────────────────────────────────────────
    if is_sunday:
        return f"""你是一位專業的峇里島旅遊媒體編輯，專為華語旅客（台灣、香港、新加坡、馬來西亞）服務。

今天（寫稿日期）：{today_str}（星期日）
文章發布日期：{pub_date}

**今日任務：本週節慶活動預告專題（5 則全部寫節慶）**
從下方節慶參考資料中，挑選接下來最值得關注的 5 個節慶或活動，撰寫預告介紹。
優先選擇日期較近、對一般遊客有觀光價值的節慶。
每則約 150-200 字，介紹節慶背景、活動內容、地點、對旅客的影響與建議。
語氣友善，全文使用繁體中文，加上 emoji。

{festival_warning}

---

請嚴格按照以下格式輸出，不要加任何前言或後記，不要用 markdown 代碼塊包住整個輸出：

ARTICLE_SUBTITLE: （本週最重要的 3 個節慶名稱，以頓號分隔）
ARTICLE_SLUG: bali-news-{tomorrow.strftime('%Y-%m-%d')}
ARTICLE_DESCRIPTION: （一句話描述本週節慶重點，約 50-80 字，適合 SEO）
TOPICS_JSON: ["節慶1名稱", "節慶2名稱", "節慶3名稱", "節慶4名稱", "節慶5名稱"]

---

（直接從第一則節慶開始，不要加任何總標題）

## 1. [節慶一名稱＋日期] [相關 emoji]

[節慶一介紹]

## 2. [節慶二名稱＋日期] [相關 emoji]

[節慶二介紹]

## 3. [節慶三名稱＋日期] [相關 emoji]

[節慶三介紹]

## 4. [節慶四名稱＋日期] [相關 emoji]

[節慶四介紹]

## 5. [節慶五名稱＋日期] [相關 emoji]

[節慶五介紹]

---

## 小結

（用 2-3 句話總結本週節慶亮點，鼓勵讀者收藏並提前規劃行程）
"""

    # ── 禮拜一至禮拜六：新聞為主，7 天內有節慶可作第 5 則預告 ───────────────
    return f"""你是一位專業的峇里島旅遊媒體編輯，每天為華語旅客（台灣、香港、新加坡、馬來西亞）整理最新的峇里島旅遊話題與新聞資訊。

今天（寫稿日期）：{today_str}
文章發布日期：{pub_date}

**今日任務：旅遊話題 + 新聞整理**
整理 5 則峇里島旅遊相關的「話題 + 新聞」，內容必須對遊客有實用參考價值。
涵蓋範圍包括：
- 峇里島本地最新動態、旅遊政策、安全警示
- 台灣、香港、新加坡、馬來西亞與峇里島之間的互動新聞（直航班次、入境新規、旅遊合作等）
- 各地旅客前往峇里島的實用資訊與差異提醒
- 季節性資訊、近期事件
語氣友善，全文使用繁體中文。

**第 5 則的處理規則：**
請檢查下方節慶參考資料，若 {today_str} 至 {week7_str} 之間有即將發生的節慶或活動，
請將第 5 則改寫為該節慶的預告介紹（含日期、地點、對遊客的建議）。
若 7 天內沒有節慶，第 5 則照常寫一般旅遊話題。

{festival_warning}

---

**近期已出現過的話題（請避免重複，選擇不同角度）：**
{recent_str}

**可選話題類別（不限定，可混搭）：**
{chr(10).join(f'- {c}' for c in NEWS_CATEGORIES)}

---

請嚴格按照以下格式輸出，不要加任何前言或後記，不要用 markdown 代碼塊包住整個輸出：

ARTICLE_SUBTITLE: （本篇 3 個最重要的話題關鍵字，以頓號分隔）
ARTICLE_SLUG: bali-news-{tomorrow.strftime('%Y-%m-%d')}
ARTICLE_DESCRIPTION: （一句話描述本篇重點，約 50-80 字，包含主要話題關鍵字，適合 SEO）
TOPICS_JSON: ["話題1關鍵字", "話題2關鍵字", "話題3關鍵字", "話題4關鍵字", "話題5關鍵字"]

---

（直接從第一則新聞開始，不要加任何總標題）

## 1. [話題一標題] [相關 emoji]

[話題一內容]

## 2. [話題二標題] [相關 emoji]

[話題二內容]

## 3. [話題三標題] [相關 emoji]

[話題三內容]

## 4. [話題四標題] [相關 emoji]

[話題四內容]

## 5. [話題五標題] [相關 emoji]

[話題五內容]

---

## 小結

（用 2-3 句話總結今日重點，鼓勵讀者收藏並分享峇里島旅遊問題）
"""


def call_gemini(api_key: str, prompt: str) -> str:
    import time

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
        }
    }

    for model in GEMINI_MODELS:
        url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"
        for attempt in range(3):
            try:
                print(f"   嘗試模型 {model}（第 {attempt+1} 次）...")
                resp = requests.post(url, json=payload, timeout=60)
                if resp.status_code == 429:
                    wait = 10 * (attempt + 1)
                    print(f"   429 rate limit，等待 {wait} 秒後重試...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except requests.exceptions.HTTPError as e:
                if attempt == 2:
                    print(f"   ⚠️ {model} 失敗：{e}")
                    break
                time.sleep(5)

    raise RuntimeError("所有模型都無法呼叫，請確認 API Key 是否正確")


def parse_response(text: str) -> dict:
    tomorrow = date.today() + timedelta(days=1)
    lines    = text.strip().split("\n")
    meta     = {}
    body_lines = []
    in_body  = False

    for line in lines:
        if not in_body:
            for key in ["ARTICLE_SUBTITLE", "ARTICLE_SLUG", "ARTICLE_DESCRIPTION", "TOPICS_JSON"]:
                if line.startswith(f"{key}:"):
                    meta[key] = line[len(f"{key}:"):].strip()
                    break
            if line.startswith("## "):
                in_body = True
                body_lines.append(line)
        else:
            body_lines.append(line)

    subtitle = meta.get("ARTICLE_SUBTITLE", "旅遊資訊整理")
    pub_date_str = tomorrow.strftime("%Y/%m/%d")
    title = f"【峇里島旅遊情報】{pub_date_str}：{subtitle}"

    topics = []
    if "TOPICS_JSON" in meta:
        try:
            topics = json.loads(meta["TOPICS_JSON"])
        except json.JSONDecodeError:
            found = re.findall(r'"([^"]+)"', meta["TOPICS_JSON"])
            topics = found

    return {
        "title":       title,
        "slug":        meta.get("ARTICLE_SLUG", f"bali-news-{tomorrow.isoformat()}"),
        "description": meta.get("ARTICLE_DESCRIPTION", ""),
        "topics":      topics,
        "body":        "\n".join(body_lines).strip(),
    }


def build_markdown(parsed: dict) -> str:
    tomorrow     = date.today() + timedelta(days=1)
    pub_date_str = tomorrow.isoformat()
    tags         = parsed["topics"] + ["峇里島旅遊資訊", "峇里島最新消息", "Bali travel news"]
    tags_yaml    = "\n".join(f"  - {t}" for t in tags)

    return f"""---
title: "{parsed['title']}"
slug: {parsed['slug']}
description: "{parsed['description']}"
pubDate: {pub_date_str}
pubHour: 6
category:
  - 新聞存檔
tags:
{tags_yaml}
---

{parsed['body']}
"""


def write_article(content: str, slug: str) -> str:
    tomorrow = date.today() + timedelta(days=1)
    filename = f"{tomorrow.isoformat()}-{slug}.md"
    filepath = os.path.join(CONTENT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath


# ── 主程式 ────────────────────────────────────────────────────────────────────

def main():
    test_mode = "--test" in sys.argv

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("❌ 請設定環境變數 GEMINI_API_KEY")
        print("   export GEMINI_API_KEY='你的 API Key'")
        sys.exit(1)

    print("📖 載入話題歷史...")
    history       = load_history()
    recent_topics = get_recent_topics(history)
    print(f"   近 7 天已有 {len(recent_topics)} 個話題記錄")

    print("📅 抓取節慶日期指南...")
    festival_guide = fetch_festival_guide()
    if festival_guide:
        print(f"   ✅ 取得節慶資料（{len(festival_guide)} 字元）")

    print("🤖 呼叫 Gemini API...")
    prompt   = build_prompt(recent_topics, festival_guide)
    raw_text = call_gemini(api_key, prompt)

    print("🔍 解析輸出...")
    parsed   = parse_response(raw_text)
    markdown = build_markdown(parsed)

    if test_mode:
        print("\n" + "="*60)
        print("【測試模式：只顯示，不寫入檔案】")
        print("="*60)
        print(markdown)
        print("="*60)
        print(f"\n✅ 識別到話題：{parsed['topics']}")
    else:
        filepath = write_article(markdown, parsed["slug"])
        save_history(history, parsed["topics"])
        print(f"✅ 文章已寫入：{filepath}")
        print(f"   話題：{parsed['topics']}")


if __name__ == "__main__":
    main()
