// A ESTEIRA DO DINHEIRO e a previsão de recebimento.
//
// Duas coisas nasceram do mesmo print de celular, em 12/09/2026.
//
// 1. Responder "onde está o meu dinheiro agora" custava três abas: proposta e
//    contrato no Início, comissão a receber no Faturamento, imóvel reservado em
//    Imóveis — e uma soma de cabeça no fim.
//
// 2. O resumo do faturamento dizia, na MESMA frase, "R$17.500 sem data
//    prevista" e em seguida marcava os SEIS negócios como "(sem previsão de
//    data)". Ele lia n.previsaoRecebimento, campo que deixou de existir quando
//    o fluxo de pagamento entrou — então todo negócio caía no texto de exceção.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Esteira do dinheiro soma certo e a previsão não mente',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const el = doc.getElementById('esteiraDinheiro');
    assert(el, 'a esteira do dinheiro sumiu da tela inicial');

    const blocos = el.querySelectorAll('.esteira-bloco');
    assert(blocos.length === 4, `a esteira precisa de 4 blocos, veio ${blocos.length}`);

    const num = (i) => Number(blocos[i].querySelector('.esteira-val').textContent.replace(/\D/g, '') || 0);

    // 1 e 2. PROPOSTA E CONTRATO SÃO ETAPAS DIFERENTES. O status do imóvel é
    //    'Reservado' nos dois casos, então quem separa é `propostaAceita`.
    //    Sem o campo, o imóvel fica no degrau MENOS avançado (proposta):
    //    chutar para cima transformaria proposta sem aceite em "em contrato",
    //    que foi exatamente o que a tela fez em 17/09/2026 com o Cód. 10881.
    const emNeg = (D.leads || []).filter(l => l.fase === 'Em Negociação');
    const ids = new Set(emNeg.map(l => String(l.id)));
    const reservados = (D.imoveis || []).filter(im => im.status === 'Reservado'
      && typeof im.comissaoThulioVenda === 'number'
      && !(ids.has(String(im.compradorLeadId)) || ids.has(String(im.proprietarioLeadId))));
    const resContrato = reservados.filter(im => im.propostaAceita === true);
    const resProposta = reservados.filter(im => im.propostaAceita !== true);

    const esperaProposta = (D.leads || []).filter(l => l.fase === 'Proposta Enviada')
      .reduce((s, l) => s + (l.comissaoPrevista || 0), 0)
      + resProposta.reduce((s, im) => s + im.comissaoThulioVenda, 0);
    assert(Math.abs(num(0) - Math.round(esperaProposta)) <= 1,
      `bloco 1 mostra ${num(0)} e as propostas somam ${Math.round(esperaProposta)}`);

    const esperaContrato = emNeg.reduce((s, l) => s + (l.comissaoPrevista || 0), 0)
      + resContrato.reduce((s, im) => s + im.comissaoThulioVenda, 0);
    assert(Math.abs(num(1) - Math.round(esperaContrato)) <= 1,
      `bloco 2 mostra ${num(1)} e o esperado é ${Math.round(esperaContrato)} — provável contagem dupla`);

    // 2b. Nenhum imóvel pode estar nos dois blocos, e nenhum pode sumir dos dois:
    //     a soma dos reservados tem que continuar inteira depois da separação.
    const somaRes = reservados.reduce((s, im) => s + im.comissaoThulioVenda, 0);
    const somaSeparada = resProposta.reduce((s, im) => s + im.comissaoThulioVenda, 0)
      + resContrato.reduce((s, im) => s + im.comissaoThulioVenda, 0);
    assert(Math.abs(somaRes - somaSeparada) < 0.01,
      'a separação entre proposta e contrato perdeu ou duplicou imóvel reservado');

    // 2c. Uma proposta viva não pode produzir "nenhuma agora" no bloco 1 —
    //     foi assim que R$12.250 ficaram invisíveis como se não existissem.
    if (esperaProposta > 0) {
      assert(!/nenhuma agora/i.test(blocos[0].textContent),
        'o bloco 1 diz "nenhuma agora" com proposta na mesa valendo dinheiro');
    }

    // 3. A receber = tudo que está fechado e não caiu, de qualquer ano.
    const rec = (n) => (Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.length && n.valor)
      ? n.fluxoPagamento.filter(p => p.recebido).reduce((s, p) => s + (p.valor / n.valor) * (n.comissao || 0), 0)
      : (typeof n.comissaoRecebida === 'number' ? n.comissaoRecebida : (n.status === 'pago' ? (n.comissao || 0) : 0));
    const esperaReceber = (D.listaNegociacoes || []).reduce((s, n) => s + Math.max(0, (n.comissao || 0) - rec(n)), 0);
    assert(Math.abs(num(2) - Math.round(esperaReceber)) <= 1,
      `bloco 3 mostra ${num(2)} e o aberto soma ${Math.round(esperaReceber)}`);

    // 4. A nota NÃO pode somar os quatro blocos: os três primeiros são o mesmo
    //    dinheiro andando, e o quarto já entrou. Somar tudo dobra o que nem
    //    chegou.
    const nota = el.querySelector('.esteira-nota');
    assert(nota, 'a esteira perdeu a nota que explica que os blocos não se somam');
    const somaCaminho = Math.round(esperaProposta + esperaContrato + esperaReceber);
    const digitos = nota.textContent.replace(/\D/g, '');
    assert(digitos.indexOf(String(somaCaminho)) !== -1,
      `a nota devia somar ${somaCaminho} (blocos 1 a 3) e mostra "${nota.textContent.trim().slice(0, 90)}"`);
    assert(/não .* soma|não é uma soma/i.test(nota.textContent),
      'a nota precisa dizer que os blocos não se somam com o recebido');

    // 5. A previsão de recebimento não pode voltar a ler um campo morto.
    //    Conta só o que está NA TELA: o textContent do body inclui o próprio
    //    código dos <script>, onde a string aparece como literal.
    const copia = doc.body.cloneNode(true);
    Array.prototype.forEach.call(copia.querySelectorAll('script, style'), n => n.remove());
    const corpo = copia.textContent.replace(/\s+/g, ' ');
    const semData = (D.listaNegociacoes || []).filter(n => n.semDataPrevista).length;
    const abertos = (D.listaNegociacoes || []).filter(n => (n.comissao || 0) - rec(n) > 0.01);
    const marcados = (corpo.match(/\(sem data prevista\)/g) || []).length;
    assert(marcados <= semData,
      `${marcados} negócios marcados como "sem data prevista" e só ${semData} têm essa marca no dado`);
    // E o texto de exceção não pode virar o texto padrão: se houver negócio
    //    aberto com data de cobrança, ele precisa aparecer como previsto.
    const comData = abertos.filter(n => !n.semDataPrevista && (n.dataProximaCobranca ||
      (Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.some(p => !p.recebido && p.vencimento))));
    if (comData.length) {
      assert(/\(previsto:/.test(corpo),
        'há negócio aberto com data e nenhum aparece como "previsto" — a previsão voltou a ler campo morto');
    }
  }
};
