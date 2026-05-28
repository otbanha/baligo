#!/usr/bin/env python3
import sys
import json
import re
from datetime import date

data = json.load(sys.stdin)
file_path = data.get("tool_input", {}).get("file_path", "")

if not re.search(r"src/content/.+\.(md|mdx)$", file_path):
    sys.exit(0)

today = date.today().strftime("%Y/%m/%d")
update_line = f"Update: {today}"

try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
except Exception:
    sys.exit(0)

lines = content.split("\n")

if not lines or lines[0].strip() != "---":
    sys.exit(0)

fm_end = -1
for i in range(1, len(lines)):
    if lines[i].strip() == "---":
        fm_end = i
        break

if fm_end == -1:
    sys.exit(0)

insert_at = fm_end + 1

# Look for existing Update: line within 5 lines after frontmatter
found = False
for i in range(insert_at, min(insert_at + 5, len(lines))):
    if lines[i].startswith("Update:"):
        if lines[i] == update_line:
            sys.exit(0)  # Already up to date
        lines[i] = update_line
        found = True
        break
    elif lines[i].strip() != "":
        break  # Hit real content, stop looking

if not found:
    lines.insert(insert_at, update_line)

with open(file_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
