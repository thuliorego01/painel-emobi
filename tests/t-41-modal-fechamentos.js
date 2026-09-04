// O número dizia 2 e a lista abria com 5 nomes, na mesma tela. O modal
// reaproveitava o de leads: listava TODOS os "Fechado Ganho" do ano sob o
// título "Fechamentos no mês", e descrevia cada um com fase, temperatura e
// "parado há 25d" — cobrança de follow-up para gente que já assinou.
//
// Quem clica em "Fechamentos no Mês" quer ver o que fechou, por quanto, e
// quanto sobra. A lista tem que ser exatamente a que o número contou.
const { montar, dados, clicar } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Modal de fechamentos mostra a mesma lista que o número conta',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);

    const kpi = doc.querySelector('[data-kpi="fechamentos"]');
    assert(kpi, 'o KPI clicável de fechamentos sumiu');
    const numero = Number((kpi.querySelector('.kpi-group-value') || {}).textContent);
    assert(Number.isFinite(numero), 'o KPI de fechamentos não mostra um número');

    clicar(dom, kpi);

    const over = doc.getElementById('biModalOverlay');
    assert(over && over.classList.contains('open'), 'o modal de fechamentos não abriu');

    // 1. O título diz de que mês se trata — "no mês" não identifica mês nenhum.
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const hoje = new Date();
    const titulo = doc.getElementById('biModalTitulo').textContent;
    assert(titulo.indexOf(MESES[hoje.getMonth()]) !== -1 && titulo.indexOf(String(hoje.getFullYear())) !== -1,
      `o título do modal não nomeia o mês corrente: "${titulo}"`);

    const corpo = doc.getElementById('biModalCorpo');
    const linhas = corpo.querySelectorAll('.fech-linha');

    // 2. Lista e número são a mesma coisa.
    assert(linhas.length === numero,
      `o número diz ${numero} fechamento(s) e o modal lista ${linhas.length}`);

    // 3. Vocabulário de follow-up não entra aqui.
    const texto = corpo.textContent.replace(/\s+/g, ' ');
    assert(!/parado há/.test(texto), 'o modal de fechamentos voltou a dizer "parado há"');
    assert(!/Fechado Ganho ·/.test(texto), 'o modal de fechamentos voltou a mostrar fase e temperatura');

    if (numero > 0) {
      // 4. Cada linha carrega dinheiro: valor do negócio e a parte dele.
      assert(corpo.querySelectorAll('.fech-val').length === numero, 'falta o valor em alguma linha');
      assert(corpo.querySelectorAll('.fech-com').length === numero, 'falta a comissão em alguma linha');
      const rodape = corpo.querySelector('.fech-total');
      assert(rodape, 'o modal de fechamentos não soma o mês no rodapé');

      // 5. O rodapé soma o que está listado — se divergir, alguém somou outra lista.
      const doMes = (D.listaNegociacoes || []).filter(n =>
        n && Number(n.ano) === hoje.getFullYear() && (Number(n.mesNum) - 1) === hoje.getMonth());
      const soma = doMes.reduce((a, n) => a + (n.comissao || 0), 0);
      const digitos = rodape.textContent.replace(/\D/g, '');
      assert(digitos.indexOf(String(Math.round(soma))) !== -1 || Math.round(soma) === 0,
        `o rodapé não bate com a soma das comissões do mês (${Math.round(soma)}): "${rodape.textContent.trim()}"`);
    } else {
      assert(/Nenhum negócio fechado/.test(texto),
        'com zero fechamentos o modal precisa dizer que está vazio, não abrir em branco');
    }
  }
};
