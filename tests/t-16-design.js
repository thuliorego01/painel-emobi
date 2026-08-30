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
  const semTokens = css.replace(/--(fs|ic)-[a-z0-9]+:\s*[^;]+;/g, '');
  const fontesSoltas = [...semTokens.matchAll(/font-size:\s*([0-9.]+px)/g)].map(m => m[1]);
  assert(fontesSoltas.length === 0,
    'font-size em pixel solto no CSS: ' + [...new Set(fontesSoltas)].join(', '));

  const fontesNoCorpo = [...corpo.matchAll(/font-size:\s*([0-9.]+px)/g)].map(m => m[1]);
  assert(fontesNoCorpo.length === 0,
    'font-size em pixel solto no HTML/JS: ' + [...new Set(fontesNoCorpo)].join(', '));

  // Raio de borda idem.
  const raiosSoltos = [...css.matchAll(/border-radius:\s*([0-9.]+px)\s*[;}]/g)].map(m => m[1]);
  assert(raiosSoltos.length === 0, 'border-radius em pixel solto: ' + [...new Set(raiosSoltos)].join(', '));

  // Micro (o menor degrau) é só para ETIQUETA: chip, selo, contador, rótulo em
  // caixa alta. Frase para ler nunca entra aí — era o que dava o "carnaval".
  const forasteiros = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), decl = m[2];
    if (!/font-size:\s*var\(--fs-2xs\)/.test(decl)) continue;
    const ehEtiqueta = /text-transform:\s*uppercase/.test(decl) ||
      /(chip|badge|selo|-qtd|-num|tag|contagem|-rot|rotulo|titulo-escopo|kpi-group-label|hint|dica|idade|meta-tipo|mes|quando|feito|parcial|status-|ind-zero|sync-text|com-detalhe)/.test(sel);
    if (!ehEtiqueta) forasteiros.push(sel.split('\n').pop().slice(0, 40));
  }
  assert(forasteiros.length === 0,
    'texto para ler no tamanho de etiqueta: ' + forasteiros.join(' | '));

  // Ícone não segue a escala de texto — se seguir, muda de tamanho junto com
  // o corpo e desalinha tudo.
  assert(!/\.kpi \.icon[^{]*\{[^}]*font-size:\s*var\(--fs-/.test(css),
    'ícone de KPI não deve usar a escala tipográfica');

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

  // toISOString() devolve UTC: das 21h em diante já é o dia seguinte. Usar
  // isso para "que dia é hoje" fez um adiamento de 7 dias virar 8.
  const usosUTC = [...corpo.matchAll(/toISOString\(\)\.slice\(0,\s*10\)/g)];
  assert(usosUTC.length === 0,
    'toISOString().slice(0,10) usado para data local — use dataLocalISO()');

  // Estado vazio é classe, não estilo escrito à mão 16 vezes.
  assert(!/style="font-size:[0-9.]+px;color:#8A9186;"/.test(corpo),
    'voltou a existir mensagem de "vazio" com estilo inline');

  // ---- Paleta ----------------------------------------------------------
  // Eram 177 cores escritas à mão, 76 usadas uma única vez: três vermelhos
  // para "atrasado", três verdes para "em dia", trinta e oito âmbares. Cor sem
  // regra deixa de ser atalho e vira decoração. Agora existe uma paleta
  // semântica, e hex solto no CSS é o mesmo erro que px solto na fonte.
  (function paletaFechada() {
    const fonte = css;
    // Os :root são onde os tokens NASCEM — só lá pode haver hex.
    const faixas = [];
    const re = /:root\s*\{/g;
    let m;
    while ((m = re.exec(fonte))) {
      let d = 0;
      for (let k = m.index + m[0].length - 1; k < fonte.length; k++) {
        if (fonte[k] === '{') d++;
        else if (fonte[k] === '}') { d--; if (d === 0) { faixas.push([m.index, k]); break; } }
      }
    }
    const dentroDeRoot = (i) => faixas.some(([a, b]) => i >= a && i <= b);
    const soltos = [];
    const rh = /#[0-9A-Fa-f]{3,8}\b/g;
    let h;
    while ((h = rh.exec(fonte))) {
      if (dentroDeRoot(h.index)) continue;
      soltos.push(h[0]);
    }
    // Sobra permitida: fundo da página, superfícies do escuro e a borda com
    // transparência dos campos — coisas que um token semântico não descreve.
    const PERMITIDOS = new Set(['#111510', '#20261E', '#39423577', '#232A22', '#232B21', '#3A4435']);
    const proibidos = soltos.filter(c => !PERMITIDOS.has(c.toUpperCase()) && !PERMITIDOS.has(c));
    assert(proibidos.length === 0,
      `cor escrita à mão fora da paleta: ${[...new Set(proibidos)].slice(0, 6).join(', ')}` +
      ` (${proibidos.length} no total) — use um token de --erro/--ok/--aviso/--info/--quente/--morno/--frio/--txt/--linha`);

    // Temperatura não pode reusar a cor de estado: lead Quente é boa notícia,
    // e pintá-lo com o vermelho de "atrasado" faz o olho ler perigo.
    ['quente', 'morno', 'frio'].forEach(t => {
      assert(new RegExp(`--${t}-txt\\s*:`).test(fonte), `falta o token --${t}-txt`);
    });
    assert(!/\.temp\.quente\s*\{[^}]*--erro-/.test(fonte),
      'o selo de temperatura Quente está usando a cor de erro');
    assert(!/\.temp\.frio\s*\{[^}]*--info-/.test(fonte),
      'Frio está usando a cor do Conecta TR em vez da própria');
  })();


  // ---- Emoji ------------------------------------------------------------
  // Eram 510 emojis e 69 símbolos diferentes na mesma tela: 💬 46 vezes,
  // 🏠 33, 👆 25. O emoji tinha virado marcador de lista — e quando tudo está
  // marcado, nada está marcado. Ele volta a valer só onde carrega ESTADO.
  (function emojiComParcimonia() {
    const EMO = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{23E9}-\u{23FA}]/gu;
    const pictos = (corpo.match(EMO) || []);
    const distintos = new Set(pictos);
    assert(distintos.size <= 45,
      `${distintos.size} símbolos diferentes no painel — o emoji volta a ser ruído acima de ~45`);
    // Nenhum símbolo pode se repetir tanto a ponto de virar bullet.
    const cont = {};
    pictos.forEach(e => { cont[e] = (cont[e] || 0) + 1; });
    const abusados = Object.entries(cont).filter(([e, n]) => n > 26 && !'▶→↓↔'.includes(e));
    assert(abusados.length === 0,
      'símbolo usado como marcador de lista: ' + abusados.map(([e, n]) => e + '×' + n).join(', '));
    // A instrução de clique não pode voltar a aparecer 25 vezes de uma vez.
    // (aria-label pode e deve continuar dizendo isso — o que não pode é a
    // linha visível repetida em cada card.)
    const dicas = (corpo.match(/Clique para ver o histórico/g) || []).length;
    assert(dicas === 0, 'a dica visível "Clique para ver o histórico" voltou ao card — ela é afordância de hover');
  })();


  // ---- Densidade e hierarquia -------------------------------------------
  // O card do lead chegou a carregar 15 informações e 6 selos, e a tela de
  // abertura tinha 41 números do mesmo tamanho — sem protagonista, o olho não
  // sabe onde pousar. Duas regras: campo sem valor não ocupa linha, e a
  // abertura tem UM número herói.
  (function densidadeEHierarquia() {
    assert(!/Valor: <b>\$\{valorTxt\}<\/b><\/span>\s*\n\s*<span>Comiss/.test(corpo),
      'o card voltou a imprimir Valor e Comissão mesmo quando não há valor');
    assert(/l\.valor !== null && l\.valor !== undefined \?/.test(corpo),
      'campo sem valor precisa sumir do card, não virar "a definir"');
    assert(/--fs-3xl/.test(css), 'falta o degrau do número herói');
    // O herói é UM. Se aparecer em mais de um lugar, deixa de ser herói.
    const usos = (css.match(/var\(--fs-3xl\)/g) || []).length;
    assert(usos === 1, `--fs-3xl usado ${usos} vezes — o número herói é um por tela`);
    // E a saudação não pode repetir o que o herói já diz.
    assert(!/greet-list/.test(corpo),
      'a saudação voltou a listar as pendências que o banner já mostra em tamanho grande');
  })();

  // TEXTO SOBRE FUNDO DA MARCA. Usar --surface (a cor do fundo da página) como
  // cor de TEXTO funciona no tema claro por coincidência: ali ela é branca. No
  // escuro ela vira #1B211A e o texto some — foi o que aconteceu com o número
  // herói do banner, invisível no celular à noite em 29/08/2026. Fundo de marca
  // é escuro nos dois temas, então a cor do texto não pode seguir o tema.
  const usosSurface = (css.match(/color:\s*var\(--surface\)/g) || []).length;
  assert(usosSurface === 0,
    usosSurface + ' uso(s) de --surface como cor de TEXTO — some no tema escuro; use --txt-sobre-marca');
  assert(/--txt-sobre-marca\s*:/.test(css), 'falta o token --txt-sobre-marca');
  const blocoEscuro = (css.match(/@media \(prefers-color-scheme: dark\)[\s\S]*/) || [''])[0];
  assert(!/--txt-sobre-marca\s*:/.test(blocoEscuro),
    '--txt-sobre-marca foi redefinido no tema escuro — ele não deve mudar com o tema');

}};
