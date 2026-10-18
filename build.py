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
html = html[:open_tag] + "<script>\n" + wizard_source + "\n</script>" + html[close_tag + len("</script>"):]
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
    '<script src="/imprimir-leitura.js?v=20261015-full-print"></script>\n'
    '<script src="/pdf-essencial.js?v=20261015-photo-2"></script>\n<script>\n' + wizard_source,
    1,
)
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
# Restore the original large price typography using confirmed Kiwify checkout prices.
# The 8x installment includes checkout financing fees; cash price is R$ 37,00.
for previous, actual in (
    ("parcelas: 12", "parcelas: 8"),
    ("valorParcela: 'R$ XX,XX'", "valorParcela: 'R$ 5,38'"),
    ("valorVista: 'R$ XX'", "valorVista: 'R$ 37,00'"),
):
    if sales_html.count(previous) != 1:
        raise SystemExit("Unexpected sales page price configuration: " + previous)
    sales_html = sales_html.replace(previous, actual, 1)
if sales_html.count("var p = CONFIG.parcelas + 'x de <b>' + CONFIG.valorParcela + '</b> ou ' + CONFIG.valorVista + ' à vista';") != 1:
    raise SystemExit("Price display in main page or sticky bar has changed")
if sales_html.count("e.innerHTML = CONFIG.parcelas + 'x de ' + CONFIG.valorParcela;") != 1:
    raise SystemExit("Large price display is missing")
