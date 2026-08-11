const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

module.exports = { nome: 'Reativação: viva, nunca zerada por regra', rodar: async () => {
  const { dom, doc } = await montar();
  const box = doc.getElementById('reativacaoCard');
  assert(box, 'quadro de reativação ausente');
  assert(/Como esta conta é feita/.test(txt(box)), 'a regra da conta deveria estar explicada');

  // A regra antiga excluía a fase Inativo — justamente quem precisa de reativação.
  // Logo: se existe lead inativo com retomada vencida, o quadro não pode dar zero.
  // Duas portas de entrada, e as duas contam: data combinada vencida OU degrau
  // da escada de reativação vencido. Antes só a data contava, e quem não tinha
  // data nenhuma ficava invisível para sempre.
  const DATA = dados(dom);
  const motivo = dom.window.eval('motivoReativacao');
  const vencidos = (DATA.leads || []).filter(l => l.fase === 'Inativo' && motivo(l));
  const total = box.querySelectorAll('.reativa-item').length;
  assert(total === vencidos.length,
    `esperava ${vencidos.length} para reativar, o quadro mostra ${total}`);
  if (vencidos.length) {
    assert(/retomada combinada|toque|parado/.test(txt(box)), 'faltou dizer POR QUE cada um entrou');
  }
}};
