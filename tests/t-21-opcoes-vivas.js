// Opção compatível que saiu do ar não pode parecer oferta viva. Caso real:
// o Cód. 7454 foi vendido pela concorrência e continuava listado para a
// Daianne como se estivesse à venda — você só descobriria ao mandar para ela.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Opção compatível mostra o status do imóvel',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);

    // Quem saiu da carteira não pode aparecer em lugar nenhum da tela.
    const TODOS = dom.window.eval('IMOVEIS_TODOS');
    const fora = TODOS.filter(im => im.status === 'Fora da carteira');
    assert(!(DATA.imoveis || []).some(im => im.status === 'Fora da carteira'),
      'imóvel fora da carteira voltou para o estoque visível');
    // No log ele PODE (e deve) aparecer — é lá que ele passa a viver.
    // O que não pode é continuar no estoque ou numa sugestão de cliente.
    const estoque = doc.getElementById('imoveisCard');
    const sugestoes = Array.from(doc.querySelectorAll('.match-line')).map(e => e.textContent).join(' ');
    fora.forEach(im => {
      const cod = (String(im.nome).match(/Cód\.\s*(\d+)/) || [])[1];
      if (!cod) return;
      const re = new RegExp('Cód\\.\\s*' + cod + '\\b');
      assert(!estoque || !re.test(estoque.textContent),
        `${im.nome} saiu da carteira e continua no inventário`);
      assert(!re.test(sugestoes),
        `${im.nome} saiu da carteira e continua sendo sugerido a cliente`);
    });
    const porCod = new Map();
    (DATA.imoveis || []).forEach(im => {
      const m = String(im.nome || '').match(/Cód\.\s*(\d+)/);
      if (m) porCod.set(m[1], im);
    });

    // Nenhum lead pode recomendar um imóvel que saiu da carteira.
    (DATA.leads || []).forEach(l => {
      (l.imoveisCompativeis || []).forEach(ref => {
        const im = porCod.get((String(ref).match(/(\d+)/) || [])[1]);
        assert(im, `${l.nome}: "${ref}" não existe mais na carteira`);
        assert(im.status !== 'Fora da carteira',
          `${l.nome}: "${ref}" saiu da carteira (${im.motivoSaida || 'sem motivo'}) e continua na lista de opções`);
      });
    });

    // E o que não está disponível precisa estar marcado na tela.
    const alvo = (DATA.leads || []).find(l =>
      (l.imoveisCompativeis || []).some(ref => {
        const im = porCod.get((String(ref).match(/(\d+)/) || [])[1]);
        return im && im.status !== 'Disponível';
      }));
    if (alvo) {
      const card = doc.querySelector(`[data-lead-ref="${alvo.id}"], [data-lead-nome="${alvo.nome}"]`);
      assert(card, `card do lead ${alvo.nome} não encontrado`);
      const linha = card.querySelector('.match-line');
      assert(linha, `${alvo.nome}: sem a linha de imóveis compatíveis`);
      assert(linha.querySelector('.match-chip.morto'),
        `${alvo.nome} tem opção indisponível, mas nada na tela diz isso`);
      assert(/ainda disponível/.test(linha.textContent),
        `${alvo.nome}: a contagem devia separar o que ainda está disponível`);
    }
  }
};
