// Lead inativo não tem temperatura. Temperatura mede o calor de uma conversa
// em andamento; sem conversa ela não existe. Enquanto existia, três inativos
// marcados como "Morno" herdavam a cadência de 7 dias de cliente ativo —
// urgência inventada em cima de gente dormente. Agora vale a escada de
// 30/60/90 dias da aba Cadencia, contada do dia em que a pessoa parou. A
// temperatura de quando parou fica guardada: quem estava Quente e sumiu se
// reaborda diferente de quem nunca passou de Frio.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Inativo segue a escada, não a temperatura',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);
    const inativos = (DATA.leads || []).filter(l => l.fase === 'Inativo');
    if (!inativos.length) return;

    const degraus = (DATA.cadenciaReativacao || {}).degraus;
    assert(Array.isArray(degraus) && degraus.length, 'a escada de reativação sumiu do data.json');

    inativos.forEach(l => {
      assert(!l.temperatura,
        `${l.nome} está Inativo e ainda tem temperatura "${l.temperatura}" — inativo não tem temperatura`);
      assert(l.dataInativacao,
        `${l.nome} está Inativo sem data de inativação: sem ela a escada não tem de onde contar`);
      assert(l.temperaturaAoInativar,
        `${l.nome} perdeu a temperatura de quando parou — isso é história, não pode sumir`);
    });

    // A escada tem que bater com a conta de dias.
    const degrau = dom.window.eval('degrauReativacao');
    inativos.forEach(l => {
      const d = degrau(l);
      assert(d, `${l.nome}: não consegui calcular o degrau`);
      // A escada pode ser própria do lead: cadência é acordo, não dogma.
      const escada = (typeof l.cadenciaDias === 'number' && l.cadenciaDias > 0)
        ? [1, 2, 3].map(i => l.cadenciaDias * i) : degraus;
      const esperado = escada.filter(x => d.parado >= x).pop();
      assert((esperado === undefined ? null : esperado) === d.vencido,
        `${l.nome}: degrau vencido devia ser ${esperado} e veio ${d.vencido}`);
    });

    // Nenhum inativo pode ser cobrado pela cadência de temperatura.
    const motivo = dom.window.eval('motivoReativacao');
    inativos.filter(l => !l.dataProximaAcao).forEach(l => {
      const m = motivo(l);
      if (m) assert(m.regra === 'escada',
        `${l.nome} está sendo cobrado pela regra "${m.regra}" em vez da escada`);
    });

    // Na tela: nada de selo de temperatura ativa em quem parou.
    const secao = doc.getElementById('leadsInativosCard');
    assert(secao, 'a seção de inativos sumiu');
    ['temp quente', 'temp morno', 'temp frio'].forEach(cls => {
      const sel = '.' + cls.split(' ').join('.');
      assert(!secao.querySelector(sel),
        `um inativo está exibindo selo de temperatura ativa (${cls})`);
    });
    assert(/estava /.test(secao.textContent),
      'a temperatura de quando o lead parou não aparece como história');
    assert(/toque/.test(secao.textContent),
      'o card do inativo não diz em que pé está a escada de reativação');
  }
};
