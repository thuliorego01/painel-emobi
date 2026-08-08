// O rodapé dizia "Sincronizado 08/08 às 07:00" quando a última mudança de
// verdade — o fechamento da Camilla — tinha sido na véspera às 11:20. Ele
// media ESCRITA (o briefing das 7h grava todo dia, mesmo sem novidade), não
// MUDANÇA. Respondia com precisão a pergunta errada.
const { montar, dados } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Rodapé mostra a última mudança, não a última escrita',
  async rodar() {
    const { dom, doc } = await montar();
    const DATA = dados(dom);
    const texto = doc.querySelector('.sidebar-sync-text').textContent.replace(/\s+/g, ' ').trim();

    assert(/Última atualização/i.test(texto), 'o rótulo precisa dizer Última atualização');

    // Tem que bater com a entrada mais recente do histórico.
    const u = dom.window.eval('ultimaMudancaReal')();
    assert(u, 'não consegui achar a última mudança no histórico');
    const p2 = (n) => String(n).padStart(2, '0');
    const esperado = `${p2(u.quando.getDate())}/${p2(u.quando.getMonth() + 1)}`;
    assert(texto.includes(esperado),
      `esperava a data da última mudança (${esperado}) e achei: "${texto}"`);

    // E não pode ser a data de gravação do arquivo, quando as duas diferem.
    if (DATA.ultimaAtualizacao) {
      const grav = new Date(DATA.ultimaAtualizacao);
      const gravFmt = `${p2(grav.getDate())}/${p2(grav.getMonth() + 1)}`;
      if (gravFmt !== esperado) {
        const antes = texto;
        assert(!antes.includes(gravFmt),
          'a manchete continua sendo a hora da gravação, não a da mudança');
      }
    }
  }
};
