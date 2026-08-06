const assert = require('assert');
const { montar, txt } = require('./ambiente');

// A agenda listava na ordem em que os itens entraram no array: 19h, 16h, 14h45.
// Agenda que não respeita o relógio obriga o olho a reordenar sozinho.
module.exports = { nome: 'Agenda em ordem crescente de horário', rodar: async () => {
  const { doc } = await montar();

  const minutos = (t) => {
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60;
  };

  // Dentro de cada dia, do mais cedo para o mais tarde.
  let atual = [];
  const blocos = [];
  [...doc.querySelectorAll('#agendaList > *')].forEach(el => {
    if (el.classList.contains('agenda-dia-rotulo')) { if (atual.length) blocos.push(atual); atual = []; }
    else if (el.classList.contains('agenda-row')) atual.push(minutos(txt(el.querySelector('.agenda-time'))));
  });
  if (atual.length) blocos.push(atual);
  blocos.forEach(b => assert(JSON.stringify(b) === JSON.stringify([...b].sort((x, y) => x - y)),
    'agenda fora de ordem: ' + b.join(', ')));

  // O mesmo na Home.
  const destaque = [...doc.querySelectorAll('.compromisso-card .cc-time')].map(e => txt(e));
  const porDia = {};
  destaque.forEach(t => {
    const dia = /Hoje/.test(t) ? 0 : 1;
    (porDia[dia] = porDia[dia] || []).push(minutos(t));
  });
  Object.values(porDia).forEach(b => assert(JSON.stringify(b) === JSON.stringify([...b].sort((x, y) => x - y)),
    'compromissos de destaque fora de ordem: ' + b.join(', ')));

  // Bloqueio não tem o que concluir, nem é uma casa para visitar.
  doc.querySelectorAll('.agenda-row.bloqueado').forEach(r => {
    assert(!r.querySelector('.agenda-feito'), 'bloqueio não deve ter botão de "Realizada"');
    assert(txt(r.querySelector('.agenda-icon')) === '🔒', 'bloqueio deve usar cadeado, não casa');
    assert(!/🔒\s*🔒/.test(txt(r)), 'cadeado duplicado — o título não deve repetir o ícone');
  });
}};
