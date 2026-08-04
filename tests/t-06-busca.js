const assert = require('assert');
const fs = require('fs');
const { montar, ALVO } = require('./ambiente');

// A busca mora dentro da topbar. A topbar nasceu escondida acima de 900px,
// então no desktop o campo simplesmente não existia.
module.exports = { nome: 'Busca global existe no desktop e responde', rodar: async () => {
  const html = fs.readFileSync(ALVO, 'utf8');
  const base = html.match(/\n  \.topbar \{[^}]*\}/);
  assert(base, 'regra base do .topbar sumiu');
  assert(!/display:\s*none/.test(base[0]), 'a topbar voltou a nascer escondida — a busca some no desktop');

  const { dom, doc } = await montar();
  const input = doc.getElementById('buscaGlobal');
  assert(input, 'campo de busca ausente');
  input.value = 'lagoa';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  const res = doc.getElementById('buscaResultados');
  assert(res.style.display !== 'none', 'a busca não abriu resultados');
  assert(/Lagoa Nova/i.test(res.textContent), 'a busca não encontrou o que devia');
}};
