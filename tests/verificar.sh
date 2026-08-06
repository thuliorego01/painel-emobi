#!/usr/bin/env bash
# Portão de publicação: nada vai pro ar sem passar por aqui.
# Uso: bash tests/verificar.sh
set -e
cd "$(dirname "$0")/.."
node scripts/montar-painel.js >/dev/null
node -e "
const fs=require('fs');
const h=fs.readFileSync('public/index.html','utf8');
const s=[...h.matchAll(/<script(?:(?! src)[^>])*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('/tmp/_painel_check.js', s.reduce((a,b)=>a.length>b.length?a:b));
"
node --check /tmp/_painel_check.js && echo "  sintaxe do JS  ok"
python3 - <<'PY'
from html.parser import HTMLParser
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','path','circle','rect','line','polyline','polygon'}
class C(HTMLParser):
    def __init__(s): super().__init__(); s.st=[]
    def handle_starttag(s,t,a):
        if t not in VOID: s.st.append(t)
    def handle_endtag(s,t):
        if s.st and s.st[-1]==t: s.st.pop()
        elif t in s.st:
            while s.st and s.st[-1]!=t: s.st.pop()
            if s.st: s.st.pop()
c=C(); c.feed(open('public/index.html',encoding='utf-8').read())
assert not c.st, 'tags HTML desbalanceadas: %r' % c.st
print('  tags HTML      ok')
PY
node tests/integridade.js
node tests/rodar.js
