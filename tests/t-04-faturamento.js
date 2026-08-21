const assert = require('assert');
const { montar, txt, porId, dados } = require('./ambiente');

module.exports = { nome: 'Faturamento: fonte única e ano inteiro', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);

  // Um número só para "quanto negociei": os dois KPIs já mostraram valores
  // diferentes na mesma tela porque um lia campo guardado à mão.
  const negociado = porId(doc, 'totalNegociado');
  assert(porId(doc, 'metaHint').indexOf(negociado) === 0,
    'meta e total negociado divergem: ' + porId(doc, 'metaHint') + ' vs ' + negociado);

  // Uma projeção só, compartilhada com o BI.
  const fat = porId(doc, 'projecaoAnual');
  const bi = txt(doc.getElementById('ritmoAno').querySelectorAll('.ritmo-celula-val')[0]);
  assert(fat === bi, 'projeções diferentes: ' + fat + ' (faturamento) vs ' + bi + ' (BI)');

  // "Prevista" já foi um campo guardado que vivia cravado em zero. Hoje é
  // cálculo — e zero pode ser a resposta certa: se ninguém está em negociação,
  // não há previsão. O teste tem que separar "zero porque é verdade" de "zero
  // porque alguém voltou a guardar o número".
  (function previstaViva() {
    const emNegociacao = (DATA.leads || []).filter(l =>
      l.fase === 'Em Negociação' || l.fase === 'Proposta Enviada');
    const esperado = emNegociacao.reduce((s, l) =>
      s + (typeof l.comissaoPrevista === 'number' ? l.comissaoPrevista : 0), 0);
    const naTela = porId(doc, 'comissaoPrevista');
    if (esperado === 0) {
      assert(emNegociacao.length === 0 || /a definir|R\$ 0/.test(naTela),
        'ninguém em negociação com valor, mas a tela mostra outra coisa: ' + naTela);
    } else {
      assert(!/^R\$ 0$/.test(naTela),
        `há ${esperado} previsto no pipeline e a tela mostra zero — prevista voltou a ser campo guardado`);
    }
    assert(!('prevista' in (DATA.comissao || {})),
      'comissao.prevista voltou a existir como campo guardado');
  })();

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
