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
}};
