// DE ONDE VEIO O NEGÓCIO.
//
// Em 14/09/2026 o painel sabia dizer se uma venda teve parceria, mas nunca de
// que LADO Thúlio entrou. Das 10 vendas em parceria do ano, só 2 registravam de
// quem foi a captação — e em texto livre, dentro do campo `parceria`. As 76
// vendas de 2020 a 2025 não têm campo nenhum.
//
// A pergunta vale tempo real: se a comissão vem de imóvel dos outros, o
// gargalo é CAPTAÇÃO; se vem das captações dele, o gargalo é COMPRADOR. São
// investimentos de tempo opostos.
//
// O que este teste protege: marcar é um clique, dá para desmarcar, clicar no
// chip não abre o detalhe do negócio por engano, e — o mais importante — a
// conta se declara PARCIAL enquanto faltar venda por classificar.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Origem do negócio: um clique, reversível, e a conta parcial se declara',
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
    const D = dados(dom);
    const vendas = (D.listaNegociacoes || []).filter(n => n.tipo === 'Venda');

    // 1. Toda venda ganha as três opções — e só venda. Locação e Diversos não
    //    têm "captação" nem "imóvel do parceiro".
    const chips = doc.querySelectorAll('[data-orig]');
    assert(chips.length === vendas.length * 3,
      `esperava 3 botões por venda (${vendas.length * 3}) e há ${chips.length}`);
    const idsComChip = new Set(Array.prototype.map.call(chips, c => c.dataset.neg));
    (D.listaNegociacoes || []).filter(n => n.tipo !== 'Venda').forEach(n => {
      assert(!idsComChip.has(String(n.id)),
        `"${n.tipo}" ganhou botão de origem — a pergunta só faz sentido em venda`);
    });

    // 2. O resumo precisa dizer que a conta é PARCIAL enquanto faltar venda.
    //    Porcentagem sobre metade da amostra parece medida e não é.
    const resumo = doc.getElementById('origemResumo');
    assert(resumo, 'o resumo da origem sumiu');
    const faltando = vendas.filter(n => !n.origemNegocio).length;
    if (faltando > 0) {
      assert(/parciais|faltam/i.test(resumo.textContent),
        'faltam vendas por classificar e o resumo não avisa que a conta é parcial');
    }

    // 3. Um clique marca e grava por id.
    const alvo = chips[0];
    const id = alvo.dataset.neg;
    clicar(alvo);
    await new Promise(r => setTimeout(r, 120));
    const n = (D.listaNegociacoes || []).filter(x => String(x.id) === String(id))[0];
    assert(n.origemNegocio === alvo.dataset.orig,
      'o clique não marcou a origem');
    assert(gravacoes.length && gravacoes[0].ops.some(o => o.tipo === 'atualizar' && o.chave === 'id'),
      'a marcação precisa gravar por id em listaNegociacoes');

    // 4. Clicar no chip NÃO pode abrir o detalhe do negócio — a linha inteira
    //    é clicável e os dois eventos disputariam o mesmo clique.
    assert(!doc.getElementById('biModalOverlay').classList.contains('open'),
      'clicar no botão de origem abriu o detalhe do negócio junto');

    // 5. Dá para desmarcar. Errar sem poder desfazer é o que faz alguém parar
    //    de clicar — e aí o campo nunca se preenche.
    const ativo = Array.prototype.filter.call(doc.querySelectorAll('[data-orig]'),
      c => c.dataset.neg === String(id) && c.classList.contains('ativo'))[0];
    assert(ativo, 'o botão marcado não ficou visualmente ativo');
    clicar(ativo);
    await new Promise(r => setTimeout(r, 120));
    assert(!n.origemNegocio, 'clicar de novo no botão marcado não desmarcou');

    // 6. Gravação recusada devolve o estado anterior — nada fica marcado na
    //    tela sem ter sido salvo.
    recusar = true;
    const antes = n.origemNegocio;
    clicar(doc.querySelectorAll('[data-orig]')[0]);
    await new Promise(r => setTimeout(r, 140));
    assert(n.origemNegocio === antes,
      'a gravação falhou e a origem ficou marcada na tela mesmo assim');
  }
};
