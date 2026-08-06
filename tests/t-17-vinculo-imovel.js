const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// O bug #2 da semana: o vínculo indicação→imóvel era a POSIÇÃO no array.
// Migrei para o NOME, o que já era melhor — mas nome guardado em outro
// registro é uma CÓPIA, e cópia dessincroniza. Agora é ID, e o nome é
// calculado na hora. O teste prova que renomear não quebra nada.
module.exports = { nome: 'Vínculo com imóvel sobrevive a renomeio', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);

  // Todo imóvel precisa de id — sem ele, quem referencia inventa chave frágil.
  const semId = (DATA.imoveis || []).filter(i => i.id === undefined || i.id === null);
  assert(semId.length === 0, 'imóvel sem id: ' + semId.map(i => i.nome).join(', '));
  // Vínculo resolve contra a carteira INTEIRA, inclusive o que já saiu dela:
  // uma indicação recusada ou um imóvel vendido pela concorrência somem da
  // tela, mas o log e o Conecta TR continuam apontando para eles.
  const TODOS = dom.window.eval('IMOVEIS_TODOS');
  const ids = TODOS.map(i => String(i.id));
  assert(ids.length === new Set(ids).size, 'há id de imóvel duplicado');

  // Nome de imóvel não pode estar copiado em outro registro.
  assert(!(DATA.conectaTR.lista || []).some(x => 'imovelCarteira' in x),
    'a indicação voltou a guardar o nome do imóvel');
  assert(!(DATA.leads || []).some(l => 'imovelNegociado' in l),
    'o lead voltou a guardar o nome do imóvel');

  // E os vínculos resolvem.
  const idsSet = new Set(ids);
  (DATA.conectaTR.lista || []).filter(x => x.imovelId !== undefined).forEach(x =>
    assert(idsSet.has(String(x.imovelId)), `${x.protocolo} aponta para imóvel inexistente`));
  (DATA.leads || []).filter(l => l.imovelId !== undefined).forEach(l =>
    assert(idsSet.has(String(l.imovelId)), `${l.nome} aponta para imóvel inexistente`));

  // O nome tem que aparecer na tela — resolvido, não guardado.
  const comVinculo = (DATA.conectaTR.lista || []).filter(x => x.imovelId !== undefined);
  if (comVinculo.length) {
    const alvo = (DATA.imoveis || []).find(i => String(i.id) === String(comVinculo[0].imovelId));
    const painel = txt(doc.getElementById('panel-conectatr'));
    const pedaco = alvo.nome.replace(/\s*\(Cód\..*/, '').slice(0, 24);
    assert(painel.includes(pedaco),
      `o nome do imóvel vinculado não aparece na tela: esperava "${pedaco}"`);
  }
}};
