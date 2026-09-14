// A LINGUAGEM VISUAL — uma cor, um significado.
//
// Até 13/09/2026 a paleta tinha uma colisão: --quente-txt era #B4300F, o MESMO
// hexadecimal de --erro-txt, e --morno-txt era #8A5A14, o mesmo de --aviso-txt.
// Vermelho queria dizer "você está devendo contato" e também "esse cliente está
// quente" — uma coisa ruim e uma boa, na mesma cor, às vezes no mesmo cartão.
//
// A prova de que isso incomodava estava no próprio painel: havia uma legenda
// embaixo da lista de clientes explicando qual vermelho era qual. Legenda que
// explica cor é sistema de cor que falhou.
//
// Agora: COR = urgência (verde/âmbar/vermelho), em tudo. TEMPERATURA = pontos
// (●●● / ●●○ / ●○○), que também funciona para quem não distingue matiz.
const { montar } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Cor significa urgência; temperatura é forma, não cor',
  async rodar() {
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. A temperatura tem ramp PRÓPRIA e ela não pode repetir, hexadecimal
    //    por hexadecimal, nenhuma cor de estado. Vermelho de "quente" e
    //    vermelho de "atrasado" podem conviver — desde que não sejam o MESMO
    //    vermelho, e desde que morem em lugares diferentes.
    const hex = (nome) => {
      const m = tpl.match(new RegExp('--' + nome + ':\\s*(#[0-9A-Fa-f]{3,8})'));
      return m ? m[1].toLowerCase() : null;
    };
    const estados = ['erro-txt', 'aviso-txt', 'ok-txt', 'info-txt'].map(hex).filter(Boolean);
    ['temp-quente', 'temp-morno', 'temp-frio'].forEach(t => {
      const c = hex(t);
      assert(c, 'sumiu o token --' + t);
      assert(estados.indexOf(c) === -1,
        `--${t} (${c}) é exatamente a cor de um estado — lado a lado ninguém distingue os dois sistemas`);
    });

    // 2. A cor da temperatura vive nos PONTOS e na bolinha da seção. O fundo do
    //    selo fica neutro: se o bloco inteiro voltar a ser vermelho, ele
    //    compete com a faixa de urgência, que foi o problema original.
    const seloBg = (tpl.match(/\.temp\.quente \{[^}]*\}/) || [''])[0];
    assert(!/--temp-quente/.test(seloBg),
      'o fundo do selo de temperatura voltou a usar a cor quente — ela é só dos pontos');
    const pontos = (tpl.match(/\.temp\.(quente|morno|frio)\s+\.selo-pontos\s*\{[^}]*\}/g) || []).join(' ');
    assert(/--temp-quente/.test(pontos) && /--temp-morno/.test(pontos) && /--temp-frio/.test(pontos),
      'os pontos perderam a cor da temperatura — sem cor eles não se leem de relance');

    // 3. O selo tem que carregar os pontos — é o canal que substituiu a cor.
    const { doc } = await montar();
    const selos = doc.querySelectorAll('.temp');
    if (selos.length) {
      const comPontos = Array.prototype.filter.call(selos, e => e.querySelector('.selo-pontos')).length;
      assert(comPontos > 0, 'nenhum selo de temperatura mostra os pontos');
      Array.prototype.forEach.call(selos, e => {
        const p = e.querySelector('.selo-pontos');
        if (p) assert(/^[●○]{3}$/.test(p.textContent.trim()),
          `os pontos do selo saíram errados: "${p.textContent}"`);
      });
    }

    // 4. A legenda não pode mais precisar explicar dois vermelhos.
    const leg = doc.querySelector('.urg-legenda');
    if (leg) {
      const t = leg.textContent.replace(/\s+/g, ' ');
      assert(/Bolinhas = temperatura/i.test(t),
        'a legenda não diz que as bolinhas são a temperatura');
      assert(/Faixa do cartão/i.test(t),
        'a legenda não diz onde mora a urgência — é o LUGAR que separa os dois sistemas, não o matiz');
    }

    // 5. A meta ganhou a segunda régua — o ritmo histórico dele — sem perder
    //    a reta, que é o combinado que ele fez consigo mesmo.
    const { graficos } = await montar({ capturarCharts: true });
    const g = graficos['chartComissaoLinha'];
    assert(g, 'o gráfico de comissão acumulada sumiu');
    const rotulos = g.data.datasets.map(d => d.label || '');
    assert(rotulos.some(r => /ritmo linear/i.test(r)), 'a meta linear sumiu do gráfico');
    assert(rotulos.some(r => /ritmo histórico/i.test(r)),
      'a meta no ritmo histórico não foi desenhada — a reta voltou a ser a única régua');
    const sz = g.data.datasets.find(d => /ritmo histórico/i.test(d.label || ''));
    assert(sz.data.length === 12, 'a meta sazonal precisa ter os 12 meses');
    for (let i = 1; i < 12; i++) {
      assert(sz.data[i] >= sz.data[i - 1],
        'a meta acumulada sazonal desceu de um mês para o outro — acumulado não desce');
    }

    // 6. Proporção na esteira: bloco maior para valor maior, sem sumir com o
    //    pequeno.
    const blocos = doc.querySelectorAll('.esteira-bloco');
    if (blocos.length === 4) {
      const pesos = Array.prototype.map.call(blocos, b => Number(b.style.flexGrow || 1));
      const vals = Array.prototype.map.call(blocos,
        b => Number(b.querySelector('.esteira-val').textContent.replace(/\D/g, '') || 0));
      const maiorIdx = vals.indexOf(Math.max.apply(null, vals));
      const menorIdx = vals.indexOf(Math.min.apply(null, vals));
      assert(pesos[maiorIdx] >= pesos[menorIdx],
        'o bloco de maior valor não é o mais largo — a proporção não está funcionando');
      pesos.forEach(p => assert(p >= 1,
        'bloco com peso menor que 1: proporção não pode deixar o menor ilegível'));
      Array.prototype.forEach.call(blocos, b => assert(b.querySelector('.esteira-barra span'),
        'sumiu a barrinha de proporção — no celular os blocos empilham e a largura deixa de comparar'));
    }
  }
};
