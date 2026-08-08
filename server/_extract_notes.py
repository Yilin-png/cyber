# -*- coding: utf-8 -*-
from pathlib import Path
import re

root = Path(__file__).resolve().parent
html = (root.parent / "app" / "gathering-001.html").read_text(encoding="utf-8")
m = re.search(r'<main class="doc">(.*?)</main>', html, re.S)
if not m:
    raise SystemExit("no main.doc")
body = m.group(1).strip()
out = root / "content" / "gatherings"
out.mkdir(parents=True, exist_ok=True)
(out / "001.html").write_text(body, encoding="utf-8")
print("extracted", len(body), "chars ->", out / "001.html")
