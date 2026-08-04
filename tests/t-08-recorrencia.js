const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// Cliente que vende um imóvel e volta como comprador acontecia três vezes e
// não aparecia em número nenhum — vivia solto em texto de observação.
module.exports = { nome: 'Clientes que voltam: vínculo por ID', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);

  // Vínculo tem que ser por ID nas duas pontas; nome já custou histórico aqui.
  const comVinculo = (DATA.listaNegociacoes || [])
    .filter(n => n.vendedorLeadId !== undefined || n.compradorLeadId !== undefined);
  assert(comVinculo.length > 0, 'nenhuma negociação está ligada a um lead');
  const ids = new Set((DATA.leads || []).map(l => String(l.id)));
  comVinculo.forEach(n => {
    [n.vendedorLeadId, n.compradorLeadId].filter(v => v !== undefined).forEach(v =>
      assert(ids.has(String(v)), `negociação "${n.imovel}" aponta para lead inexistente (${v})`));
  });

  const bloco = txt(doc.getElementById('clientesVoltam'));
  assert(bloco.length > 0, 'bloco de clientes que voltam não renderizou');

  // Mesma régua do painel: data exata quando existe, senão ano-mês. Só o mês
  // é conhecido na maioria das negociações antigas.
  const seusNegocios = (l) => (DATA.listaNegociacoes || []).filter(n =>
    String(n.vendedorLeadId) === String(l.id) || String(n.compradorLeadId) === String(l.id));
  const ehAnterior = (n, l) => n.data
    ? n.data < l.dataEntrada
    : (n.ano && n.mesNum ? (n.ano + '-' + String(n.mesNum).padStart(2, '0')) < l.dataEntrada.slice(0, 7) : false);

  // O negócio ATUAL do cliente não pode marcá-lo como recorrente: senão todo
  // mundo que fecha vira "cliente que voltou" no mesmo dia.
  (DATA.leads || [])
    .filter(l => seusNegocios(l).length > 0 && !seusNegocios(l).some(n => ehAnterior(n, l)))
    .forEach(l => assert(!bloco.includes(l.nome),
      `${l.nome} fechou o negócio DEPOIS de entrar como lead — não é cliente recorrente`));

  // Quem tem negócio anterior precisa do selo no card e da linha no bloco.
  const esperados = (DATA.leads || []).filter(l => seusNegocios(l).some(n => ehAnterior(n, l)));
  esperados.forEach(l => assert(bloco.includes(l.nome), l.nome + ' deveria estar em "clientes que voltam"'));
  const selos = [...doc.querySelectorAll('.selo-recorrente')];
  assert(selos.length === esperados.length,
    `esperava ${esperados.length} selos de cliente recorrente, achei ${selos.length}`);

  // O detalhe do negócio anterior tem que estar ESCRITO no card. Já esteve num
  // title do navegador: o usuário via só o cursor de interrogação, sem balão.
  const linhas = [...doc.querySelectorAll('.lead-recorrente')];
  assert(linhas.length === esperados.length,
    `esperava ${esperados.length} linhas explicando a recorrência, achei ${linhas.length}`);
  linhas.forEach(li => {
    const t = txt(li);
    assert(/em \w+\/\d{4}/.test(t), 'a linha precisa dizer quando foi o negócio anterior: ' + t);
    assert(/R\$/.test(t), 'a linha precisa dizer quanto rendeu: ' + t);
  });
  selos.forEach(s => assert(!s.hasAttribute('title'),
    'o selo não pode depender de title: o balão do navegador nem sempre aparece'));
  assert(!/cursor:\s*help/.test(require('fs').readFileSync(require('./ambiente').ALVO, 'utf8')),
    'cursor:help promete um balão que pode não aparecer');
}};
