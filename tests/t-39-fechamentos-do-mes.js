// "Fechamentos no Mês" media pela dataProximaAcao — a data do PRÓXIMO passo —
// e ainda contava como fechado no mês corrente todo lead ganho sem próxima ação
// marcada. Em 02/09/2026 mostrava 2 fechamentos em setembro com zero vendas no
// mês: eram Camilla e Patrícia, fechadas em agosto, com pós-venda caindo em
// setembro. Contador de fechamento tem que olhar a data do FECHAMENTO.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Fechamentos do mês contam pela data do fechamento',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. Nunca pela data da próxima ação.
    const bloco = (tpl.match(/const fechamentosLeadsMes[\s\S]{0,400}/) || [''])[0];
    assert(!/dataProximaAcao/.test(bloco),
      'o contador de fechamentos voltou a usar dataProximaAcao');
    assert(/dataFechamento/.test(bloco),
      'o contador de fechamentos não usa dataFechamento');

    // 2. Sem data não conta. "Não sei quando fechou" nunca pode virar
    //    "fechou este mês" — era daí que vinham os fantasmas.
    assert(!/if \(!l\.data\w+\) return true/.test(tpl),
      'lead ganho sem data está sendo contado como fechado no mês corrente');

    // 3. O número na tela tem que bater com a conta feita aqui.
    const hoje = new Date();
    const noMes = (iso) => {
      if (!iso) return false;
      const [y, m] = String(iso).split('-').map(Number);
      return y === hoje.getFullYear() && (m - 1) === hoje.getMonth();
    };
    const esperado =
      (D.leads || []).filter(l => l.fase === 'Fechado Ganho' && noMes(l.dataFechamento)).length +
      (D.imoveis || []).filter(im => im.status === 'Vendido' && noMes(im.dataVenda)).length;

    const kpis = doc.getElementById('homeKpis');
    assert(kpis, 'o bloco de KPIs da carteira sumiu');
    const m = kpis.textContent.replace(/\s+/g, ' ').match(/Fechamentos no Mês\s+(\d+)/);
    assert(m, `não achei "Fechamentos no Mês" em: ${kpis.textContent.replace(/\s+/g,' ').slice(0,120)}`);
    assert(Number(m[1]) === esperado,
      `a tela diz ${m[1]} fechamentos no mês e a conta dá ${esperado}`);
  }
};
