const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// Cliente que fechou caía em "Leads Inativos", junto de quem desistiu — e é
// justamente o grupo que mais volta a comprar.
module.exports = { nome: 'Pós-venda: seção própria e cadência viva', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const fechados = (DATA.leads || []).filter(l => l.fase === 'Fechado Ganho');
  if (!fechados.length) return;   // nada a checar enquanto ninguém fechou

  const inativos = txt(doc.getElementById('leadsInativosCard'));
  fechados.forEach(l => assert(!inativos.includes(l.nome),
    l.nome + ' fechou negócio e não pode aparecer como lead inativo'));

  const el = doc.getElementById('posVendaCard');
  const card = txt(el);
  fechados.forEach(l => assert(card.includes(l.nome), l.nome + ' deveria estar no pós-venda'));

  // Com muitos clientes isso não pode virar parede de rolagem: grupos
  // recolhíveis, e só o que está vencido nasce aberto.
  const grupos = [...el.querySelectorAll('[data-pv-grupo]')];
  assert(grupos.length > 0, 'o pós-venda precisa ser agrupado, não uma lista corrida');
  grupos.forEach(g => {
    const corpo = el.querySelector(`[data-pv-corpo="${g.dataset.pvGrupo}"]`);
    assert(corpo, 'grupo sem corpo correspondente: ' + g.dataset.pvGrupo);
    const deveAbrir = g.dataset.pvGrupo === 'vencido';
    assert(corpo.classList.contains('open') === deveAbrir,
      `grupo "${g.dataset.pvGrupo}" ${deveAbrir ? 'deveria nascer aberto' : 'deveria nascer recolhido'}`);
  });
  const primeiro = grupos[0];
  const corpo1 = el.querySelector(`[data-pv-corpo="${primeiro.dataset.pvGrupo}"]`);
  const antes = corpo1.classList.contains('open');
  primeiro.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert(corpo1.classList.contains('open') !== antes, 'o grupo não alterna no clique');

  // Cada cliente abre a linha do tempo dele — não depende de hover.
  const item = el.querySelector('[data-posvenda]');
  assert(item, 'linha de cliente não é clicável');
  item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const jan = txt(doc.getElementById('biModalCorpo'));
  assert(/Linha do tempo do pós-venda/.test(jan), 'a janela não mostra a linha do tempo');
  assert(/Primeira semana/.test(jan) && /1 ano/.test(jan), 'a linha do tempo está incompleta');
  assert(doc.querySelectorAll('#biModalCorpo .pv-passo').length === 6, 'esperava os 6 marcos da cadência');

  // Comissão ainda não recebida precisa aparecer no pós-venda: é dinheiro
  // fechado que depende de terceiro e some da vista.
  const pendentes = (DATA.listaNegociacoes || []).filter(n => n.status !== 'pago' &&
    fechados.some(l => String(n.compradorLeadId) === String(l.id) || String(n.vendedorLeadId) === String(l.id)));
  if (pendentes.length) assert(/ainda não recebida/.test(card), 'comissão pendente do cliente sumiu do pós-venda');

  // A cadência tem que se mover com o tempo, sem nada guardado.
  const marcos = [
    { data: new Date(2026, 7, 14), espera: 'Primeira semana' },
    { data: new Date(2026, 8, 20), espera: '1 mês' },
    { data: new Date(2027, 7, 10), espera: '1 ano' }
  ];
  for (const m of marcos) {
    const r = await montar({ quando: m.data });
    const t = txt(r.doc.getElementById('posVendaCard'));
    assert(t.includes(m.espera), `em ${m.data.toLocaleDateString('pt-BR')} o marco deveria ser "${m.espera}" — veio: ${t.slice(0, 160)}`);
    assert(/vencido há/.test(t), 'marco vencido deveria estar sinalizado');
    // e precisa chegar em "O Que Fazer Agora", senão ninguém vê
    assert(/Pós-venda em aberto/.test(txt(r.doc.getElementById('acoesAgoraList'))),
      'pós-venda vencido não apareceu nas ações do dia');
  }
}};
