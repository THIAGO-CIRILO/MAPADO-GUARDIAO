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

# Shared intake, page model, and PDF layout for the personalized 20-page edition.
for filename in ('consulta-entrada.js','consulta-contexto.js','consulta-modelo.js','consulta-pdf-layout.js','consulta-pdf-browser.js','consulta-view.js','consulta.css','meditacao.html'):
    shutil.copyfile(root / filename, out / filename)
shutil.copytree(root / 'assets/fonts', out / 'fonts', dirs_exist_ok=True)
shutil.copytree(root / 'assets/audio', out / 'audio', dirs_exist_ok=True)

# Use the current tracked wizard.js, not the outdated copy embedded in the ZIP.
index_page = out / "index.html"
html = index_page.read_text(encoding="utf-8")
html=html.replace('<meta name="theme-color" content="#1D6B66">','<meta name="theme-color" content="#B04F1E">',1)
manifest_file=out/'manifest.json'
manifest=json.loads(manifest_file.read_text(encoding='utf-8'))
manifest.update(theme_color='#B04F1E',background_color='#F0E8DB')
manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
old_description='<meta name="description" content="Em 10 minutos, descubra o seu lugar de potência para ganhar ainda mais dinheiro. Mapa do Guardião, do Campo Guardião.">'
if html.count(old_description)!=1:raise SystemExit('Unexpected app description in the archive')
html=html.replace(old_description,'<meta name="description" content="Traga uma questão, responda ao teste e receba um mapa pessoal de 20 páginas, com recursos, 12 áreas da vida e um próximo passo possível.">',1)
# Prepare a standalone quiz motor for the administrator from the public site archive.
quiz_begin = html.find('const GT_G = {')
quiz_finish = html.find('const gtDraft =', quiz_begin)
if quiz_begin < 0 or quiz_finish <= quiz_begin:
    raise SystemExit('Quiz source not found in public site')
quiz_js = html[quiz_begin:quiz_finish]
for label in ('const GT_Q =', 'const GT_LINK =', 'function gtScore(', 'const GT_W =', 'const GT_P ='):
    if label not in quiz_js:
        raise SystemExit('Incomplete quiz source: ' + label)
(out / 'questionario-motor.js').write_text(quiz_js + '\nwindow.GuardiaoQuestionario = { questions: GT_Q, score: gtScore, guardians: GT_G, wounds: GT_W, potentials: GT_P, learning: GT_L, work: GT_M };\n', encoding='utf-8')
import subprocess
verify_quiz = 'global.window={}; require(process.argv[1]); const q=window.GuardiaoQuestionario; if(!q||!Array.isArray(q.questions)||q.questions.length!==10||typeof q.score!=="function") throw Error("motor do teste incompleto"); const sample={};q.questions.forEach((_,i)=>sample[i]=0);const s=q.score(sample);if(!s.rg?.length||!s.rp?.length)throw Error("pontuacao invalida");'
subprocess.run(['node','-e',verify_quiz,str(out / 'questionario-motor.js')], check=True)

wizard_marker = "/* ===== MAPA DO GUARDIÃO · app em etapas, login (Supabase) e geração (servidor) ===== */"
wizard_pos = html.find(wizard_marker)
if wizard_pos < 0:
    raise SystemExit("Could not locate the wizard script in the site archive")
open_tag = html.rfind("<script>", 0, wizard_pos)
close_tag = html.find("</script>", wizard_pos)
if open_tag < 0 or close_tag < 0:
    raise SystemExit("Could not safely replace wizard script")
wizard_source = (root / "wizard.js").read_text(encoding="utf-8")
consulta_scripts = ''.join('<script src="/'+name+'?v='+('20261102-sintese1' if name in ('consulta-modelo.js','consulta-view.js') else '20261102-resposta3' if name=='consulta-pdf-layout.js' else '20261102-contexto3')+'"></script>\n' for name in ('consulta-entrada.js','consulta-contexto.js','consulta-modelo.js','consulta-pdf-layout.js','consulta-pdf-browser.js','consulta-view.js'))

