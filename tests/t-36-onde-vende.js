// O painel sabia quanto, quando e para quem — e não sabia ONDE. A planilha
// ganhou cidade e bairro em 29/08/2026 e o histórico veio negócio a negócio.
// Duas armadilhas para evitar aqui: somar aluguel mensal com preço de venda
// (já aconteceu no "Volume dos Negócios"), e esconder a venda sem bairro,
// que faria os percentuais parecerem exatos quando não são.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Onde você vende: por bairro, só venda, sem esconder buraco',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. O histórico existe e é registro cru, não resumo.
    const h = D.negociosHistoricos || [];
    assert(Array.isArray(h) && h.length > 50,
      `negociosHistoricos tem ${h.length} registros — o histórico não foi importado`);
    h.forEach((n, i) => {
      ['ano', 'tipo', 'imovel'].forEach(c => assert(n[c] !== undefined, `registro ${i}: falta ${c}`));
      assert(typeof n.valor === 'number', `registro ${i} (${n.imovel}): valor não é número`);
    });

    // 2. A soma dos registros TEM que bater com o resumo por ano. Se divergir,
    //    existem duas verdades sobre o mesmo ano — foi para evitar isso que a
    //    importação foi conferida linha a linha antes de entrar.
    const porAno = {};
    h.forEach(n => { const a = porAno[n.ano] || (porAno[n.ano] = { n: 0, v: 0, c: 0 }); a.n++; a.v += n.valor || 0; a.c += n.comissao || 0; });
    (D.historico.anos || []).forEach(a => {
      const p = porAno[a.ano];
      if (!p || a.valorNegociado === undefined) return;
      assert(Math.abs(p.v - a.valorNegociado) < 1,
        `${a.ano}: registros somam ${p.v} e o resumo diz ${a.valorNegociado}`);
      assert(p.n === a.nNegocios,
        `${a.ano}: ${p.n} registros contra ${a.nNegocios} no resumo`);
    });

    // 3. Só venda entra no recorte por bairro.
    assert(/filter\(n => n\.tipo === 'Venda'\)/.test(tpl),
      'o recorte por bairro não filtra só vendas — vai somar aluguel mensal com preço de venda');

    // 4. Nenhum percentual guardado.
    h.forEach(n => assert(n.pct === undefined && n.percentual === undefined,
      `${n.imovel}: percentual guardado no registro — tem que ser calculado`));

    // 5. Venda sem bairro não pode sumir: ou aparece, ou os percentuais mentem.
    const vendas = h.concat(D.listaNegociacoes || []).filter(n => n.tipo === 'Venda');
    const semBairro = vendas.filter(n => !n.bairro);
    if (semBairro.length) {
      assert(/sem bairro na origem/.test(tpl),
        `${semBairro.length} venda(s) sem bairro e a tela não avisa que ficam de fora`);
    }

    // 6. A seção existe na tela.
    assert(doc.getElementById('ondeVende'), 'a seção "Onde você vende" não está na página');
  }
};
