// A primeira versão despejava o feedback dentro do `obs` do imóvel como texto
// corrido. Com quatro visitas no mesmo imóvel virava um parágrafo ilegível — e,
// pior, não dava para somar nada: nota média e mediana de preço exigem campo,
// não prosa. Feedback é REGISTRO. Este teste impede a volta do parágrafo.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Feedback é registro estruturado, não parágrafo',
  async rodar() {
    const { dom } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. Nenhum imóvel pode ter feedback derramado dentro do obs.
    (D.imoveis || []).forEach(im => {
      assert(!/Feedback da visita de .*intenção/i.test(im.obs || ''),
        `imóvel ${im.id}: feedback voltou a virar texto corrido dentro do obs`);
    });

    // 2. Quando existir, é lista de objetos com os campos certos.
    const CAMPOS = ['cliente', 'data'];
    (D.imoveis || []).forEach(im => {
      if (!im.feedbacks) return;
      assert(Array.isArray(im.feedbacks), `imóvel ${im.id}: feedbacks não é lista`);
      im.feedbacks.forEach((f, i) => {
        CAMPOS.forEach(c => assert(f[c], `imóvel ${im.id}, feedback ${i}: falta "${c}"`));
        if (f.notaPreco !== undefined) {
          const n = Number(f.notaPreco);
          assert(n >= 1 && n <= 10, `imóvel ${im.id}: notaPreco ${f.notaPreco} fora de 1 a 10`);
        }
        if (f.precoIdeal !== undefined && f.precoIdeal !== null) {
          assert(typeof f.precoIdeal === 'number',
            `imóvel ${im.id}: precoIdeal tem que ser número, veio "${f.precoIdeal}"`);
        }
      });
    });

    // 3. As duas fontes (caixa do KV e histórico) se juntam na mesma lista —
    //    senão o resumo conta metade e o rótulo mente sobre quantas respostas há.
    assert(/doHistorico/.test(tpl) && /daCaixa/.test(tpl),
      'a tela lê só uma das fontes de feedback');
    assert(/fbResumoPreco\(respondidos, im\)/.test(tpl),
      'o resumo do preço não recebe o imóvel — sem isso não dá para comparar com o valor pedido');

    // 4. A data não pode passar por new Date(): fuso já empurrou data aqui antes.
    const bloco = (tpl.match(/function dataBR\(iso\)[\s\S]*?\n  \}/) || [''])[0];
    assert(bloco && !/new Date/.test(bloco),
      'dataBR usa new Date() — o fuso vai empurrar a data um dia para trás');

    // 5. ALCANCE: a ficha do imóvel chama pintarFeedback de fora do bloco onde
    //    ela é declarada. Faltando a ponte, o clique lança ReferenceError, o
    //    bloco de feedback nunca é desenhado — e nada disso derruba a suíte,
    //    porque o jsdom só registra o erro no console. Aconteceu em 26/08/2026:
    //    ficou dois dias no ar com o botão funcionando e a lista invisível.
    assert(dom.window.eval('typeof pintarFeedback') === 'function',
      'pintarFeedback não é alcançável de onde a ficha do imóvel a chama');

    // 6. Resposta pendente não pode entrar na conta como se fosse resposta.
    assert(/respondidos = todos\.filter\(f => f\.respondido\)/.test(tpl),
      'link enviado sem resposta está sendo contado como respondido');
  }
};
