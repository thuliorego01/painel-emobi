const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// Bloqueio de agenda é o oposto de um compromisso: é um pedido para NÃO
// oferecer horário ali. Se ele se parecer com uma visita, um dia alguém marca
// cliente por cima de um compromisso inegociável.
module.exports = { nome: 'Bloqueio de agenda se distingue de compromisso', rodar: async () => {
  const { doc, dom } = await montar();
  const DATA = dados(dom);
  const todos = [...(DATA.agendaHoje || []), ...(DATA.agendaAmanha || []), ...(DATA.agendaProximos || [])];
  const bloqueios = todos.filter(e => e.bloqueado);
  if (!bloqueios.length) return;

  const faixa = doc.getElementById('semanaStrip');
  assert(faixa.querySelector('.semana-ev.bloqueado'),
    'bloqueio não está visualmente distinguido na faixa da semana');

  // E não pode ser contado como compromisso de trabalho.
  const nota = txt(faixa);
  // A faixa só olha os próximos 7 dias — comparar com o array inteiro
  // incluiria compromissos passados.
  const hj = new Date();
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const fim = new Date(hj); fim.setDate(fim.getDate() + 6);
  const naSemana = todos.filter(e => e.data >= iso(hj) && e.data <= iso(fim));
  const m = nota.match(/(\d+)\s*compromissos? nos próximos/);
  const trabalho = naSemana.filter(e => !e.bloqueado).length;
  if (m) assert(Number(m[1]) === trabalho,
    `a faixa conta ${m[1]} compromissos, mas só ${trabalho} são de trabalho (o resto é bloqueio)`);
  assert(/bloqueado/.test(nota), 'a faixa precisa dizer que há horário bloqueado');

  // O intervalo tem que aparecer: bloquear das 8h sem dizer até quando não serve.
  bloqueios.filter(b => b.horaFim).forEach(b =>
    assert(txt(faixa).includes(b.horaFim), `falta o fim do bloqueio (${b.horaFim}) na faixa`));
}};
