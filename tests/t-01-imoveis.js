const assert = require('assert');
const { montar, txt } = require('./ambiente');

module.exports = { nome: 'Imóveis: cidade, bairro e telefones', rodar: async () => {
  const { dom, doc } = await montar();
  const card = doc.getElementById('imoveisCard');

  const cidades = [...card.querySelectorAll('.cidade-rotulo')];
  assert(cidades.length >= 3, 'faltaram as faixas de cidade');
  assert(card.querySelector('.cidade-pin'), 'a cidade perdeu o destaque (pin)');
  assert(/imóve(l|is)/.test(txt(cidades[0])), 'a faixa da cidade deveria contar os imóveis');

  const grupos = [...card.querySelectorAll('.bairro-grupo')];
  assert(grupos.length >= 5, 'faltaram os grupos de bairro');
  const corpos = [...card.querySelectorAll('.bairro-corpo')];
  assert(corpos.every(c => !c.classList.contains('open')), 'os bairros deveriam começar recolhidos');

  grupos[0].dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert(grupos[0].nextElementSibling.classList.contains('open'), 'o bairro não abriu no clique');

  // O divisor de tipo só existe onde há mais de um tipo no bairro.
  const comDivisor = corpos.filter(c => c.querySelector('.tipo-divisor'));
  comDivisor.forEach(c => {
    const tipos = new Set([...c.querySelectorAll('.tipo-divisor')].map(x => txt(x)));
    assert(tipos.size > 1, 'divisor de tipo sozinho num bairro de tipo único é ruído');
  });

  // O aviso de telefones é único, não um chip repetido por bairro.
  assert(card.querySelectorAll('.bairro-grupo .fu-chip.sem-tel').length === 0,
    'o aviso de telefone voltou a se repetir em cada bairro');
  const aviso = doc.querySelector('.aviso-telefones');
  if (aviso) assert(/sem o telefone do proprietário/.test(txt(aviso)), 'aviso de telefones malformado');

  // Os que foram retirados da carteira não podem reaparecer.
  ['10572', '6830', '9266'].forEach(c => {
    assert(!card.textContent.includes('Cód. ' + c), 'Cód. ' + c + ' voltou para a aba Imóveis');
  });

  const alvo = card.querySelector('[data-imovel]');
  alvo.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert(doc.getElementById('imovelModalOverlay').classList.contains('open'), 'a janela do imóvel não abriu');

  // Aluguel e preço de venda são grandezas diferentes. Sem separar, um
  // apartamento de R$4.500/mês entra na faixa "até R$300 mil" como se fosse
  // um imóvel de R$4.500, e engorda o "em carteira" da cidade.
  const DATA = dom.window.eval('DATA');
  // Fechado (Vendido ou Alugado) sai do estoque — a mesma régua do painel.
  const locacoes = (DATA.imoveis || []).filter(i =>
    i.tipoOperacao === 'Locação' && ['Vendido', 'Alugado'].indexOf(i.status) === -1);
  if (locacoes.length) {
    const cod = (locacoes[0].nome.match(/Cód\.\s*(\d+)/) || [])[1];
    assert(/\/mês/.test(card.textContent), 'valor de locação precisa do "/mês"');
    assert(card.querySelector('.fu-chip.locacao'), 'falta o selo de Locação no card');
    const faixa = doc.getElementById('filtroValor');
    faixa.value = '0-300000';
    faixa.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    assert(!doc.getElementById('imoveisCard').textContent.includes('Cód. ' + cod),
      'locação apareceu numa faixa de preço de venda');
    faixa.value = '';
    faixa.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
  }

  // Negócio fechado não é estoque, e não tem follow-up de proprietário. O
  // Cód. 7768 apareceu alugado no meio dos disponíveis, com selo "em dia (0d)"
  // — alerta para um acompanhamento que não vai mais acontecer.
  (function fechadoSaiDoEstoque() {
    const fechados = (DATA.imoveis || []).filter(i => i.status === 'Vendido' || i.status === 'Alugado');
    const estoque = doc.getElementById('imoveisCard');
    fechados.forEach(im => {
      const cod = (String(im.nome).match(/Cód\.\s*(\d+)/) || [])[1];
      if (cod) assert(!new RegExp('Cód\\.\\s*' + cod + '\\b').test(estoque.textContent),
        `${im.nome} está ${im.status} e continua na listagem de imóveis`);
    });
    const fu = dom.window.eval('typeof followupStatus === "function"');
    if (fu && fechados.length) {
      // sem acesso direto à função interna, checa pela tela
      assert(!/Alugado[\s\S]{0,120}Follow-up/.test(doc.body.innerHTML),
        'imóvel alugado ainda exibe selo de follow-up de proprietário');
    }
  })();

}};
