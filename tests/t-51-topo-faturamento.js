// O topo do Faturamento tinha OITO caixas iguais lado a lado. Duas delas —
// "Pipeline" e "VGV em negociação" — são expectativa: proposta na mesa, nada
// assinado. Do lado delas, com o mesmo desenho, o mesmo tamanho de número e a
// mesma cor, estavam "Comissão Paga" e "Aguardando Pagamento", que são
// dinheiro de contrato assinado. Oito quadradinhos idênticos não dizem qual é
// qual — e somar os dois grupos com o olho é como o mês parece melhor do que é.
//
// A correção agrupou as oito contas em TRÊS caixas, por estado do negócio:
//   1. Meta do ano (as duas barras) + a projeção no ritmo atual
//   2. Fechado — contrato assinado (volume, comissão recebida, comissão a receber)
//   3. Em negociação — ainda não é meu (VGV na mesa, comissão prevista)
//
// Este teste guarda as duas coisas que a mudança comprou:
//   (a) NENHUM número sumiu — as oito contas continuam na tela, com os mesmos ids;
//   (b) a separação é ESTRUTURAL — pipeline e dinheiro fechado não podem voltar
//       a morar na mesma caixa, nem que alguém ache que fica mais bonito.
const assert = require('assert');
const { montar, txt, ALVO } = require('./ambiente');
const fs = require('fs');

// As oito contas que existiam antes. Se uma sair da tela, o teste acusa.
const OITO = [
  'metaPct', 'metaComissaoPct', 'projecaoAnual',
  'totalNegociado', 'comissaoPaga', 'comissaoAguardando',
  'vgvEmNegociacao', 'comissaoPrevista'
];

module.exports = {
  nome: 'Topo do Faturamento: 3 caixas, as mesmas 8 contas',
  async rodar() {
    const { doc } = await montar();
    const topo = doc.querySelector('#panel-faturamento .fat-topo');
    assert(topo, 'o topo agrupado do Faturamento não está na tela');

    // 1. Continua sendo POUCA caixa. O problema original era o número delas.
    const caixas = Array.prototype.filter.call(topo.children, el => el.classList.contains('kpi-group'));
    assert(caixas.length === 3,
      `o topo voltou a ter ${caixas.length} caixas — o ponto da mudança era caber em 3`);

    // 2. Nenhuma das oito contas desapareceu no caminho.
    OITO.forEach(id => {
      const el = doc.getElementById(id);
      assert(el, `a conta "${id}" sumiu do painel ao juntar as caixas`);
      assert(topo.contains(el), `"${id}" existe, mas saiu do topo do Faturamento`);
      assert(txt(doc.getElementById(id)) !== '',
        `"${id}" está na tela mas vazio — caixa sem número não informa nada`);
    });

    // 3. Cada conta tem rótulo à vista. Número sem nome não é informação.
    ['totalNegociado', 'comissaoPaga', 'comissaoAguardando', 'vgvEmNegociacao', 'comissaoPrevista']
      .forEach(id => {
        const item = doc.getElementById(id).closest('.kpi-group-item');
        assert(item, `"${id}" não está dentro de uma linha de caixa agrupada`);
        const rot = item.querySelector('.kpi-group-label');
        assert(rot && rot.textContent.trim().length > 3,
          `"${id}" ficou sem rótulo legível dentro da caixa`);
      });

    // 4. A SEPARAÇÃO. Expectativa e dinheiro fechado em caixas diferentes.
    const caixaDe = (id) => doc.getElementById(id).closest('.kpi-group');
    const fechado = caixaDe('comissaoPaga');
    assert(caixaDe('comissaoAguardando') === fechado,
      'comissão recebida e comissão a receber se separaram — as duas são de contrato assinado');
    assert(caixaDe('totalNegociado') === fechado,
      'o volume negociado saiu da caixa do que já está assinado');
    const previsto = caixaDe('comissaoPrevista');
    assert(caixaDe('vgvEmNegociacao') === previsto,
      'VGV na mesa e comissão prevista se separaram — as duas são da mesma negociação em aberto');
    assert(previsto !== fechado,
      'pipeline voltou para a mesma caixa do dinheiro fechado — é assim que proposta vira "faturamento" no olho');

    // 5. E a caixa do pipeline diz, por escrito, que aquilo não é meta.
    assert(/não entra na meta|ainda não é meu|não conta para a meta|enquanto não houver contrato/i
      .test(previsto.textContent),
      'a caixa do pipeline não avisa mais que aquele dinheiro ainda não é dele');

    // 6. O contrato interno que o JS usa: renderPrevista procura a dica por
    //    `el.parentElement.querySelector('.hint')`. Se o HTML mudar de forma e
    //    a dica sair de lá, o KPI passa a mentir em silêncio ("nenhum negócio"
    //    some, "a definir" some) sem quebrar nada visível.
    const dica = doc.getElementById('comissaoPrevista').parentElement.querySelector('.hint');
    assert(dica, 'a dica da comissão prevista saiu de onde o JS a procura (.hint irmã do valor)');

    // 7. As duas metas continuam com barra — a barra é o que ele lê de longe.
    ['metaBar', 'metaComissaoBar'].forEach(id => {
      const b = doc.getElementById(id);
      assert(b && b.classList.contains('bar-fill'), `a barra "${id}" sumiu da caixa de metas`);
      assert(/%/.test(b.style.width || ''), `a barra "${id}" não está sendo preenchida`);
    });

    // 8. Nada de caixa solta sobrando: a grade antiga de oito não pode
    //    reaparecer por cima da nova.
    const soltas = doc.querySelectorAll('#panel-faturamento > .kpis > .kpi');
    assert(soltas.length === 0,
      `sobraram ${soltas.length} caixas soltas no topo do Faturamento além das 3 agrupadas`);

    // 9. Texto para ler não pode estar em tamanho de etiqueta (mesma regra do
    //    t-16, cobrada aqui no rodapé novo porque ele é uma frase inteira).
    const tpl = fs.readFileSync(ALVO, 'utf8');
    const regra = tpl.match(/\.kpi-group-rodape\s*\{[^}]*\}/);
    assert(regra && !/--fs-2xs/.test(regra[0]),
      'o aviso do pipeline ficou em tamanho de etiqueta — é uma frase, tem que dar para ler');
  }
};
