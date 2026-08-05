const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// O vínculo indicação → imóvel era o ÍNDICE da posição no array. Removemos três
// imóveis num dia e 4 de 6 indicações passaram a apontar para o imóvel errado —
// em silêncio, porque a tela mostrava só "🔗 ID 25".
module.exports = { nome: 'Conecta TR: vínculo estável e programa medido', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const ctr = DATA.conectaTR || {};
  const itens = ctr.lista || [];
  if (!itens.length) return;

  // Índice posicional não pode voltar.
  itens.forEach(it => assert(!('vinculadoId' in it),
    it.protocolo + ' voltou a usar índice de posição como vínculo'));

  // Todo vínculo tem que resolver para um imóvel que existe.
  const nomes = new Set((DATA.imoveis || []).map(i => i.nome));
  itens.filter(it => it.imovelCarteira).forEach(it =>
    assert(nomes.has(it.imovelCarteira),
      `${it.protocolo} aponta para "${it.imovelCarteira}", que não está na carteira`));

  // E o vínculo tem que aparecer com NOME na tela, não como número opaco.
  const painel = doc.getElementById('panel-conectatr');
  const chips = [...painel.querySelectorAll('.ctr-mini-chip')].map(x => txt(x));
  assert(!chips.some(c => /^🔗 ID \d+$/.test(c)), 'o vínculo voltou a ser exibido como número');
  const comVinculo = itens.filter(it => it.imovelCarteira);
  if (comVinculo.length) assert(chips.some(c => /^🔗 /.test(c)), 'nenhum vínculo aparece na tela');

  // Nome do indicador uniforme entre cadastro e indicação — já perdemos a
  // contagem da Flávia por causa de "Flávia" vs "Flávia Costa Marinho".
  const porId = new Map((ctr.indicadoresLista || []).map(i => [String(i.id), i.nome]));
  itens.filter(it => it.indicadorId !== undefined).forEach(it =>
    assert(porId.get(String(it.indicadorId)) === it.indicador,
      `${it.protocolo}: indicador "${it.indicador}" difere do cadastro "${porId.get(String(it.indicadorId))}"`));

  // Zero devido não é defeito, é a regra — mas precisa estar escrito.
  const hint = txt(doc.getElementById('ctrValorDevidoHint'));
  assert(hint && hint !== '—', 'o "Valor Devido" precisa explicar por que está no valor que está');

  // Bônus por captação: existia na regra e não era medido.
  if (ctr.bonusCaptacao) {
    const b = txt(doc.getElementById('ctrBonus'));
    assert(/Bônus:/.test(b) && /a cada \d+ (indicações|captações)/.test(b),
      'o bônus não está sendo medido');
    // A base do bônus tem que estar escrita: contar indicação e escrever
    // "captação" (ou o contrário) engana o indicador.
    assert(new RegExp('Você está em').test(b), 'o bônus precisa dizer em quanto você está');
  }

  // Indicação parada precisa gritar: o indicador está esperando notícia.
  const paradas = itens.filter(it => {
    if (it.status !== 'Registrada' || !it.data) return false;
    const dias = Math.floor((Date.now() - new Date(it.data + 'T00:00:00').getTime()) / 86400000);
    return dias >= 15;
  });
  if (paradas.length) {
    const aviso = txt(doc.getElementById('ctrParadas'));
    assert(/parada/.test(aviso), 'indicação parada há mais de 15 dias sem alerta');
    paradas.forEach(it => assert(aviso.includes(it.imovel), it.imovel + ' não aparece no alerta'));
  }
}};
