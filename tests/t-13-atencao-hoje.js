const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

// "Atenção Hoje" virava uma linha só ao lado de uma coluna cheia — espaço
// morto num dos pontos mais nobres da tela. Em dia sem atrasados ele passa a
// responder a pergunta seguinte: quem vence primeiro.
module.exports = { nome: 'Atenção Hoje não fica vazia em dia bom', rodar: async () => {
  const { dom, doc } = await montar();
  const DATA = dados(dom);
  const card = doc.getElementById('alertCard');
  const atrasados = (DATA.leads || []).filter(l => l.status === 'Atrasado');
  const conteudo = txt(card);
  assert(conteudo.length > 0, 'o card de atenção não pode ficar vazio');

  if (atrasados.length === 0) {
    assert(/Nenhum lead atrasado/.test(conteudo), 'faltou o aviso de tudo em dia');
    assert(card.querySelectorAll('.prox-linha').length > 0,
      'sem atrasados, o card precisa mostrar quem vence primeiro — senão é espaço morto');
    // Ordenado do mais próximo ao mais distante.
    const dias = [...card.querySelectorAll('.prox-prazo')].map(x => {
      const t = txt(x);
      if (/hoje/.test(t)) return 0;
      if (/amanhã/.test(t)) return 1;
      return Number((t.match(/em (\d+) dias/) || [])[1] || 99);
    });
    const ordenado = [...dias].sort((a, b) => a - b);
    assert(JSON.stringify(dias) === JSON.stringify(ordenado),
      'a lista precisa vir do mais urgente ao menos urgente: ' + dias.join(','));
  } else {
    assert(card.querySelectorAll('.alert-box').length === atrasados.length,
      'todos os atrasados precisam aparecer');
  }

  // Ninguém já atrasado pode reaparecer como "a vencer".
  const nomesProx = [...card.querySelectorAll('.prox-linha b')].map(x => txt(x));
  atrasados.forEach(l => assert(!nomesProx.includes(l.nome),
    l.nome + ' está atrasado e não pode constar como "a vencer"'));
}};