if sales_html.count("e.textContent = 'ou ' + CONFIG.valorVista + ' à vista';") != 1:
    raise SystemExit("Cash price display is missing")

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
sales_copy_updates = [
  [
    "Em 10 minutos, descubra o seu lugar de potência para ganhar ainda mais dinheiro e o plano para as próximas 72 horas.",
    "Descubra onde a sua energia rende mais e custa menos. Conheça seu Guardião, seus potenciais e um plano de ação possível."
  ],
  [
    "<h1>Em 10 minutos, você descobre <em>o seu lugar de potência</em> para ganhar ainda mais dinheiro.</h1>",
    "<h1>O seu lugar de potência é onde <em>a sua energia rende mais e custa menos.</em></h1>"
  ],
  [
    "Existe um lugar onde o seu dinheiro flui com mais facilidade, e ninguém nunca te mostrou qual é. Dentro de você há uma parte, o seu Guardião, que decide quanto você cobra, aparece e recebe. O Mapa mostra quem ele é, o lugar onde você tem mais potência para ganhar e o que fazer nas próximas 72 horas.",
    "Você pode estar se esforçando muito para caber em lugares que não combinam com o seu jeito de funcionar. O Mapa do Guardião ajuda você a reconhecer a proteção por trás das suas escolhas, identificar potenciais e encontrar passos mais coerentes para sua vida. São cerca de 5 minutos para responder ao questionário; a leitura é gerada em seguida."
  ],
  [
    "É aqui que o seu dinheiro flui com mais facilidade. Esse lugar pede que você mostre o que já viveu, sem esperar estar perfeita.",
    "É aqui que a sua experiência pode se transformar em contribuição. Esse lugar pede que você mostre o que já viveu, sem esperar estar perfeita."
  ],
  [
    "<h2>O seu lugar de potência é onde a sua energia rende mais e custa menos</h2>",
    "<h2>Você não precisa continuar se esforçando para caber em qualquer lugar.</h2>"
  ],
  [
    "o seu lugar de potência para ganhar dinheiro, e as formas de ganhar que combinam com você",
    "o seu lugar de potência e as formas de aplicar seus recursos no trabalho e nas escolhas"
  ],
  [
    "Trabalha muito e sente que o dinheiro não acompanha o esforço.",
    "Se dedica muito e, mesmo assim, sente que tudo exige mais energia do que deveria."
  ],
  [
    "Sabe o que precisa fazer para ganhar mais e, na hora de agir, adia, hesita ou muda de ideia.",
    "Sabe o que gostaria de mudar e, na hora de agir, adia, hesita ou volta ao mesmo padrão."
  ],
  [
    "Você faz o que todo mundo manda e <em>o dinheiro não vem</em>?",
    "Você segue as expectativas dos outros e <em>se distancia de si</em>?"
  ],
  [
    "Segue o método que funcionou para outra pessoa, cobra o que acha que pode, adia o que seria o grande passo. Cada tentativa pede muito e devolve pouco.",
    "Segue fórmulas que funcionaram para outras pessoas, tenta corresponder a todas as expectativas e adia as escolhas importantes. Cada tentativa pede muita energia e oferece pouca clareza."
  ],
  [
    "O Mapa não fala só de dinheiro. Ele cruza o seu Guardião com os seus ciclos de vida e mostra o seu lugar em cada área.",
    "O Mapa cruza o seu Guardião com os seus ciclos de vida para observar padrões e possibilidades em diferentes áreas, inclusive no trabalho e nas finanças."
  ],
  [
    "Onde você ganha com mais facilidade, sem se esgotar.",
    "Como reconhecer seus recursos, se posicionar e cuidar dos seus limites."
  ],
  [
    "Onde o seu dinheiro flui melhor",
    "Seus recursos no trabalho e nas finanças"
  ],
  [
    "O seu lugar de potência para ganhar mais.",
    "O seu lugar de potência na vida profissional."
  ],
  [
    "As formas de ganhar dinheiro que combinam com você, a armadilha que costuma te segurar e o primeiro passo para cobrar e vender com mais firmeza.",
    "Possibilidades de aplicar seus talentos ao trabalho e ao dinheiro, padrões que dificultam suas decisões e um primeiro passo para se posicionar com mais consciência."
  ],
  [
    "Descobrir em 10 minutos o seu lugar de potência, e construir o seu dinheiro e a sua vida a partir dele.",
    "Reconhecer onde a sua energia rende mais e custa menos e começar a fazer escolhas mais coerentes com você."
  ],
  [
    "O seu lugar de potência para ganhar mais dinheiro",
    "O seu lugar de potência e como aplicá-lo nas suas escolhas"
  ],
  [
    "Se você quer descobrir ainda hoje o seu lugar de potência para ganhar mais dinheiro, clique no botão abaixo.",
    "Descubra onde a sua energia rende mais e custa menos. Comece a ocupar seu lugar de potência com escolhas possíveis para sua realidade."
  ],
  [
    "Cerca de 10 minutos para responder. A leitura é gerada em seguida.",
    "Cerca de 5 minutos para responder. A leitura é gerada em seguida."
  ],
  [
    "<summary>Posso refazer o Mapa?</summary><p>Sim. Todas as leituras ficam salvas no seu painel, e você pode gerar uma nova quando quiser, dentro do limite do seu acesso.</p>",
    "<summary>Posso gerar o Mapa mais de uma vez?</summary><p>Não. Cada compra dá direito a gerar um único Mapa. Ele fica salvo no painel, e você pode consultá-lo e baixar o PDF novamente durante o período de acesso.</p>"
  ],
  [
    "Você tem acesso ao Mapa do Guardião por um ano e guarda todas as suas leituras lá.",
    "Você tem acesso ao Mapa do Guardião por um ano e pode consultar a sua leitura e baixar o PDF pelo painel."
  ]
]
for previous, revised in sales_copy_updates:
    if sales_html.count(previous) != 1:
        raise SystemExit('Unexpected original sales copy or duplicate occurrence: ' + previous[:95])
    sales_html = sales_html.replace(previous, revised, 1)

sales_page.write_text(sales_html, encoding="utf-8")

print("Prepared", len(list(out.rglob("*"))), "site paths; Supabase configured:",
      bool(client_config["SUPABASE_URL"] and client_config["SUPABASE_ANON_KEY"]))