html = html[:open_tag] + "<script>\n" + wizard_source + "\n</script>" + html[close_tag + len("</script>"):]
html = html.replace('</head>', '<link rel="stylesheet" href="/consulta.css?v=20261102-sintese1"></head>', 1)

# Keep the detailed on-screen reading but remove the repetitive disclaimer embedded
# in the old archive. Editorial responsibility is handled by the new server prompt.
old_disclaimer = ('Este mapa é um convite à reflexão, não um diagnóstico nem uma previsão. '
                  'As ideias do Guardião e das feridas de infância são lentes simbólicas para '
                  'conversar sobre os seus padrões. Não substituem acompanhamento de saúde '
                  'mental, jurídico ou financeiro. Gerado em ')
if html.count(old_disclaimer) != 1:
    raise SystemExit("Expected one archived on-screen disclaimer")
html = html.replace(old_disclaimer, 'Leitura pessoal do Campo Guardião. Preparado em ', 1)
# Remove the legacy retake button while preserving the PDF download.
redo_button = '<button id="gtRedo" class="ghost" type="button">Refazer o teste</button>'
if html.count(redo_button) != 1:
    raise SystemExit("Unexpected number of retake buttons in original site")
html = html.replace(redo_button, '', 1)
# The same essential 14/18-page edition must be used in the browser
# when the PDF server temporarily fails. Never deploy the old 29/35-page
# composer that expanded to 53+ pages through appended text continuations.
pdf_source = root / "pdf-essencial.js"
if not pdf_source.is_file():
    raise SystemExit("Missing the essential PDF composer")
(out / "pdf-essencial.js").write_text(pdf_source.read_text(encoding="utf-8"), encoding="utf-8")
# O cliente pode salvar a leitura COMPLETA pela impressão nativa (sem IA / geração).
print_source = root / "imprimir-leitura.js"
if not print_source.is_file():
    raise SystemExit("Missing full-page print module")
shutil.copyfile(print_source,out / "imprimir-leitura.js")
legacy_pdf = out / "pdf29.js"
if legacy_pdf.exists():
    legacy_pdf.unlink()
if html.count("<script>\n" + wizard_source) != 1:
    raise SystemExit("Cannot place the essential PDF module before the wizard")
html = html.replace(
    "<script>\n" + wizard_source,
    consulta_scripts + '<script src="/imprimir-leitura.js?v=20261015-full-print"></script>\n'
    '<script src="/pdf-essencial.js?v=20261015-photo-2"></script>\n<script>\n' + wizard_source,
    1,
)
# Compile every inline script before emitting the page; offsets must remain valid.
import re
inline_scripts = re.findall(r'<script\b[^>]*>([\s\S]*?)</script>', html, re.I)
verify_scripts = 'const vm=require("node:vm"); const fs=require("node:fs"); JSON.parse(fs.readFileSync(0,"utf8")).forEach((s,i)=>new vm.Script(s,{filename:"inline-"+i+".js"}));'
subprocess.run(['node','-e',verify_scripts], input=json.dumps(inline_scripts), text=True, check=True)
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

# Keep licensed, public Unsplash photographs as local static assets whenever
# the deployment builder can reach the CDN. Failing downloads never break sales.
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
photo_ids = {
    'cover': 'photo-1470770841072-f978cf4d019e',
    'forest': 'photo-1441974231531-c6227db76b6e',
    'mountain': 'photo-1464822759023-fed622ff2c3b',
    'water': 'photo-1518837695005-2083093ee35b',
    'light': 'photo-1470252649378-9c29740c9fa8',
    'landscape': 'photo-1500534623283-312aade485b7'
}
photo_dir = out / 'imagens'
photo_dir.mkdir(exist_ok=True)
def download_photo(item):
    key, photo_id = item
    try:
        url = 'https://images.unsplash.com/' + photo_id + '?w=1000&q=74&fit=crop&fm=jpg'
        req = Request(url, headers={'User-Agent':'CampoGuardiaoPDF/1.0'})
        with urlopen(req, timeout=7) as remote:
            data = remote.read(2600001)
        if 2000 < len(data) < 2600000 and data.startswith(bytes.fromhex('ffd8ff')):
            (photo_dir / (key + '.jpg')).write_bytes(data)
            return key
    except Exception:
        pass
    return None
