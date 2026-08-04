const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// O funil dizia ONDE se perde, mas não QUEM. Clicar tem que responder isso —
// e por clique, não por hover: title de navegador é pouco confiável e no
// celular não existe.
module.exports = { nome: 'Funil clicável: barra e selo de queda', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const el = doc.getElementById('termometroFunil');
  const FASES = ['Novo Lead','Primeiro Contato Feito','Qualificado','Visita Agendada',
                 'Visita Realizada','Proposta Enviada','Em Negociação','Fechado Ganho'];
  const chegaram = (i) => DATA.leads.filter(l => (l.maiorFaseIndex || 0) >= i + 1);

  const barras = [...el.querySelectorAll('[data-fase-funil]')];
  assert(barras.length > 0, 'nenhuma barra do funil ficou clicável');
  barras.forEach(b => assert(b.getAttribute('role') === 'button' && b.hasAttribute('tabindex'),
    'barra clicável precisa ser alcançável pelo teclado'));

  // Etapa vazia não vira botão que abre lista vazia.
  FASES.forEach((f, i) => {
    if (chegaram(i).length === 0) {
      assert(!el.querySelector(`[data-fase-funil="${i}"]`), `${f} está vazia e não deveria ser clicável`);
    }
  });

  const alvo = barras[barras.length - 1];
  alvo.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const over = doc.getElementById('biModalOverlay');
  assert(over.classList.contains('open'), 'clicar na barra não abriu a janela');
  const i = Number(alvo.dataset.faseFunil);
  const corpo = txt(doc.getElementById('biModalCorpo'));
  chegaram(i).forEach(l => assert(corpo.includes(l.nome), l.nome + ' deveria aparecer em ' + FASES[i]));

  // O selo de queda é o mais útil: lista quem travou naquela passagem.
  const selos = [...el.querySelectorAll('[data-travou]')];
  assert(selos.length > 0, 'nenhum selo de queda ficou clicável');
  const s = selos[selos.length - 1];
  const j = Number(s.dataset.travou);
  s.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const titulo = txt(doc.getElementById('biModalTitulo'));
  assert(titulo.includes(FASES[j - 1]) && titulo.includes(FASES[j]),
    'o título tem que nomear as duas etapas: ' + titulo);
  const ids = new Set(chegaram(j).map(l => String(l.id)));
  const travados = chegaram(j - 1).filter(l => !ids.has(String(l.id)));
  const corpo2 = txt(doc.getElementById('biModalCorpo'));
  travados.forEach(l => assert(corpo2.includes(l.nome), l.nome + ' travou aqui e deveria estar na lista'));
  // Quem avançou NÃO pode aparecer na lista de travados.
  chegaram(j).forEach(l => assert(!corpo2.includes(l.nome),
    l.nome + ' avançou e não pode constar como travado'));
  assert(/parado há|movimentou hoje/.test(corpo2), 'faltou dizer há quanto tempo cada um está parado');
}};
