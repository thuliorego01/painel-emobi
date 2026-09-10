// RECEBIMENTOS EM ANDAMENTO — venda fechada não é dinheiro na conta.
//
// Em 10/09/2026 havia R$53.567 de comissão em aberto, e o painel dizia
// "aguardando" para todos: para o que chegaria na semana seguinte e para os
// R$17.500 de Maio/2026, parados havia QUATRO MESES sem ninguém saber por quê.
// Financiamento e parcelamento direto levam de 45 a 90 dias e passam por banco,
// correspondente e cartório — um estado só não descreve isso.
//
// O que este teste protege:
//   1. todo negócio com dinheiro em aberto aparece, tenha parcelamento ou não;
//   2. a comissão de cada parcela é CONTA, nunca um segundo número guardado;
//   3. dar baixa numa parcela some com ela da cobrança e soma no recebido;
//   4. quitou tudo, o negócio sai da lista;
//   5. gravação recusada não altera a tela.
const { montar } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Recebimentos em andamento: fase, parcelas e baixa',
  async rodar() {
    const { dom, doc } = await montar();
    const w = dom.window;
    let recusar = false;
    const gravacoes = [];
    w.fetch = (u, o) => {
      if (String(u).indexOf('/api/dados/patch') !== -1) {
        if (recusar) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
        gravacoes.push(JSON.parse(o.body));
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    };
    w.alert = function () {};
    const clicar = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const D = w.eval('DATA');

    const el = doc.getElementById('recebimentosLista');
    assert(el, 'o box "Recebimentos em andamento" sumiu');

    // 1. Todo negócio com dinheiro em aberto entra — inclusive os SEM parcelamento.
    //    Foi um sem parcelamento que ficou quatro meses invisível.
    const abertos = (D.listaNegociacoes || []).filter(n => {
      const rec = (Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.length && n.valor)
        ? n.fluxoPagamento.filter(p => p.recebido).reduce((s, p) => s + (p.valor / n.valor) * (n.comissao || 0), 0)
        : (typeof n.comissaoRecebida === 'number' ? n.comissaoRecebida : (n.status === 'pago' ? (n.comissao || 0) : 0));
      return (n.comissao || 0) - rec > 0.01;
    });
    const linhas = doc.querySelectorAll('[data-rec]');
    assert(linhas.length === abertos.length,
      `o box mostra ${linhas.length} negócios e há ${abertos.length} com comissão em aberto`);

    // 2. Todo negócio precisa de id — a baixa grava por id, nunca por nome.
    abertos.forEach(n => assert(n.id !== undefined && n.id !== null,
      'negócio sem id em listaNegociacoes: ' + (n.cliente || '?')));

    // Processo travado por terceiro não pode aparecer como cobrança atrasada:
    // cobrar toda semana algo fora do seu alcance é ruído, e ruído faz a
    // pessoa parar de olhar o painel inteiro.
    const travados = abertos.filter(n => n.semDataPrevista || /travado/i.test(n.faseProcesso || ''));
    travados.forEach(t => {
      const linha = doc.querySelector('[data-rec="' + t.id + '"]');
      assert(linha, 'negócio travado sumiu da lista: ' + t.cliente);
      assert(!/venceu h[áa]/i.test(linha.textContent),
        `"${t.cliente}" está travado por terceiro e aparece como cobrança vencida`);
      assert(/sem data prevista/i.test(linha.textContent),
        `"${t.cliente}" está travado e não diz que não há data prevista`);
    });
    if (travados.length) {
      const ordem = [...doc.querySelectorAll('[data-rec]')].map(l => l.dataset.rec);
      const primeiroTravado = ordem.indexOf(String(travados[0].id));
      const naoTravados = abertos.filter(n => !(n.semDataPrevista || /travado/i.test(n.faseProcesso || '')));
      naoTravados.forEach(n => assert(ordem.indexOf(String(n.id)) < primeiroTravado,
        'travado tem que ficar no fim da fila — não é o que se persegue hoje'));
    }

    const comFluxo = abertos.filter(n => Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.some(p => !p.recebido))[0];
    if (!comFluxo) return;   // sem parcelado em aberto, o resto não se aplica hoje

    clicar(doc.querySelector('[data-rec="' + comFluxo.id + '"]'));
    const corpo = doc.getElementById('biModalCorpo');
    assert(/Falta receber/.test(corpo.textContent), 'o modal do recebimento não abriu');

    // Os campos do processo são editáveis na própria tela: lista fechada onde a
    // resposta é sempre uma das mesmas, texto livre onde cada caso é um caso.
    ['modalidade', 'faseProcesso', 'comQuem', 'dataProximaCobranca'].forEach(c => {
      assert(corpo.querySelector('[data-campo="' + c + '"]'), 'sumiu o campo "' + c + '" do processo');
    });
    assert(corpo.querySelector('[data-campo="modalidade"]').tagName === 'SELECT',
      'modalidade tem que ser lista fechada, senão vira três grafias da mesma coisa');
    assert(corpo.querySelector('[data-campo="comQuem"]').tagName === 'INPUT',
      '"com quem está a bola" tem que ser texto livre — nenhuma lista prevê "Prefeitura, certidão de endereço"');

    const pend = corpo.querySelectorAll('[data-parcela]');
    assert(pend.length, 'as parcelas pendentes não estão clicáveis');

    // 3. A comissão da parcela é a fatia dela na venda — conferida contra a conta.
    const p0 = comFluxo.fluxoPagamento.filter(p => !p.recebido)[0];
    const esperado = Math.round((p0.valor / comFluxo.valor) * comFluxo.comissao);
    const digitos = pend[0].textContent.replace(/\D/g, '');
    assert(digitos.indexOf(String(esperado)) !== -1 || digitos.indexOf(String(esperado - 1)) !== -1,
      `a parcela não mostra a comissão certa (esperado ~${esperado}): "${pend[0].textContent.trim()}"`);

    // 4. Gravação recusada não pode mexer na tela.
    recusar = true;
    const antes = JSON.stringify(comFluxo.fluxoPagamento);
    clicar(pend[0]);
    await new Promise(r => setTimeout(r, 140));
    assert(JSON.stringify(comFluxo.fluxoPagamento) === antes,
      'a gravação falhou e a parcela mudou de estado mesmo assim');
    recusar = false;

    // 5. Baixa de verdade: soma no recebido, some da cobrança, e se quitar sai da lista.
    const restantes = comFluxo.fluxoPagamento.filter(p => !p.recebido).length;
    clicar(doc.getElementById('biModalCorpo').querySelector('[data-parcela]'));
    await new Promise(r => setTimeout(r, 150));
    assert(comFluxo.fluxoPagamento.filter(p => !p.recebido).length === restantes - 1,
      'a baixa não marcou a parcela como recebida');
    assert(gravacoes.length && gravacoes[gravacoes.length - 1].ops.some(o => o.tipo === 'atualizar' && o.chave === 'id'),
      'a baixa precisa gravar por id em listaNegociacoes');
    assert(gravacoes[gravacoes.length - 1].ops.some(o => o.colecao === 'logAtividades'),
      'baixa de parcela sem registro no histórico');

    if (comFluxo.fluxoPagamento.every(p => p.recebido)) {
      assert(!doc.querySelector('[data-rec="' + comFluxo.id + '"]'),
        'o negócio foi quitado e continua na lista de recebimentos em aberto');
    }
  }
};
