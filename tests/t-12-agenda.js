const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// A aba tinha 5 seções e mostrava os mesmos lembretes duas vezes; o campo
// `quando` era texto guardado e já estava errado (31/07 marcado como "Hoje"
// no dia 04/08); e a mesma pendência era contada duas vezes no banner.
module.exports = { nome: 'Agenda: um lugar só, com data viva', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);

  // Nada de situação guardada, e toda data precisa ser completa.
  (DATA.lembretes || []).forEach(l => {
    assert(!('quando' in l), `"${l.texto.slice(0,40)}" voltou a guardar o campo quando`);
    assert(!l.data || /^\d{4}-\d{2}-\d{2}$/.test(l.data),
      `"${l.texto.slice(0,40)}" precisa de data completa com ano, veio: ${l.data}`);
  });

  // Sem duplicata declarada.
  const dup = (DATA.lembretes || []).filter(l => /duplicata/i.test(l.texto));
  assert(dup.length === 0, 'lembrete marcado como duplicata continua na base');

  // O mesmo lembrete não pode aparecer em dois lugares da mesma aba.
  const hoje = [...doc.querySelectorAll('#lembretesHojeLista .txt')].map(x => txt(x));
  const depois = [...doc.querySelectorAll('#lembretesCard .txt')].map(x => txt(x));
  const repetidos = depois.filter(x => hoje.includes(x));
  assert(repetidos.length === 0, 'lembrete aparecendo duas vezes na tela: ' + repetidos.join(' | '));

  // "Depois" só carrega o que ainda não venceu.
  depois.forEach(t => {
    const l = (DATA.lembretes || []).find(x => x.texto === t);
    // Data local, não UTC: às 21h o toISOString já devolve o dia seguinte.
    const hj = new Date();
    const hojeLocal = hj.getFullYear() + '-' + String(hj.getMonth()+1).padStart(2,'0') + '-' + String(hj.getDate()).padStart(2,'0');
    if (l && l.data) assert(l.data > hojeLocal,
      `"${t.slice(0,40)}" já venceu e não devia estar em Depois`);
  });

  // Lembrete precisa virar ação, não só texto.
  const linha = doc.querySelector('#lembretesHojeLista .lembrete-row') ||
                doc.querySelector('#lembretesCard .lembrete-row');
  if (linha) {
    assert(linha.querySelector('.lembrete-check'), 'faltou concluir');
    assert(linha.querySelector('[data-adiar]'), 'faltou adiar');
    assert(linha.querySelector('[data-arquivar]'), 'faltou arquivar');
  }

  // Banner não pode somar duas vezes a mesma pendência.
  const banner = txt(doc.getElementById('urgentBanner'));
  const m = banner.match(/(\d+)\s*pendências/);
  if (m) {
    const grupos = [...doc.querySelectorAll('#acoesAgoraList .acao-group-title')]
      .map(g => Number((txt(g).match(/\((\d+)\)/) || [])[1] || 0));
    const soma = grupos.reduce((a, b) => a + b, 0);
    assert(Number(m[1]) === soma,
      `banner diz ${m[1]} pendências mas os grupos somam ${soma}`);
  }
}};
