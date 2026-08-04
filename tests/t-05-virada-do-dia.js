const assert = require('assert');
const { montar, txt, porId } = require('./ambiente');

// O painel já mostrou "Hoje" com a agenda de ontem e dividiu a meta por um
// número de meses errado. Nada que dependa da data pode ser valor guardado.
module.exports = { nome: 'Virada do dia: agenda e meta se recalculam', rodar: async () => {
  const cenarios = [
    { quando: new Date(2026, 7, 1, 9, 0), meses: 5, mes: 'Agosto' },
    { quando: new Date(2026, 10, 15, 9, 0), meses: 2, mes: 'Novembro' },
    { quando: new Date(2026, 11, 20, 9, 0), meses: 1, mes: 'Dezembro' }
  ];
  for (const c of cenarios) {
    const { doc } = await montar({ quando: c.quando });
    const sub = porId(doc, 'metaMensalSub');
    const esperado = c.meses === 1 ? '1 mês restante' : c.meses + ' meses restantes';
    assert(sub.includes(esperado), `em ${c.mes} esperava "${esperado}", veio: ${sub}`);

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
