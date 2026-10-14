#!/usr/bin/env python3
"""Bundle src/ into a single self-contained index.html (deploy this file to GitHub Pages)."""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
order = ["data.js", "charts.js", "pages.js", "app.js"]   # load order matters

html = (src / "template.html").read_text()
html = html.replace("/*{{STYLE}}*/", (src / "styles.css").read_text())
html = html.replace("/*{{SCRIPT}}*/", "\n".join((src / f).read_text() for f in order))
(root / "index.html").write_text(html)
print(f"Wrote index.html ({len(html):,} bytes)")
