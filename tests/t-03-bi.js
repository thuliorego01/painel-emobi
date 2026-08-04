const assert = require('assert');
const { montar, txt, porId } = require('./ambiente');

module.exports = { nome: 'BI: ritmo, escopo do funil, fila e sazonalidade', rodar: async () => {
  const { dom, doc, graficos } = await montar({ capturarCharts: true });

  const ritmo = porId(doc, 'ritmoAno');
  assert(/Ano decorrido/.test(ritmo), 'falta a barra de ano decorrido');
  assert(/(atrás|à frente) do calendário/.test(ritmo), 'falta comparar meta com calendário');
  assert(!/nos 1 meses/.test(ritmo), 'plural quebrado no último mês');

  // O funil só enxerga comprador que virou lead. Zero sem essa ressalva lê
  // como "não fecho nada" — e convivia com 9 vendas na mesma tela.
  const fech = porId(doc, 'fechamentoReal');
  assert(/pelo funil de leads/.test(fech), 'faltou o escopo do funil');
  assert(/todas as origens/.test(fech), 'faltou o número real de fechamentos');
  assert(/Por que o funil mostra 0%/.test(fech), 'faltou explicar o zero');

  // Fase com 0% de conversão e gente parada dentro é FILA, não gargalo.
  // Só cobramos o rótulo quando essa situação existe — quando não existe
  // (todo mundo avançou), a ausência é o resultado certo.
  const DATA = dom.window.eval('DATA');
  const FASES = ['Novo Lead','Primeiro Contato Feito','Qualificado','Visita Agendada',
                 'Visita Realizada','Proposta Enviada','Em Negociação','Fechado Ganho'];
  const alcancaram = FASES.map((_, i) => DATA.leads.filter(l => (l.maiorFaseIndex || 0) >= i + 1).length);
  const temFila = FASES.some((f, i) =>
    alcancaram[i] > 0 && alcancaram[i + 1] === 0 && DATA.leads.some(l => l.fase === f));
  if (temFila) {
    assert(/em andamento/.test(porId(doc, 'conversaoTabela')),
      'fase com 0% e gente dentro é fila, tem que dizer isso');
  }

  const saz = graficos['chartHistoricoSazonalidade'];
  const hist = saz.data.datasets.find(x => /histórica/i.test(x.label));
  assert(hist && hist.data.filter(v => v > 0).length >= 6, 'sazonalidade histórica vazia');
  const atual = saz.data.datasets.find(x => !/histórica/i.test(x.label));
  assert(atual.data.some(v => v === null), 'mês futuro tem que ser vazio, não zero');

  const origem = doc.querySelector('#origemList .bi-clicavel');
  origem.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert(doc.getElementById('biModalOverlay').classList.contains('open'), 'janela do BI não abriu');
  assert(txt(doc.getElementById('biModalCorpo')).length > 0, 'janela do BI vazia');

  const semNinguem = [...doc.querySelectorAll('#funilList .funil-row')]
    .filter(x => !x.classList.contains('bi-clicavel'));
  assert(semNinguem.length > 0, 'fase vazia não deveria virar botão');
}};
