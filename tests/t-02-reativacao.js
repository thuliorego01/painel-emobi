const assert = require('assert');
const { montar, txt, dados } = require('./ambiente');

module.exports = { nome: 'Reativação: viva, nunca zerada por regra', rodar: async () => {
  const { dom, doc } = await montar();
  const box = doc.getElementById('reativacaoCard');
  assert(box, 'quadro de reativação ausente');
  assert(/Como esta conta é feita/.test(txt(box)), 'a regra da conta deveria estar explicada');

  // A regra antiga excluía a fase Inativo — justamente quem precisa de reativação.
  // Logo: se existe lead inativo com retomada vencida, o quadro não pode dar zero.
  const DATA = dados(dom);
  const hoje = new Date();
  const vencidos = (DATA.leads || []).filter(l =>
    l.fase === 'Inativo' && l.dataProximaAcao && new Date(l.dataProximaAcao + 'T00:00:00') <= hoje);
  const total = box.querySelectorAll('.reativa-item').length;
  assert(total === vencidos.length,
    `esperava ${vencidos.length} para reativar, o quadro mostra ${total}`);
  if (vencidos.length) {
    assert(/retomada combinada|parado/.test(txt(box)), 'faltou dizer POR QUE cada um entrou');
  }
}};
