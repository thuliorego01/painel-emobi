// O card do Pipeline é o FUNIL DE COMPRA. O Heber Lima aparecia lá com
// "Em Negociação · Valor R$310.000 · Comissão R$10.850" e um imóvel compatível
// (Cód. 9995) sobrando de quando ele também era comprador — mas ele só vende.
// Fase de funil, valor de compra e imóvel compatível são três informações de
// comprador coladas em quem não compra.
//
// Tirar do card, porém, não pode virar sumir da conta: o KPI "Leads Ativos"
// segue contando todo mundo. Se o número disser 10 e a tela mostrar 9 cards,
// é a mesma contradição que os Fechamentos no Mês já tiveram.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Cliente vendedor fica fora do funil de compra — e a conta continua fechando',
  async rodar() {
    const { dom, doc } = await montar();
    const D = dados(dom);
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    const INATIVAS = ['Inativo', 'Fechado Ganho', 'Fechado Perdido'];
    // Só "Vendedor" sai do funil. Papel ausente ou "A definir" CONTINUA na tela:
    // cliente novo não pode sumir porque ainda não foi classificado.
    const compra = (l) => l.papel !== 'Vendedor';
    const ativos = (D.leads || []).filter(l => !INATIVAS.includes(l.fase));
    const compradores = ativos.filter(compra);
    const vendedores = ativos.filter(l => !compra(l));

    const card = doc.getElementById('leadsCard');
    assert(card, 'o card do Pipeline sumiu');
    const cards = card.querySelectorAll('.lead-card');

    // 1. O card mostra os compradores, e só eles.
    assert(cards.length === compradores.length,
      `o card mostra ${cards.length} clientes e há ${compradores.length} compradores ativos`);

    // 2. Nenhum vendedor pode estar desenhado ali.
    const texto = card.textContent;
    vendedores.forEach(v => {
      const desenhado = [...cards].some(c => c.textContent.indexOf(v.nome) !== -1);
      assert(!desenhado, `"${v.nome}" é vendedor e voltou a aparecer como card no funil de compra`);
    });

    // 3. Mas eles precisam estar NOMEADOS embaixo do card, senão o KPI
    //    "Leads Ativos" e a lista na tela passam a discordar em silêncio.
    if (vendedores.length) {
      assert(/cliente[s]? vendedor/i.test(texto),
        'o card não avisa que existem clientes vendedores fora do funil');
      vendedores.forEach(v => assert(texto.indexOf(v.nome) !== -1,
        `"${v.nome}" sumiu do card sem ser citado na nota de rodapé`));
    }

    // 4. O KPI continua contando todo mundo — some o card com a nota e fecha.
    const kpis = doc.getElementById('homeKpis');
    const m = kpis.textContent.replace(/\s+/g, ' ').match(/Leads Ativos\s+(\d+)/);
    assert(m, 'não achei o KPI "Leads Ativos"');
    assert(Number(m[1]) === ativos.length,
      `o KPI diz ${m[1]} leads ativos e existem ${ativos.length}`);
    assert(cards.length + vendedores.length === Number(m[1]),
      `os ${cards.length} cards mais ${vendedores.length} vendedor(es) não fecham com o KPI de ${m[1]}`);

    // 5. E o filtro tem que ser por PAPEL, não pelo nome de ninguém.
    const bloco = (tpl.match(/const ehSomenteVendedor[\s\S]{0,260}/) || [''])[0];
    assert(/ehSomenteVendedor|papelDoLead/.test(bloco),
      'o card do funil voltou a listar todo lead ativo, sem olhar o papel do cliente');
  }
};
