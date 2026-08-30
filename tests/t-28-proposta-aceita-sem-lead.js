// Proposta aceita cujo comprador é do corretor parceiro não tem lead no meu CRM:
// ela só existe no imóvel, com status "Reservado". A barra da meta e o KPI
// "comissão prevista" contavam apenas leads — o card listava o negócio e a barra
// dizia zero. Zero engana porque parece boa notícia.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Proposta aceita sem lead meu entra na conta',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);

    const reservados = (D.imoveis || []).filter(im => im.status === 'Reservado');
    const leadsEmNeg = (D.leads || []).filter(l => l.fase === 'Em Negociação' || l.fase === 'Proposta Enviada');

    reservados.forEach(im => {
      assert(typeof im.comissaoThulioVenda === 'number',
        `imóvel ${im.id} está Reservado sem comissaoThulioVenda — apareceria sem valor`);
      assert(im.corretorParceiro || im.compradorLeadId,
        `imóvel ${im.id} está Reservado sem corretorParceiro nem compradorLeadId`);
    });

    const esperado =
      leadsEmNeg.filter(l => typeof l.comissaoPrevista === 'number')
        .reduce((s, l) => s + l.comissaoPrevista, 0) +
      reservados.filter(im => typeof im.comissaoThulioVenda === 'number'
        && !leadsEmNeg.some(l => String(l.id) === String(im.compradorLeadId) || String(l.id) === String(im.proprietarioLeadId)))
        .reduce((s, im) => s + im.comissaoThulioVenda, 0);

    const fin = dom.window.eval('FIN');
    assert(fin.comissaoPrevista === esperado,
      `FIN.comissaoPrevista = ${fin.comissaoPrevista}, esperado ${esperado}`);

    const el = doc.getElementById('comissaoPrevista');
    assert(el, 'KPI de comissão prevista não existe');
    const hint = el.parentElement && el.parentElement.querySelector('.hint');
    if (esperado > 0) {
      assert(!/^R\$\s*0(,00)?$/.test(el.textContent.trim()),
        `KPI mostra ${el.textContent.trim()} com R$${esperado} de proposta aceita`);
      assert(!hint || !/nenhum/i.test(hint.textContent),
        `dica diz "${hint && hint.textContent.trim()}" com negócio em negociação`);
    }
    assert(!hint || !/nenhum lead/i.test(hint.textContent),
      'a dica ainda fala em "lead" — proposta via corretor parceiro não tem lead meu');

    // O MESMO NEGÓCIO NÃO PODE SER CONTADO DUAS VEZES. Ele chega por dois
    // caminhos — pelo lead e pelo imóvel reservado — e em 29/08/2026 o Cód.
    // 10842 apareceu nos dois: o lead ligado a ele era o VENDEDOR (Heber), e a
    // deduplicação só olhava o comprador. O card somou R$25.550 onde havia
    // R$20.125, e quem viu foi o Thúlio, não o teste.
    const idsPipeline = new Set(leadsEmNeg.map(l => String(l.id)));
    (D.imoveis || []).filter(im => im.status === 'Reservado').forEach(im => {
      const ligado = idsPipeline.has(String(im.compradorLeadId)) || idsPipeline.has(String(im.proprietarioLeadId));
      const contado = (fin.reservadosSemLead || []).some(x => String(x.id) === String(im.id));
      assert(!(ligado && contado),
        `imóvel ${im.id} (${im.nome}) está no pipeline pelo lead E pelo imóvel — comissão contada duas vezes`);
    });
    // E a soma tem que fechar exatamente com a dos itens mostrados.
    const somaItens =
      leadsEmNeg.reduce((s, l) => s + (typeof l.comissaoPrevista === 'number' ? l.comissaoPrevista : 0), 0) +
      (fin.reservadosSemLead || []).reduce((s, i) => s + (i.comissaoThulioVenda || 0), 0);
    assert(fin.comissaoPrevista === somaItens,
      `o total do pipeline (${fin.comissaoPrevista}) não bate com a soma dos itens (${somaItens})`);

    // O rótulo não pode prometer "aceita" quando a faixa também conta proposta
    // apenas ENVIADA. A Angélica foi o primeiro caso: proposta feita, ainda não
    // aceita — e a barra dizia "proposta aceita".
    const tplRot = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    if (tplRot.indexOf("fase === 'Proposta Enviada'") !== -1) {
      const m = tplRot.match(/leg encaminhado"><\/i>([^$`]{0,40})/);
      const legenda = m ? m[1] : '';
      assert(!/aceita/i.test(legenda),
        'a faixa conta proposta ENVIADA mas se chama "' + legenda.trim() + '" — promete mais do que existe');
    }

    // O template é a fonte. Se alguém publicar só o index.html, o próximo
    // briefing regenera a partir do template e desfaz tudo — foi o que
    // aconteceu em 22/08. Esta checagem faz o portão reprovar antes disso.
    const tpl = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    assert(tpl.indexOf('reservadosSemLead') !== -1,
      'a correção não está no TEMPLATE, só no HTML gerado — o próximo build desfaz');
  }
};
