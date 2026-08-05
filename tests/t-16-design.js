const assert = require('assert');
const fs = require('fs');
const { ALVO } = require('./ambiente');

// O painel chegou a ter 21 tamanhos de fonte e 12 raios de borda diferentes —
// e 11 caixas de recado quase idênticas, cada uma com seu próprio padding.
// Era isso que dava a sensação de "box mais largo, várias fontes".
module.exports = { nome: 'Design: uma escala só, sem px solto', rodar: async () => {
  const html = fs.readFileSync(ALVO, 'utf8');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const corpo = html.slice(html.indexOf('</style>'));

  // Tamanho de fonte só pela escala. A exceção é a própria definição dos tokens.
  const semTokens = css.replace(/--fs-[a-z0-9]+:\s*[^;]+;/g, '');
  const fontesSoltas = [...semTokens.matchAll(/font-size:\s*([0-9.]+px)/g)].map(m => m[1]);
  assert(fontesSoltas.length === 0,
    'font-size em pixel solto no CSS: ' + [...new Set(fontesSoltas)].join(', '));

  const fontesNoCorpo = [...corpo.matchAll(/font-size:\s*([0-9.]+px)/g)].map(m => m[1]);
  assert(fontesNoCorpo.length === 0,
    'font-size em pixel solto no HTML/JS: ' + [...new Set(fontesNoCorpo)].join(', '));

  // Raio de borda idem.
  const raiosSoltos = [...css.matchAll(/border-radius:\s*([0-9.]+px)\s*[;}]/g)].map(m => m[1]);
  assert(raiosSoltos.length === 0, 'border-radius em pixel solto: ' + [...new Set(raiosSoltos)].join(', '));

  // A escala existe e tem os sete degraus.
  ['--fs-2xs', '--fs-xs', '--fs-sm', '--fs-md', '--fs-lg', '--fs-xl', '--fs-2xl']
    .forEach(t => assert(css.includes(t + ':'), 'faltou o token ' + t));
  ['--r-sm', '--r-md', '--r-lg', '--r-pill']
    .forEach(t => assert(css.includes(t + ':'), 'faltou o token ' + t));

  // Caixa de recado: base compartilhada, não uma regra por caixa.
  const base = css.match(/\n  \.aviso-telefones,[\s\S]*?\{[^}]*\}/);
  assert(base, 'as caixas de recado voltaram a ter regra própria cada uma');
  assert(/padding:\s*9px 12px/.test(base[0]), 'a base das caixas perdeu o padding único');

  // Coluna de grade sem min-width:0 é empurrada por tabela larga de dentro —
  // foi o que fez um card ficar visivelmente mais largo que o vizinho.
  const grid2 = css.match(/\n  \.grid2 \{[^}]*\}/);
  assert(grid2, 'regra .grid2 sumiu');
  assert(/minmax\(0,\s*1fr\)/.test(grid2[0]),
    '.grid2 precisa de minmax(0,1fr) para a tabela não estourar a coluna');
  assert(/\.grid2 > \* \{[^}]*min-width:\s*0/.test(css), 'faltou min-width:0 nos filhos de .grid2');
  assert(/\.pipeline-topo > \* \{[^}]*min-width:\s*0/.test(css), 'faltou min-width:0 nos filhos de .pipeline-topo');

  // Estado vazio é classe, não estilo escrito à mão 16 vezes.
  assert(!/style="font-size:[0-9.]+px;color:#8A9186;"/.test(corpo),
    'voltou a existir mensagem de "vazio" com estilo inline');
}};
