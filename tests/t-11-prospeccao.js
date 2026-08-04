const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// A prospecção era a única parte do sistema sem rede: prazo copiado da
// planilha, vocabulário divergente (a fórmula procurava "Captada", a lista
// suspensa oferecia "Convertido em Captação") e nenhum vínculo com o imóvel
// que a abordagem gerou.
module.exports = { nome: 'Prospecção: prazo vivo e vocabulário único', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const itens = DATA.prospeccaoCaptacao || [];
  if (!itens.length) return;

  // Prazo não pode voltar a ser texto guardado.
  itens.forEach(pr => assert(!('statusPrazo' in pr),
    pr.nome + ' voltou a guardar statusPrazo — isso envelhece sozinho'));

  const el = doc.getElementById('prospeccaoList');
  const lista = txt(el);
  itens.forEach(pr => assert(lista.includes(pr.nome), pr.nome + ' sumiu da aba'));

  // KPIs: a aba não tinha nenhum, e sem eles não há taxa de conversão.
  const kpis = txt(doc.getElementById('prospeccaoKpis'));
  assert(/Em prospecção/.test(kpis) && /Taxa de conversão/.test(kpis), 'faltam os KPIs da prospecção');

  // Encerrada não pode continuar sendo cobrada como atrasada — era o bug
  // latente: converter uma prospecção a deixava vermelha para sempre.
  const encerradas = itens.filter(pr => ['Convertido em Captação', 'Descartado'].includes(pr.status));
  const acoes = txt(doc.getElementById('acoesAgoraList'));
  encerradas.forEach(pr => assert(!acoes.includes(pr.nome),
    pr.nome + ' já foi encerrada e não pode aparecer como pendência'));

  // Agrupamento e clique, no padrão do resto do painel.
  const grupos = [...el.querySelectorAll('[data-pr-grupo]')];
  assert(grupos.length > 0, 'a prospecção precisa ser agrupada por situação');
  const item = el.querySelector('[data-prospeccao]');
  assert(item, 'linha de prospecção não é clicável');
  item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const jan = txt(doc.getElementById('biModalCorpo'));
  assert(/Histórico/.test(jan), 'a janela precisa mostrar o histórico de tentativas');
  assert(/Situação|Próxima ação/.test(jan), 'a janela está incompleta');

  // Indicador de fora do Conecta TR tem que ser sinalizado: se a captação
  // vinga, ele fica sem bonificação e o programa não registra a indicação.
  const indicadores = new Set((DATA.conectaTR && DATA.conectaTR.indicadoresLista || []).map(i => i.nome));
  itens.filter(pr => pr.indicadorNome).forEach(pr => {
    const cadastrado = [...indicadores].some(n => n.includes(pr.indicadorNome));
    assert(cadastrado === (pr.indicadorCadastrado !== false),
      `o cadastro de ${pr.indicadorNome} no Conecta TR não bate com o marcado no dado`);
    if (!cadastrado) assert(/fora do Conecta TR|não está cadastrado/.test(lista + jan),
      pr.indicadorNome + ' está fora do Conecta TR e o painel não avisa');
  });
}};
