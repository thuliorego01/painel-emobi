// "status: pago / aguardando" é binário e não sabe dizer "metade". A venda do
// Maria Gorette (Mossoró) recebeu R$17.500 em maio e tem a outra metade presa à
// venda de um terreno dado como parte do pagamento: ganha, sem data. Como
// "pago" mentia para mais; como "aguardando" mentia para menos.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Comissão meio recebida não vira nem paga nem pendente',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const negs = D.listaNegociacoes || [];
    const recebidoDe = dom.window.eval('recebidoDe');
    const aReceberDe = dom.window.eval('aReceberDe');
    const FIN = dom.window.eval('FIN');

    // 1. Parcial nunca pode ser maior que o total.
    negs.forEach(n => {
      if (typeof n.comissaoRecebida === 'number') {
        assert(n.comissaoRecebida >= 0, `${n.imovel}: comissaoRecebida negativa`);
        assert(n.comissaoRecebida <= (n.comissao || 0),
          `${n.imovel}: recebido ${n.comissaoRecebida} > comissão ${n.comissao}`);
      }
    });

    // 2. Recebido + a receber = total. Nada pode sumir nem ser contado duas vezes.
    const total = negs.reduce((s, n) => s + (n.comissao || 0), 0);
    assert(FIN.comissaoPaga + FIN.comissaoAguardando === total,
      `recebido (${FIN.comissaoPaga}) + a receber (${FIN.comissaoAguardando}) != total (${total})`);

    // 3. Linha sem comissaoRecebida continua se comportando pelo status antigo.
    negs.filter(n => typeof n.comissaoRecebida !== 'number').forEach(n => {
      const esperado = n.status === 'pago' ? (n.comissao || 0) : 0;
      assert(recebidoDe(n) === esperado,
        `${n.imovel}: linha sem parcial mudou de comportamento (${recebidoDe(n)} != ${esperado})`);
    });

    // 4. Comissão sem data prevista não pode se esconder dentro de "a receber".
    const semData = negs.reduce((s, n) => s + (n.semDataPrevista ? aReceberDe(n) : 0), 0);
    assert(FIN.semDataPrevista === semData,
      `FIN.semDataPrevista = ${FIN.semDataPrevista}, esperado ${semData}`);
    if (semData > 0) {
      const txt = doc.body.textContent;
      assert(/sem data prevista/i.test(txt),
        'há comissão ganha sem data de recebimento e a tela não avisa em lugar nenhum');
    }

    // 5. O rótulo tem que descrever o que o número é.
    const situacao = dom.window.eval('situacaoComissao');
    negs.forEach(n => {
      const s = situacao(n);
      if (recebidoDe(n) > 0 && aReceberDe(n) > 0) {
        assert(/parcial/i.test(s), `${n.imovel}: meio recebida está rotulada como "${s}"`);
      }
    });

    // 6. O template é a fonte — publicar só o HTML gerado desfaz no próximo build.
    const tpl = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    assert(tpl.indexOf('function recebidoDe') !== -1,
      'a regra não está no TEMPLATE, só no HTML gerado — o próximo build desfaz');
  }
};
