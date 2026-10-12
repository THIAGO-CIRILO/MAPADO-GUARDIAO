#!/usr/bin/env python3
"""Prepare static site from the site archive bundled in this repository."""
from pathlib import Path
from zipfile import ZipFile
import shutil
import os
import json

root = Path(__file__).resolve().parent
archive = root / "mapa-guardiao-site.zip"
out = root / "public"
if not archive.exists():
    raise SystemExit("Site ZIP missing")
out.mkdir(exist_ok=True)
with ZipFile(archive) as z:
    files = [p for p in z.namelist() if not p.endswith("/")]
    entries = [p for p in files if Path(p).name == "index.html"]
    if not entries:
        raise SystemExit("No index.html found inside site ZIP")
    base = entries[0][:-len("index.html")]
    for filename in files:
        if not filename.startswith(base):
            continue
        rel = filename[len(base):]
        if not rel or ".." in Path(rel).parts or Path(rel).is_absolute():
            continue
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        with z.open(filename) as src, dest.open("wb") as target:
            shutil.copyfileobj(src, target)
if not (out / "index.html").exists():
    raise SystemExit("Build failed: public/index.html missing")

# The Supabase URL and publishable key are safe for browser configuration.
# Never expose the service-role key or Anthropic API key here.
client_config = {
    "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
    "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY", ""),
    "ADMIN_EMAIL": os.getenv("ADMIN_EMAIL", "contato.energystudio@gmail.com"),
}
(out / "config.js").write_text(
    "window.APP_CONFIG = " + json.dumps(client_config, ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
print("Prepared", len(list(out.rglob("*"))), "site paths; Supabase configured:",
      bool(client_config["SUPABASE_URL"] and client_config["SUPABASE_ANON_KEY"]))

