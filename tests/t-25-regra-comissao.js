// A regra de comissão é do NEGÓCIO, não do imóvel: 5% sobre a venda, metade
// em caso de parceria, 70% do que couber a você. Antes cada imóvel carregava
// um `pctComissao` — vazio nos 24, lido por ninguém, e com um nome que
// convidava ao erro de gravar percentual de VENDA onde era de CAPTAÇÃO.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Comissão sai da regra, não de campo por imóvel',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);
    const regra = DATA.regraComissao;
    assert(regra && regra.pctVenda && regra.suaParte, 'a regra de comissão sumiu do data.json');
    assert(!(DATA.imoveis || []).some(i => 'pctComissao' in i),
      'pctComissao voltou para o imóvel: a regra é do negócio, não do imóvel');

    const calc = dom.window.eval('comissaoEsperada');
    const im = (DATA.imoveis || []).find(i =>
      i.status === 'Disponível' && i.valor && i.tipoOperacao !== 'Locação');
    if (!im) return;

    const c = calc(im);
    const total = im.valor * regra.pctVenda;
    assert(Math.abs(c.total - total) < 0.01, 'comissão total fora da regra');
    assert(Math.abs(c.sozinho - total * regra.suaParte) < 0.01, 'a parte solo fora da regra');
    assert(Math.abs(c.parceria - total * 0.5 * regra.suaParte) < 0.01, 'a parte em parceria fora da regra');

    // Locação não entra: o percentual de venda não se aplica.
    const loc = (DATA.imoveis || []).find(i => i.tipoOperacao === 'Locação');
    if (loc) assert(calc(loc) === null, 'locação não pode usar o percentual de venda');

    // Exceção por negócio manda sobre a regra.
    // Simula um acordo fora do padrão: o mecanismo tem que valer mesmo quando
    // nenhum imóvel usa exceção hoje.
    const simulado = calc(Object.assign({}, im, { pctVendaAcordado: 0.03 }));
    assert(simulado && Math.abs(simulado.pct - 0.03) < 1e-9 && simulado.excecao,
      'o percentual acordado no imóvel não prevalece sobre a regra');
    assert(Math.abs(simulado.total - im.valor * 0.03) < 0.01,
      'a exceção não foi aplicada no cálculo da comissão');

    const comExcecao = (DATA.imoveis || []).find(i => typeof i.pctVendaAcordado === 'number');
    if (comExcecao) {
      const ce = calc(comExcecao);
      assert(ce && Math.abs(ce.pct - comExcecao.pctVendaAcordado) < 1e-9,
        `${comExcecao.nome}: o percentual acordado não prevaleceu sobre a regra`);
      if (comExcecao.pctVendaAcordado !== regra.pctVenda)
        assert(ce.excecao, 'exceção não está marcada como exceção');
    }

    // Negócio cujo percentual não se sabe não pode fingir que segue a regra.
    const pend = (DATA.listaNegociacoes || []).filter(n => n.pctVendaAConfirmar);
    pend.forEach(n => assert(n.pctVenda === undefined,
      `${n.imovel} está marcado como "a confirmar" e ao mesmo tempo tem percentual gravado`));
    if (pend.length) {
      const bloco = (doc.getElementById('pctAConfirmar') || {}).textContent || '';
      assert(/a confirmar/i.test(bloco), 'os negócios de percentual desconhecido não aparecem no Faturamento');
      pend.forEach(n => assert(bloco.includes(n.imovel),
        `${n.imovel} não está na lista de percentual a confirmar`));
    }

    // E precisa estar na tela de quem está disponível.
    const tela = doc.getElementById('imoveisCard').textContent;
    assert(/sozinho/.test(tela) && /em parceria/.test(tela),
      'o card do imóvel não mostra quanto ele vale para você');
  }
};
