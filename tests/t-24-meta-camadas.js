// A barra da meta mostrava só o caixa recebido. Estava certa e contava metade
// da história: a Camilla assinou contrato e a barra não se mexeu, porque o
// dinheiro ainda não tinha entrado. Então viraram DUAS camadas: recebido e
// fechado a receber.
// Houve uma terceira, com as propostas do pipeline. Ela caiu em 28/08/2026,
// no dia em que a Daniela desistiu de uma proposta JÁ ACEITA e em elaboração
// de contrato, e a da Angélica foi recusada — os dois valores estavam dentro
// da meta como se fossem dinheiro. Decisão de Thúlio: na meta entra só
// contrato assinado, "assim não fica especulado". Pipeline segue visível no
// card "Prestes a fechar", fora da meta.
// O "pontos atrás" continua sendo calculado sobre o RECEBIDO — caixa é caixa.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Meta conta só caixa e contrato assinado',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);
    const FIN = dom.window.eval('FIN');
    const meta = (DATA.metaComissao2026 && DATA.metaComissao2026.meta) || 0;
    if (!meta) return;

    const barra = doc.querySelector('#anoResumo .ano-barra:last-child');
    assert(barra, 'a barra da meta sumiu');
    const camadas = [...barra.querySelectorAll('.ritmo-preenche')];
    const larg = (cls) => {
      const el = camadas.find(c => c.classList.contains(cls));
      return el ? parseInt(el.style.width, 10) || 0 : 0;
    };

    const esperado = (v) => Math.max(0, Math.min(100, Math.round(v / meta * 100)));
    const recebido = esperado(FIN.comissaoPaga);
    assert(larg('atras') + larg('frente') === recebido,
      `a camada de recebido devia ser ${recebido}%`);

    if (FIN.comissaoAguardando > 0)
      assert(larg('fechado') > 0, 'há comissão fechada a receber e ela não aparece na barra');
    // Proposta NÃO entra na barra, por mais tentador que seja.
    assert(larg('encaminhado') === 0,
      'proposta do pipeline voltou para a barra da meta — só contrato assinado entra');
    const legenda = (barra.querySelector('.ano-legenda') || {}).textContent || '';
    assert(!/proposta/i.test(legenda),
      `a legenda da meta fala em proposta: "${legenda.trim()}"`);

    // As camadas nunca podem estourar a barra.
    const soma = camadas.reduce((s, c) => s + (parseInt(c.style.width, 10) || 0), 0);
    assert(soma <= 100, `as camadas somam ${soma}% e estouram a barra`);

    // E o julgamento continua duro: pontos atrás medem só o que entrou.
    const frase = doc.querySelector('#anoResumo .ano-frase').textContent;
    const f = dom.window.eval('fracaoAnoDecorrida')();
    const dif = Math.round(Math.abs(f - FIN.comissaoPaga / meta) * 100);
    assert(new RegExp(`${dif} pontos`).test(frase),
      `o "pontos atrás" devia usar só o recebido (${dif}): "${frase.trim()}"`);
    if (FIN.comissaoAguardando > 0) {
      assert(/contrato assinado/.test(frase),
        'a frase precisa deixar claro que só conta contrato assinado');
      const totalNaFrase = FIN.comissaoPaga + FIN.comissaoAguardando;
      assert(frase.indexOf(dom.window.eval('brl')(totalNaFrase)) !== -1,
        `a frase devia somar só recebido + a receber (${totalNaFrase}): "${frase.trim()}"`);
    }
    assert(!/proposta/i.test(frase), `a frase da meta fala em proposta: "${frase.trim()}"`);
  
    // As três faixas precisam ser VISUALMENTE distintas. Elas já foram parar
    // na mesma cor uma vez — recebido e "fechado a receber" saíram idênticos,
    // e a barra passou a mostrar dois pedaços que ninguém conseguia separar.
    const css = require('fs').readFileSync(require('./ambiente').ALVO, 'utf8');
    const valor = (nome) => {
      const m = css.match(new RegExp('--' + nome + '\\s*:\\s*(#[0-9A-Fa-f]{6})'));
      return m ? m[1].toUpperCase() : null;
    };
    const tons = ['meta-caixa', 'meta-fechado'].map(valor);
    tons.forEach((t, i) => assert(t, `falta o token --${['meta-caixa','meta-fechado'][i]}`));
    assert(new Set(tons).size === 2, 'as duas faixas da meta estão com a mesma cor');
    const lum = (h) => 0.2126 * parseInt(h.slice(1, 3), 16) + 0.7152 * parseInt(h.slice(3, 5), 16) + 0.0722 * parseInt(h.slice(5, 7), 16);
    const ls = tons.map(lum);
    assert(Math.abs(ls[0] - ls[1]) > 40,
      `os degraus da barra estão perto demais para o olho separar: ${tons.join(' / ')}`);

}
};
