// Comprador e vendedor viviam na mesma lista sem distinção, e o painel tratava
// os dois como se percorressem a mesma jornada. O card dizia "Heber Lima · Em
// Negociação · acompanhar contrato" — lendo como se ele estivesse comprando,
// quando é ele quem vende.
// O papel NÃO é dedutível dos vínculos: a Caroline Evelin é vendedorLeadId de
// uma venda antiga e hoje compra. Vínculo é passado, papel é presente.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Papel do cliente: comprador, vendedor ou ambos',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');
    const VALIDOS = ['Comprador', 'Vendedor', 'Ambos', 'A definir'];

    // 1. Todo lead tem um papel reconhecível.
    (D.leads || []).forEach(l => {
      if (l.papel === undefined) return; // "A definir" é o padrão de quem ainda não foi marcado
      assert(VALIDOS.indexOf(l.papel) !== -1,
        `${l.nome}: papel "${l.papel}" não é um dos ${VALIDOS.join(', ')}`);
    });

    // 2. O FUNIL é a jornada de quem compra. Vendedor não pode entrar: ele
    //    inflava as etapas iniciais e distorcia a queda até a proposta.
    assert(/const LEADS_COMPRA = DATA\.leads\.filter\(compraNoFunil\)/.test(tpl),
      'o funil de conversão voltou a contar todos os leads, inclusive vendedores');
    assert(/const leads = \(DATA\.leads \|\| \[\]\)\.filter\(compraNoFunil\)/.test(tpl),
      'o termômetro do funil voltou a contar vendedores');

    const compradores = (D.leads || []).filter(l => l.papel === 'Comprador' || l.papel === 'Ambos');
    const funil = dom.window.eval('LEADS_COMPRA') || [];
    assert(funil.length === compradores.length,
      `o funil conta ${funil.length} e há ${compradores.length} clientes que compram`);
    funil.forEach(l => assert(l.papel !== 'Vendedor',
      `${l.nome} é vendedor e está dentro do funil de compra`));

    // 3. A nota da amostra tem que dizer de quem ela fala.
    const nota = doc.getElementById('amostraNota');
    assert(nota && /comprador/i.test(nota.textContent),
      'a nota do funil não diz que a amostra é de compradores');

    // 4. O papel aparece na tela — senão o card continua ambíguo.
    assert(/class="papel/.test(tpl), 'o papel não é mostrado em lugar nenhum');

    // 5. Não pode ser deduzido do vínculo. Se alguém trocar o campo por uma
    //    dedução, a Caroline volta a ser vendedora e o funil perde uma compradora.
    assert(!/papel\s*=\s*.*proprietarioLeadId/.test(tpl),
      'o papel voltou a ser deduzido do vínculo — vínculo é passado, papel é presente');
  }
};
