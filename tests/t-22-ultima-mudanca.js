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
    // A data pode vir em palavras ("hoje", "ontem") — o que não pode é apontar
    // para um momento diferente do da última mudança. Só a data crua não
    // respondia "isso está velho?": ver 16/08 num dia 17 tanto pode ser painel
    // desatualizado quanto dia sem novidade, e são coisas opostas.
    const p2 = (n) => String(n).padStart(2, '0');
    const esperado = `${p2(u.quando.getDate())}/${p2(u.quando.getMonth() + 1)}`;
    const hh = `${p2(u.quando.getHours())}:${p2(u.quando.getMinutes())}`;
    const zero = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const dias = Math.round((zero(new Date()) - zero(u.quando)) / 86400000);
    const aceitos = dias === 0 ? ['hoje'] : dias === 1 ? ['ontem'] : dias < 7 ? [`há ${dias} dias`, esperado] : [esperado];
    assert(aceitos.some(a => texto.includes(a)),
      `esperava a última mudança (${esperado}, ${dias}d atrás) e achei: "${texto}"`);
    assert(texto.includes(hh), `faltou a hora da última mudança (${hh}): "${texto}"`);

    // E não pode ser a data de gravação do arquivo, quando as duas diferem.
    if (DATA.ultimaAtualizacao) {
      const grav = new Date(DATA.ultimaAtualizacao);
      const gravFmt = `${p2(grav.getDate())}/${p2(grav.getMonth() + 1)}`;
      if (gravFmt !== esperado) {
        const hg = `${p2(grav.getHours())}:${p2(grav.getMinutes())}`;
        assert(!texto.includes(hg) || hg === hh,
          'a manchete continua sendo a hora da gravação, não a da mudança');
      }
    }
  }
};
