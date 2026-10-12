#!/usr/bin/env python3
"""Gera public/index.html a partir do app Mapa do Guardião (../ciclos.html) + wizard.js + wizard.css."""
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'ciclos.html')
s = open(src, encoding='utf-8').read()
s = s.replace('const CLIENT_ONLY = false;', 'const CLIENT_ONLY = true;').replace("const STORE = 'ciclos-mcl1-v1';", "const STORE = 'guardiao-site-v1';")
s = s.replace('<title>Ciclos de Vida MCL-1</title>', '')
css = open(os.path.join(here, 'wizard.css'), encoding='utf-8').read()
wiz = open(os.path.join(here, 'wizard.js'), encoding='utf-8').read()
i = s.index('\n</style>\n'); s = s[:i] + '\n' + css + s[i:]
j = s.index('</style>') + len('</style>')
head, body = s[:j], s[j:]
tag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf'
assert body.count(tag) == 1
body = body.replace(tag, '<script src="/config.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n' + tag, 1)
doc = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="theme-color" content="#1D6B66">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Mapa do Guardião">\n'
       '<link rel="manifest" href="/manifest.json">\n<link rel="icon" href="/icon-192.png">\n<link rel="apple-touch-icon" href="/icon-192.png">\n'
       '<meta name="description" content="Descubra o bloqueio emocional por trás do seu comportamento. Mapa do Guardião, do Campo Guardião.">\n'
       '<title>Mapa do Guardião</title>\n' + head + '\n</head>\n<body class="client">\n' + body + '\n<script>\n' + wiz + '\n</script>\n</body>\n</html>\n')
open(os.path.join(here, 'public', 'index.html'), 'w', encoding='utf-8').write(doc)
print('public/index.html', len(doc))
