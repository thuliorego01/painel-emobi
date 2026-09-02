// Par em VOLUME do pipeline de comissão. A Meta 2026 de VENDAS é de volume
// (R$10 mi), não de comissão — e não havia nenhum número dizendo quanto de
// volume estava na mesa. Mesma deduplicação da comissão: o negócio que chega
// pelo lead E pelo imóvel reservado não pode contar duas vezes (o Cód. 10842
// já apareceu duplicado assim em 29/08/2026).
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'VGV em negociação: volume na mesa, sem contar duas vezes',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const FIN = dom.window.eval('FIN');
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. Existe e é calculado, não guardado.
    assert(typeof FIN.vgvEmNegociacao === 'number', 'FIN.vgvEmNegociacao não existe');
    assert(D.vgvEmNegociacao === undefined, 'vgvEmNegociacao virou campo guardado — tem que ser conta');

    // 2. Usa a mesma lista deduplicada da comissão.
    const esperado =
      FIN.emNegociacao.reduce((s, l) => s + (typeof l.valor === 'number' ? l.valor : 0), 0) +
      (FIN.reservadosSemLead || []).reduce((s, im) => s + (im.valorNegociado || im.valor || 0), 0);
    assert(FIN.vgvEmNegociacao === esperado,
      `VGV em negociação = ${FIN.vgvEmNegociacao}, esperado ${esperado}`);

    // 3. Nenhum imóvel pode entrar pelos dois caminhos.
    const ids = new Set(FIN.emNegociacao.map(l => String(l.id)));
    (FIN.reservadosSemLead || []).forEach(im => {
      assert(!ids.has(String(im.compradorLeadId)) && !ids.has(String(im.proprietarioLeadId)),
        `${im.nome} entra no VGV pelo imóvel e pelo lead — volume contado duas vezes`);
    });

    // 4. Na tela, com o rótulo dizendo que ainda não é meta.
    const el = doc.getElementById('vgvEmNegociacao');
    assert(el, 'o KPI de VGV em negociação não está na tela');
    if (FIN.vgvEmNegociacao > 0) {
      assert(el.textContent.replace(/\s/g, '').indexOf('R$') === 0,
        `o KPI devia mostrar um valor: "${el.textContent}"`);
      const hint = doc.getElementById('vgvEmNegociacaoHint');
      assert(hint && /levaria|não assinado/i.test(hint.textContent),
        `a dica precisa deixar claro que é potencial, não realizado: "${hint && hint.textContent}"`);
    }

    // 5. Não pode ser somado à Meta 2026 realizada.
    assert(!/negociado \+ FIN\.vgvEmNegociacao/.test(tpl),
      'o VGV em negociação foi somado ao volume realizado — só entra quando assinar');
  }
};
