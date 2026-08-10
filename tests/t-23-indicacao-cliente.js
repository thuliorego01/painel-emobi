// Indicação de CLIENTE comprador não é indicação de imóvel: nunca vira
// captação. Enquanto as duas moravam na mesma lista, a do cliente ficava
// para sempre em "aguardando captação" e ia disparar alerta de indicação
// parada para uma coisa que não tem para onde andar. Ciclo próprio e fora
// das contas de captação.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Indicação de cliente tem ciclo próprio',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);
    const lista = (DATA.conectaTR && DATA.conectaTR.lista) || [];
    const clientes = lista.filter(x => x.tipo === 'Cliente');

    // Todo item precisa declarar o tipo — sem isso a regra vira adivinhação.
    lista.forEach(x => assert(x.tipo === 'Cliente' || x.tipo === 'Imóvel',
      `${x.protocolo} está sem tipo (Imóvel ou Cliente)`));
    // E o campo de texto livre que fazia esse papel não pode voltar.
    assert(!lista.some(x => 'tipoIndicacao' in x),
      'tipoIndicacao voltou: o tipo é campo próprio, não observação solta');

    clientes.forEach(x => {
      assert(!x.imovelId, `${x.protocolo} é indicação de cliente e não pode vincular imóvel`);
      assert(x.cliente, `${x.protocolo} é indicação de cliente e não diz quem é o cliente`);
      assert(['Registrada', 'Virou Lead', 'Comprou', 'Encerrada'].includes(x.status),
        `${x.protocolo} usa um status que não existe no ciclo de cliente: "${x.status}"`);
      if (x.leadId !== undefined)
        assert((DATA.leads || []).some(l => String(l.id) === String(x.leadId)),
          `${x.protocolo} aponta para um lead que não existe (${x.leadId})`);
      assert(!x.valorDevido, `${x.protocolo}: bonificação de indicação de cliente ainda não tem regra`);
    });

    if (!clientes.length) return;

    // Não pode entrar na conta de captação nem no bônus.
    const ehCliente = (x) => x.tipo === 'Cliente';
    const registradasImovel = lista.filter(x => !ehCliente(x) && x.status === 'Registrada').length;
    const kpi = Number((doc.getElementById('ctrRegistradas') || {}).textContent);
    assert(kpi === registradasImovel,
      `"Aguardando captação" deveria contar só indicação de imóvel: esperava ${registradasImovel}, achei ${kpi}`);


    // E precisa ter lugar próprio na tela.
    const tela = doc.getElementById('conectaTRList').textContent;
    assert(/Clientes indicados/.test(tela),
      'indicação de cliente não tem grupo próprio na lista');
    clientes.forEach(x => assert(tela.includes(x.cliente),
      `${x.cliente} não aparece na lista do Conecta TR`));
  }
};
