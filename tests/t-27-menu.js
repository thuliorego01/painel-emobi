// O menu mostrava o número só no "Início" — que é onde você VÊ o resumo, não
// onde resolve. Saber que há 6 pendências sem saber onde elas estão obriga a
// abrir a tela inicial para navegar de novo. E o total do menu tem que bater
// com o número herói da abertura: dois lugares dizendo o mesmo, com contas
// diferentes, é como as duas verdades de comissão que a gente já matou.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Menu aponta onde está o trabalho',
  async rodar() {
    const { dom, doc } = await montar();
    const a = dom.window.eval('computeAcoesUrgentes')();

    const badge = (id) => {
      const el = doc.getElementById('navBadge' + id);
      if (!el) return null;
      const visivel = el.style.display !== 'none';
      return visivel ? Number(el.textContent) : 0;
    };

    // O total do menu e o herói da abertura são o MESMO número.
    const heroi = doc.querySelector('.u-herói b');
    if (heroi) assert(Number(heroi.textContent) === badge('Inicio'),
      `menu diz ${badge('Inicio')} e a abertura diz ${heroi.textContent}`);
    assert(badge('Inicio') === a.total, 'o badge do Início não bate com a conta de pendências');

    // E o total tem que estar distribuído, não só somado num lugar.
    const secoes = ['Agenda', 'Pipeline', 'Imoveis', 'Prospeccao', 'Conectatr'];
    secoes.forEach(s => assert(doc.getElementById('navBadge' + s),
      `a seção ${s} não tem onde mostrar pendência`));
    const soma = secoes.reduce((t, s) => t + badge(s), 0);
    if (a.total > 0) assert(soma > 0,
      'há pendências, mas nenhuma seção do menu indica onde elas estão');

    // Grupo com um item só é rótulo que organiza nada.
    const filhos = [...doc.querySelectorAll('#tabsNav > *')];
    let atual = null, cont = {};
    filhos.forEach(el => {
      if (el.classList.contains('nav-group-label')) { atual = el.textContent.trim(); cont[atual] = 0; }
      else if (atual) cont[atual]++;
    });
    Object.entries(cont).forEach(([g, n]) => assert(n >= 2,
      `o grupo "${g}" tem ${n} item — rótulo de grupo para um item só é ruído`));

    // Recolhido, a urgência não pode sumir.
    const css = require('fs').readFileSync(require('./ambiente').ALVO, 'utf8');
    assert(!/\.sidebar\.collapsed[^{]*\.nav-badge[^{]*\{[^}]*display\s*:\s*none/.test(css),
      'o menu recolhido esconde o aviso de pendência');
  }
};
