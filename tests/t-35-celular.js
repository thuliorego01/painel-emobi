// O painel tinha regras de celular desde sempre — gaveta do menu, uma coluna,
// fonte maior — e NENHUMA rodava no telefone. Faltava a tag de viewport, então
// o navegador fingia ter 980px e encolhia a página inteira. Meses de trabalho
// de responsividade invisível por causa de uma linha. Este teste impede a volta.
const fs = require('fs');
const path = require('path');
const { montar } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Celular: a página respeita a largura do aparelho',
  async rodar() {
    const { doc } = await montar();
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. A tag existe e usa a largura do aparelho.
    const meta = doc.querySelector('meta[name="viewport"]');
    assert(meta, 'falta a tag de viewport — o celular vai encolher a página inteira');
    const c = (meta.getAttribute('content') || '').toLowerCase();
    assert(/width\s*=\s*device-width/.test(c),
      `a viewport não usa device-width: "${c}"`);
    assert(/initial-scale\s*=\s*1/.test(c), `a viewport não parte da escala 1: "${c}"`);

    // 2. Não pode proibir o zoom: quem enxerga pouco precisa aproximar.
    assert(!/user-scalable\s*=\s*no/.test(c), 'a viewport proíbe o zoom');
    assert(!/maximum-scale\s*=\s*1/.test(c), 'a viewport trava o zoom no máximo 1');

    // 3. Os pontos de quebra que a tag destrava precisam continuar existindo.
    [900, 950, 640].forEach(px => {
      assert(new RegExp('max-width:\\s*' + px + 'px').test(tpl),
        `sumiu o ponto de quebra de ${px}px`);
    });

    // 4. Toda tabela tem que rolar sozinha: no celular ela é sempre mais larga
    //    que a tela, e sem isso empurra o layout inteiro para o lado.
    const fora = [...doc.querySelectorAll('table')].filter(t => !t.closest('.table-scroll'));
    assert(fora.length === 0,
      `${fora.length} tabela(s) fora de .table-scroll — vão empurrar a tela no celular`);
  }
};
