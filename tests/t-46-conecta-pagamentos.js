// HISTÓRICO DE PAGAMENTOS DO CONECTA TR.
//
// O painel sabia dizer quanto o programa DEVE e nunca quanto ele já PAGOU.
// Enquanto isso, o número mais importante do programa era zero: 13 indicações
// e nenhum indicador com dinheiro no bolso. Zero aqui não é ausência de dado —
// é o fato que decide se o programa é real ou promessa.
//
// E uma armadilha que já mordeu: ao registrar o primeiro pagamento eu troquei
// o status da indicação de "Vendida" para "Paga", e a única venda do programa
// sumiu de TODOS os contadores que filtram por "Vendida" — indicações vendidas,
// captações do indicador e o bônus a cada 4. Pagamento não é estado da
// indicação; é atributo dela (valorPago + bonificacaoPagaEm).
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Conecta TR mostra o que já pagou — e pagar não apaga a venda',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    const itens = ((D.conectaTR || {}).lista) || [];

    const el = doc.getElementById('ctrPagamentos');
    assert(el, 'o bloco de bonificações pagas sumiu da aba Conecta TR');

    const pagas = itens.filter(it => (it.valorPago || 0) > 0);
    const total = pagas.reduce((s, it) => s + (it.valorPago || 0), 0);
    const texto = el.textContent.replace(/\s+/g, ' ');

    if (!pagas.length) {
      // Vazio tem que FALAR. Um bloco que some quando está zerado esconde
      // justamente o estado que precisa incomodar.
      assert(/ainda não pagou ninguém/i.test(texto),
        'sem pagamentos, o bloco precisa dizer que ninguém recebeu — não sumir');
    } else {
      const digitos = texto.replace(/\D/g, '');
      assert(digitos.indexOf(String(Math.round(total))) !== -1,
        `o total pago (${Math.round(total)}) não aparece: "${texto.slice(0, 120)}"`);
      pagas.forEach(p => {
        assert(texto.indexOf(p.indicador) !== -1,
          `o indicador "${p.indicador}" recebeu e não aparece no histórico`);
        assert(texto.indexOf(p.protocolo) !== -1,
          `o protocolo ${p.protocolo} pagou e não aparece — sem ele não dá para auditar`);
        assert(p.bonificacaoPagaEm, `${p.protocolo} tem valor pago e nenhuma data de pagamento`);
      });
    }

    // "Paga" NÃO pode virar status de indicação: os contadores procuram
    // "Vendida" e "Captada", e um status novo derruba a venda de todos eles.
    assert(!itens.some(it => it.status === 'Paga'),
      'uma indicação está com status "Paga" — isso a tira dos contadores de vendida e captada');
    itens.filter(it => (it.valorPago || 0) > 0).forEach(it => {
      assert(it.status === 'Vendida',
        `${it.protocolo} foi pago mas não está como "Vendida" — a venda some dos contadores`);
      assert(!it.valorDevido,
        `${it.protocolo} foi pago e continua com valor devido em aberto`);
    });

    // O que o indicador já recebeu aparece no cartão dele: "a receber" é
    // promessa, "já pago" é prova — e é a prova que faz alguém indicar de novo.
    assert(/já pagos/.test(tpl), 'o cartão do indicador não mostra mais quanto ele já recebeu');
    assert(/recebido: minhas\.reduce/.test(tpl), 'o resumo do indicador não soma o que foi pago a ele');
  }
};
