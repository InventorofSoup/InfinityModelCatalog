"""Build the public GitHub Pages copy of the tracker into ./docs.

The private catalog_data.js carries the maintainer's own collection (qty,
owned flags, and the AVA fields derived from them). The public copy blanks all
of that so every visitor starts from an empty collection.

Run after extract.py:   python build_public.py
"""
import json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "docs"

text = (ROOT / "catalog_data.js").read_text(encoding="utf-8")
m = re.search(r"const CATALOG_DATA = (\[.*\]);", text, re.S)
data = json.loads(m.group(1))

for r in data:
    r["have"] = False
    r["qty"] = 0
    r["painted"] = "Unpainted"
    r["ownedUnitTotal"] = 0      # derived from the maintainer's quantities
    r["avaStatus"] = ""          # ditto ("OVER AVA" etc.)
    r["reference"] = None

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
(OUT / "catalog_data.js").write_text(
    "const CATALOG_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
for f in ("index.html", "app.js", "style.css"):
    shutil.copy(ROOT / f, OUT / f)
shutil.copytree(ROOT / "images", OUT / "images")
(OUT / ".nojekyll").write_text("")

leaks = sum(1 for r in data if r["qty"] or r["have"] or r["ownedUnitTotal"])
print(f"public build: {len(data)} rows -> {OUT}  (owned-data leaks: {leaks})")
sys.exit(1 if leaks else 0)
