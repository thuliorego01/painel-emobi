// "Fechamentos no Mês" já errou de duas maneiras diferentes.
//
// 1ª (02/09/2026): media pela dataProximaAcao — a data do PRÓXIMO passo — e
//    contava como fechado no mês corrente todo lead ganho sem próxima ação.
//    Mostrava 2 fechamentos em setembro com zero vendas no mês: eram Camilla e
//    Patrícia, fechadas em agosto, com pós-venda caindo em setembro.
//
// 2ª (04/09/2026): passou a somar leads "Fechado Ganho" MAIS imóveis "Vendido".
//    Quando o negócio tem os dois lados no CRM, ele é contado duas vezes — a
//    venda do Cód.7560 é o lead 11 (João Paulo) e o imóvel 8. E a locação, que
//    não tem lead comprador nem imóvel "Vendido", não era contada nenhuma vez.
//
// Um negócio é UMA linha em listaNegociacoes. É de lá que sai a contagem.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Fechamentos do mês: um negócio conta uma vez',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    const bloco = (tpl.match(/const fechamentosDoMes[\s\S]{0,700}/) || [''])[0];
    assert(bloco, 'o bloco fechamentosDoMes sumiu do template');

    // 1. Nunca pela data da próxima ação.
    assert(!/dataProximaAcao/.test(bloco),
      'o contador de fechamentos voltou a usar dataProximaAcao');

    // 2. A base é listaNegociacoes — não a soma de leads com imóveis.
    assert(/listaNegociacoes/.test(bloco),
      'o contador de fechamentos não lê listaNegociacoes');
    assert(!/fechamentosLeadsMes\s*\+\s*fechamentosImoveisMes/.test(tpl),
      'voltou a somar leads + imóveis: o mesmo negócio conta duas vezes');

    // 3. O número na tela bate com a conta.
    const hoje = new Date();
    const esperado = (D.listaNegociacoes || []).filter(n =>
      n && Number(n.ano) === hoje.getFullYear() && (Number(n.mesNum) - 1) === hoje.getMonth()).length;

    const kpis = doc.getElementById('homeKpis');
    assert(kpis, 'o bloco de KPIs da carteira sumiu');
    const m = kpis.textContent.replace(/\s+/g, ' ').match(/Fechamentos no Mês\s+(\d+)/);
    assert(m, `não achei "Fechamentos no Mês" em: ${kpis.textContent.replace(/\s+/g, ' ').slice(0, 120)}`);
    assert(Number(m[1]) === esperado,
      `a tela diz ${m[1]} fechamentos no mês e a conta dá ${esperado}`);

    // 4. Regressão da duplicidade: nenhum negócio do mês pode aparecer duas
    //    vezes, e cada negócio tem que ter cliente e valor — linha sem isso é
    //    linha que não dá para conferir.
    const doMes = (D.listaNegociacoes || []).filter(n =>
      n && Number(n.ano) === hoje.getFullYear() && (Number(n.mesNum) - 1) === hoje.getMonth());
    const chaves = doMes.map(n => `${n.cliente}|${n.imovel}|${n.valor}`);
    assert(new Set(chaves).size === chaves.length,
      'há negócios repetidos em listaNegociacoes no mês corrente: ' + chaves.join(' / '));
    doMes.forEach(n => {
      assert(n.cliente, 'negócio fechado no mês sem cliente: ' + JSON.stringify(n).slice(0, 120));
      assert(typeof n.valor === 'number', 'negócio fechado no mês sem valor: ' + n.cliente);
      assert(typeof n.comissao === 'number', 'negócio fechado no mês sem comissão: ' + n.cliente);
    });
  }
};
