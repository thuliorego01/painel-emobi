const assert = require('assert');
const { montar, txt, porId } = require('./ambiente');

module.exports = { nome: 'Faturamento: fonte única e ano inteiro', rodar: async () => {
  const { dom, doc } = await montar();

  // Um número só para "quanto negociei": os dois KPIs já mostraram valores
  // diferentes na mesma tela porque um lia campo guardado à mão.
  const negociado = porId(doc, 'totalNegociado');
  assert(porId(doc, 'metaHint').indexOf(negociado) === 0,
    'meta e total negociado divergem: ' + porId(doc, 'metaHint') + ' vs ' + negociado);

  // Uma projeção só, compartilhada com o BI.
  const fat = porId(doc, 'projecaoAnual');
  const bi = txt(doc.getElementById('ritmoAno').querySelectorAll('.ritmo-celula-val')[0]);
  assert(fat === bi, 'projeções diferentes: ' + fat + ' (faturamento) vs ' + bi + ' (BI)');

  assert(!/^R\$ 0$/.test(porId(doc, 'comissaoPrevista')), 'prevista voltou a ser zero cravado');

  const linhas = [...doc.querySelectorAll('#metaMensalTabela tr')];
  assert(linhas.length === 12, 'a tabela mensal tem que mostrar o ano inteiro, tem ' + linhas.length);
  assert(/Janeiro/.test(txt(linhas[0])), 'a tabela não começa em Janeiro');
  assert(/Nada entrou/.test(porId(doc, 'metaMensalTabela')), 'mês sem entrada tem que ser marcado');

  assert(doc.querySelectorAll('#negList .neg-mes').length >= 4, 'faltou agrupar negociações por mês');
  const linha = doc.querySelector('#negList .neg-row.bi-clicavel');
  linha.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert(/Sua comissão/.test(txt(doc.getElementById('biModalCorpo'))), 'detalhe da negociação incompleto');
  assert(doc.querySelector('.neg-pendente'), 'comissão a receber precisa de destaque próprio');
}};
