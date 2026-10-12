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


def use_real_auth(html, filename):
    marker = "<script>window.APP_CONFIG={SUPABASE_URL:'demo'"
    start = html.find(marker)
    if start < 0:
        # An archive which already loads config.js and the real SDK needs no rewriting.
        if '/config.js' in html and 'supabase-js' in html:
            return html
        # Older static archives may lack the new config script altogether.
        scripts = ('<script src="/config.js"></script>\\n'
                   '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\\n')
        if '</head>' in html:
            return html.replace('</head>', scripts + '</head>', 1)
        raise SystemExit("Unable to add configuration to " + filename)
    middle = html.find("</script>", start) + len("</script>")
    next_script = html.find("<script>", middle)
    if next_script < 0:
        raise SystemExit("Missing example script in " + filename)
    end = html.find("</script>", next_script)
    if end < 0:
        raise SystemExit("Example script did not close in " + filename)
    end += len("</script>")
    scripts = ('<script src="/config.js"></script>\n'
               '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>')
    html = html[:start] + scripts + html[end:]
    # Remove obsolete demonstration banner, fake-account instructions and reset link.
    banner_start = html.find('<div id="demoBar">')
    if banner_start >= 0:
        banner_end = html.find('</style>', banner_start)
        if banner_end < 0:
            raise SystemExit("Malformed demo banner in " + filename)
        html = html[:banner_start] + html[banner_end + len('</style>'):]
    return html

# Use the current tracked wizard.js, not the outdated copy embedded in the ZIP.
index_page = out / "index.html"
html = index_page.read_text(encoding="utf-8")
wizard_marker = "/* ===== MAPA DO GUARDIÃO · app em etapas, login (Supabase) e geração (servidor) ===== */"
wizard_pos = html.find(wizard_marker)
if wizard_pos < 0:
    raise SystemExit("Could not locate the wizard script in the site archive")
open_tag = html.rfind("<script>", 0, wizard_pos)
close_tag = html.find("</script>", wizard_pos)
if open_tag < 0 or close_tag < 0:
    raise SystemExit("Could not safely replace wizard script")
wizard_source = (root / "wizard.js").read_text(encoding="utf-8")
html = html[:open_tag] + "<script>\n" + wizard_source + "\n</script>" + html[close_tag + len("</script>"):]
index_page.write_text(html, encoding="utf-8")
# Stop the deployment if a literal backslash-n ever replaces a script newline again.
if "<script>" + chr(92) + "n" in html:
    raise SystemExit("Invalid JavaScript script delimiter in generated HTML")
if html.count("/* ===== MAPA DO GUARDIÃO · app em etapas, login (Supabase) e geração (servidor) ===== */") != 1:
    raise SystemExit("Wizard must be embedded exactly once")

for filename in ("index.html", "admin.html"):
    file = out / filename
    if file.exists():
        file.write_text(use_real_auth(file.read_text(encoding="utf-8"), filename), encoding="utf-8")

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
# The sales page uses the creator's actual photograph from this repository.
photo = root / "foto-thiago.webp"
sales_page = out / "venda.html"
if not photo.exists() or not sales_page.exists():
    raise SystemExit("Missing creator photograph or sales page")
shutil.copyfile(photo, out / photo.name)
sales_html = sales_page.read_text(encoding="utf-8")
placeholder = '<div class="retrato" id="fotoAutor" role="img" aria-label="Espaço para a foto do Thiago">COLOQUE AQUI<br>A SUA FOTO</div>'
if sales_html.count(placeholder) != 1:
    raise SystemExit("Cannot locate the creator photograph placeholder in the sales page")
replacement = '<div class="retrato" id="fotoAutor"><img src="/foto-thiago.webp" alt="Thiago Cervi, criador do Mapa do Guardião" width="320" height="400" loading="lazy" decoding="async"></div>'
sales_html = sales_html.replace(placeholder, replacement, 1)
sales_css = '#fotoAutor{padding:0;display:block}#fotoAutor img{width:100%;height:100%;margin:0;object-fit:cover;object-position:center 34%}'
sales_html = sales_html.replace("</style>", sales_css + "\n</style>", 1)
# Connect all purchase buttons to the verified Kiwify checkout.
checkout_url = "https://pay.kiwify.com.br/vT6ZxZd"
old_checkout = "linkPagamento: '#'"
if sales_html.count(old_checkout) != 1:
    raise SystemExit("Unexpected Kiwify checkout configuration in sales page")
sales_html = sales_html.replace(old_checkout, "linkPagamento: '" + checkout_url + "'", 1)
# No price was supplied; avoid displaying placeholder R$ XX amounts as real prices.
sales_html = sales_html.replace(
    "var p = CONFIG.parcelas + 'x de <b>' + CONFIG.valorParcela + '</b> ou ' + CONFIG.valorVista + ' à vista';",
    "var p = 'Veja o valor e as opções de pagamento no checkout';"
)
sales_html = sales_html.replace(
    "e.innerHTML = CONFIG.parcelas + 'x de ' + CONFIG.valorParcela;",
    "e.textContent = 'Confira as opções de parcelamento no checkout';"
)
sales_html = sales_html.replace(
    "e.textContent = 'ou ' + CONFIG.valorVista + ' à vista';",
    "e.textContent = 'Confira o valor à vista no checkout';"
)

# Give purchasers accurate account-access instructions; checkout and app are separate.
sales_html = sales_html.replace(
    "Assim que o pagamento for confirmado, você recebe por e-mail o link para criar a sua conta e entrar no seu painel.",
    "Assim que o pagamento for confirmado, acesse mapado-guardiao.vercel.app e crie sua conta com o mesmo e-mail informado na compra na Kiwify.",
    1,
)
sales_html = sales_html.replace(
    "Por e-mail, logo depois da confirmação do pagamento. Você cria a sua senha e entra pelo celular ou pelo computador.",
    "Depois de pagar, entre em mapado-guardiao.vercel.app e crie sua conta com o mesmo e-mail da compra. Assim que a Kiwify confirmar o pagamento, seu acesso será liberado.",
    1,
)
sales_page.write_text(sales_html, encoding="utf-8")

print("Prepared", len(list(out.rglob("*"))), "site paths; Supabase configured:",
      bool(client_config["SUPABASE_URL"] and client_config["SUPABASE_ANON_KEY"]))