with ThreadPoolExecutor(max_workers=6) as pool:
    saved_photos = [r for r in pool.map(download_photo, photo_ids.items()) if r]
print('Photographic assets saved at build:',len(saved_photos),'of',len(photo_ids))
# Private knowledge library: static admin shell, protected by Supabase auth + database RLS.
for filename in ("biblioteca.html", "biblioteca.js", "recuperacao.html", "recuperacao.js", "recuperacao-manual.js"):
    src = root / filename
    if not src.is_file():
        raise SystemExit("Missing library asset: " + filename)
    shutil.copyfile(src, out / filename)
admin_html = out / "admin.html"
if not admin_html.is_file():
    raise SystemExit("Missing admin page to link the private library")
admin_code = admin_html.read_text(encoding="utf-8")
admin_app = '<div id="app" hidden>'
if admin_code.count(admin_app) != 1:
    raise SystemExit("Could not safely place the Claude credits access inside the admin panel")
admin_credits = (root / 'admin-creditos.html').read_text(encoding='utf-8')
admin_code = admin_code.replace(admin_app, admin_app + '\n' + admin_credits, 1)
library_link = '<a id="guardiaoLibraryLink" href="/biblioteca" style="position:fixed;bottom:18px;right:18px;z-index:9999;background:#F04A12;color:#fff;padding:11px 17px;border-radius:10px;text-decoration:none;font:700 13px system-ui,sans-serif;box-shadow:0 6px 22px #351A1444">Biblioteca de livros</a>'
if admin_code.count("</body>") != 1:
    raise SystemExit("Could not safely add the private library navigation to admin")
recovery_link = '<a id="guardiaoRecoveryLink" href="/recuperacao" style="position:fixed;bottom:73px;right:18px;z-index:9999;background:#351A14;color:#fff;padding:11px 17px;border-radius:10px;text-decoration:none;font:700 13px system-ui,sans-serif;box-shadow:0 6px 22px #351A1444">Gerenciar / zerar cadastro</a>'
admin_html.write_text(admin_code.replace("</body>", recovery_link + "\n" + library_link + "\n</body>", 1), encoding="utf-8")

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
# Visual redesign preview: publish for approval, without changing /venda.
preview_file = root / "previa-venda.html"
if not preview_file.is_file():
    raise SystemExit("Missing sales-page visual preview")
preview_html = preview_file.read_text(encoding="utf-8")
if preview_html.count('class="cards"') != 1 or preview_html.count('class="cta"') < 1:
    raise SystemExit("Incomplete sales-page preview")
shutil.copyfile(preview_file, out / "previa-venda.html")

# Current sales source. Prices and checkout remain the approved product offer.
photo=root/'foto-thiago.webp'
sales_source=root/'venda.html'
if not photo.is_file() or not sales_source.is_file():
    raise SystemExit('Missing creator photograph or current sales page')
shutil.copyfile(photo,out/photo.name)
sales_html=sales_source.read_text(encoding='utf-8')
for required in ('https://pay.kiwify.com.br/vT6ZxZd','8x de R$ 5,38','R$ 37,00',
                 'dez perguntas fixas','três perguntas','20 páginas','12 áreas',
                 'mailto:contato.energystudio@gmail.com'):
    if required not in sales_html:raise SystemExit('Sales content missing: '+required)
if 'href="#"' in sales_html or '24 Guardiões' in sales_html:
    raise SystemExit('A placeholder or inaccurate claim remains in the sales page')
(out/'venda.html').write_text(sales_html,encoding='utf-8')

print("Prepared", len(list(out.rglob("*"))), "site paths; Supabase configured:",
      bool(client_config["SUPABASE_URL"] and client_config["SUPABASE_ANON_KEY"]))


