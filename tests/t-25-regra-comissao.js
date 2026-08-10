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

    // E precisa estar na tela de quem está disponível.
    const tela = doc.getElementById('imoveisCard').textContent;
    assert(/sozinho/.test(tela) && /em parceria/.test(tela),
      'o card do imóvel não mostra quanto ele vale para você');
  }
};
