const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// A tela inicial respondia "quanto tenho em estoque" quando a pergunta de quem
// abre o painel é "como estou e o que faço agora". E o V.G.C. teórico
// (carteira inteira × 5% × 70%) aparecia como se fosse dinheiro previsto.
module.exports = { nome: 'Início: dinheiro real antes de estoque', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const home = doc.getElementById('panel-inicio');

  // O ano vem antes da carteira: é a primeira pergunta de quem abre o painel.
  const visiveis = [...home.children].filter(c => c.style.display !== 'none');
  const idxAno = visiveis.findIndex(c => /Como está o seu ano/.test(txt(c)));
  const idxCarteira = visiveis.findIndex(c => /Sua carteira/.test(txt(c)));
  assert(idxAno > -1, 'faltou o bloco do ano');
  assert(idxCarteira === -1 || idxAno < idxCarteira, 'estoque não pode vir antes do resultado');

  const ano = txt(doc.getElementById('anoResumo'));
  assert(/Recebido em/.test(ano), 'faltou o recebido');
  assert(/a receber/i.test(ano), 'faltou o que está fechado e não entrou');
  assert(/Falta para a meta/.test(ano), 'faltou o que falta para a meta');
  assert(/(atrás|à frente) do calendário/.test(ano), 'faltou o ritmo contra o calendário');

  // Os números da Home têm que bater com o Faturamento — uma fonte só.
  const recebidoFat = txt(doc.getElementById('comissaoPaga'));
  assert(ano.includes(recebidoFat), `recebido da Home (${ano.slice(0, 60)}) não bate com o Faturamento (${recebidoFat})`);
  const aReceberFat = txt(doc.getElementById('comissaoAguardando'));
  assert(ano.includes(aReceberFat), 'a receber da Home não bate com o Faturamento');

  // O potencial teórico não pode se apresentar como previsão.
  const kpis = txt(doc.getElementById('homeKpis'));
  assert(!/V\.G\.C\./.test(kpis) || /teto, não previsão/.test(kpis),
    'o potencial da carteira precisa dizer que é teto, não previsão');
  assert(!/Pipeline \(Provável\)/.test(kpis), '"Pipeline (Provável)" some: somava só quem tinha valor preenchido');
  const ativos = (DATA.leads || []).filter(l => !['Inativo','Fechado Ganho','Fechado Perdido'].includes(l.fase));
  const semValor = ativos.filter(l => !(typeof l.valor === 'number' && l.valor > 0)).length;
  if (semValor) assert(/sem valor informado/.test(kpis),
    'com lead sem valor, o KPI precisa dizer quantos ficaram de fora da soma');

  // KPI de contagem abre quem está lá dentro.
  const clicaveis = [...doc.querySelectorAll('#homeKpis [data-kpi]')];
  assert(clicaveis.length >= 3, 'os KPIs de contagem precisam ser clicáveis');
  clicaveis[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert(doc.getElementById('biModalOverlay').classList.contains('open'), 'KPI não abriu a janela');

  // Bloco vazio não ocupa espaço na tela de abertura.
  const compromissos = doc.getElementById('compromissosCard');
  if (compromissos && !txt(compromissos)) {
    assert(compromissos.style.display === 'none', 'bloco de compromissos vazio precisa sumir');
  }

  // O termômetro é análise: mora no BI, não na tela de abertura.
  assert(!doc.querySelector('#panel-inicio #termometroFunil'), 'o termômetro voltou para a Home');
  assert(doc.querySelector('#panel-bicomercial #termometroFunil'), 'o termômetro sumiu do BI');
}};
