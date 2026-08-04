const assert = require('assert');
const { montar, dados } = require('./ambiente');

// Guardas contra as classes de erro que já morderam este painel.
module.exports = { nome: 'Integridade: sem campo morto e sem erro de JS', rodar: async () => {
  const erros = [];
  const { doc, dom } = await montar();
  dom.window.addEventListener('error', e => erros.push(e.message));
  const DATA = dados(dom);

  // Campos que viraram cálculo ao vivo não podem voltar como valor guardado.
  const mortos = [
    ['leads[].statusReativacao', (DATA.leads || []).some(l => 'statusReativacao' in l)],
    ['meta2026.realizado', DATA.meta2026 && 'realizado' in DATA.meta2026],
    ['comissao.paga', DATA.comissao && 'paga' in DATA.comissao],
    ['metaMensal.metaMensalDinamica', DATA.metaMensal && 'metaMensalDinamica' in DATA.metaMensal]
  ].filter(([, existe]) => existe).map(([nome]) => nome);
  assert(mortos.length === 0, 'campo guardado ressuscitou: ' + mortos.join(', '));

  // Renomear um lead já desconectou o histórico dele em silêncio: o painel
  // mostrava "2 registros" para quem tinha 5. Todo lead precisa ter, no mínimo,
  // o próprio cadastro no histórico — e o vínculo tem que ser por ID.
  const semHistorico = (DATA.leads || []).filter(l =>
    !(DATA.logAtividades || []).some(a => String(a.leadId) === String(l.id))
  ).map(l => l.nome);
  assert(semHistorico.length === 0,
    'lead sem nenhuma entrada ligada por ID (histórico desconectado?): ' + semHistorico.join(', '));

  // Entrada de log que cita um lead pelo nome sem carregar o ID é vínculo frágil.
  const nomes = new Map((DATA.leads || []).map(l => [l.nome, l.id]));
  const fracos = (DATA.logAtividades || [])
    .filter(a => a.leadId === undefined && nomes.has(a.lead))
    .map(a => a.lead + ' (' + a.data + ')');
  assert(fracos.length === 0, 'log ligado só por nome: ' + fracos.join(', '));

  // Telefone só em dígitos, para não tropeçar em cruzamento futuro.
  const mascarados = (DATA.imoveis || []).filter(i => i.telefone && !/^\d+$/.test(String(i.telefone)));
  assert(mascarados.length === 0, 'telefone com máscara em: ' + mascarados.map(i => i.nome).join(', '));

  assert(erros.length === 0, 'erro de JS ao carregar: ' + erros.join(' | '));
  assert(doc.querySelectorAll('.tab-panel').length >= 8, 'sumiu alguma aba');
}};
