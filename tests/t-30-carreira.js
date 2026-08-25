// O número da carreira inteira não existia em lugar nenhum: cada ano aparecia
// sozinho e a soma vivia só na cabeça dele. E o rótulo importa mais do que o
// número aqui — "Volume dos Negócios" soma preço de venda com aluguel MENSAL e
// serviço avulso. Chamar isso de VGV seria dar nome de coisa exata a uma mistura.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Total da carreira soma certo e não se chama VGV',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const anos = dom.window.eval('ANOS_HISTORICO').filter(a => a.nNegocios);

    const n = anos.reduce((s, a) => s + (a.nNegocios || 0), 0);
    const vol = anos.reduce((s, a) => s + (a.valorNegociado || 0), 0);
    const com = anos.reduce((s, a) => s + (a.comissaoTotal || 0), 0);

    const tfoot = doc.getElementById('historicoTotal');
    assert(tfoot && tfoot.textContent.trim(), 'a tabela por ano não tem linha de total da carreira');
    const brl = dom.window.eval('brl');
    [[n, 'nº de negócios'], [brl(vol), 'volume'], [brl(com), 'comissão']].forEach(([v, o]) => {
      assert(tfoot.textContent.indexOf(String(v)) !== -1,
        `a linha de total não mostra ${o} (${v}): ${tfoot.textContent.trim()}`);
    });

    // O ano corrente é vivo: a soma tem que bater com listaNegociacoes, senão
    // a carreira congela no dia em que alguém gravou o histórico.
    const anoAtual = new Date().getFullYear();
    const linhaAtual = anos.find(a => a.ano === anoAtual);
    if (linhaAtual) {
      const negs = D.listaNegociacoes || [];
      assert(linhaAtual.nNegocios === negs.length,
        `o ano corrente mostra ${linhaAtual.nNegocios} negócios e a lista tem ${negs.length}`);
      assert(linhaAtual.valorNegociado === negs.reduce((s, x) => s + (x.valor || 0), 0),
        'o volume do ano corrente não bate com a soma das negociações');
    }

    // O rótulo não pode prometer VGV: aluguel mensal e serviço avulso estão dentro.
    const cab = [...doc.querySelectorAll('th')].map(t => t.textContent.trim());
    assert(cab.indexOf('Volume dos Negócios') !== -1,
      `a coluna deveria se chamar "Volume dos Negócios", cabeçalhos: ${cab.join(' / ')}`);
    const nota = doc.getElementById('historicoNota');
    assert(nota && /não é VGV/i.test(nota.textContent),
      'a nota precisa dizer que este número não é VGV');
    // Densidade: explicação fica atrás de um clique, não aberta na tela.
    assert(nota.tagName.toLowerCase() === 'details',
      'a nota voltou a ser um parágrafo fixo — deveria ser um bloco clicável');
    assert(!nota.hasAttribute('open'), 'a nota da carreira não pode nascer aberta');
    const sum = nota.querySelector('summary');
    assert(sum && /não é VGV/i.test(sum.textContent),
      'a ressalva precisa estar no rótulo do clique, senão só quem abrir vai saber');
    assert(nota && /aproximad|comparar anos entre si/i.test(nota.textContent),
      'a nota precisa avisar que a série antiga tem locação misturada');

    // O template é a fonte.
    const tpl = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    assert(tpl.indexOf('renderTotalCarreira') !== -1,
      'a linha de carreira não está no TEMPLATE, só no HTML gerado — o próximo build desfaz');
  }
};
