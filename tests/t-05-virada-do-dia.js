const assert = require('assert');
const { montar, txt, porId } = require('./ambiente');

// O painel já mostrou "Hoje" com a agenda de ontem e dividiu a meta por um
// número de meses errado. Nada que dependa da data pode ser valor guardado.
module.exports = { nome: 'Virada do dia: agenda e meta se recalculam', rodar: async () => {
  // O que sobra do ano é FRAÇÃO, não mês cheio: em 22/08 agosto já correu 71%,
  // e contá-lo inteiro divide a falta por 5 em vez de 4,3 — o esforço mensal
  // sai 16% menor do que é. Aqui o esperado é calculado, não escrito à mão:
  // teste que repete a conta do código não descobre nada, mas teste que repete
  // o RESULTADO da conta trava a data em que ele foi escrito.
  const sobra = (d) => {
    const ano = d.getFullYear();
    const dias = ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0) ? 366 : 365;
    const diaDoAno = Math.floor((d - new Date(ano, 0, 1)) / 86400000) + 1;
    return Math.max(0.25, 12 - (diaDoAno / dias) * 12);
  };
  const cenarios = [
    { quando: new Date(2026, 7, 1, 9, 0), mes: 'Agosto' },
    { quando: new Date(2026, 10, 15, 9, 0), mes: 'Novembro' },
    { quando: new Date(2026, 11, 20, 9, 0), mes: 'Dezembro' }
  ];
  for (const c of cenarios) {
    const { doc } = await montar({ quando: c.quando });
    const sub = porId(doc, 'metaMensalSub');
    const m = Math.round(sobra(c.quando) * 10) / 10;
    const esperado = m === 1 ? '1 mês' : (Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',')) + ' meses';
    assert(sub.includes(esperado), `em ${c.mes} esperava "${esperado}", veio: ${sub}`);
    // Em nenhum cenário o divisor pode ser o mês cheio arredondado para cima.
    const cheio = 12 - c.quando.getMonth();
    if (Math.abs(sobra(c.quando) - cheio) > 0.05) {
      assert(!sub.includes(cheio + ' meses restantes'),
        `em ${c.mes} voltou a contar mês cheio (${cheio}) em vez da fração`);
    }

    const linhas = [...doc.querySelectorAll('#metaMensalTabela tr')];
    assert(linhas.length === 12, `em ${c.mes} a tabela deveria ter 12 meses`);
    const atual = linhas.filter(l => /mês atual/.test(txt(l)));
    assert(atual.length === 1, `em ${c.mes} deveria haver exatamente um mês marcado como atual`);
    assert(txt(atual[0]).startsWith(c.mes), `o mês atual deveria ser ${c.mes}, veio ${txt(atual[0])}`);

    // Agenda: nada pode aparecer como "hoje" sem ser do dia de hoje.
    const dia = doc.getElementById('agendaHojeList') || doc.getElementById('semanaStrip');
    assert(dia, 'faixa da semana/agenda ausente');
  }
}};
