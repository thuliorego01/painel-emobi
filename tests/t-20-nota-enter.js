// Anotar atualização: no desktop, Enter salva. Antes era só o botão — e a
// nota é a coisa mais frequente que se faz no painel, várias vezes por dia.
// Shift+Enter continua quebrando linha, e no celular o Enter NÃO salva
// (lá não existe Shift+Enter: salvaria a frase pela metade).
const { montar } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Nota do cliente: Enter salva no desktop',
  async rodar() {
    const { dom, doc } = await montar();
    const w = dom.window;

    const card = doc.querySelector('[data-lead-nome]');
    assert(card, 'nenhum card de lead para abrir');
    card.dispatchEvent(new w.Event('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));

    const ta = doc.getElementById('leadNotaTexto');
    assert(ta, 'a caixa de anotação sumiu');

    const chamadas = [];
    w.fetch = (url, opt) => {
      chamadas.push({ url: String(url), opt });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ nota: { id: 'x', lead: 'y', texto: 'z', criadaEm: new Date().toISOString() } }) });
    };
    const enter = (shift) => ta.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', shiftKey: !!shift, bubbles: true, cancelable: true }));

    // Shift+Enter não pode salvar: é a quebra de linha.
    ta.value = 'primeira linha';
    enter(true);
    await new Promise(r => setTimeout(r, 200));
    assert(!chamadas.some(c => /\/api\/notas/.test(c.url) && c.opt && c.opt.method === 'POST'),
      'Shift+Enter salvou a nota — deveria só quebrar a linha');

    // Enter sozinho salva.
    ta.value = 'visitou hoje e gostou';
    enter(false);
    await new Promise(r => setTimeout(r, 400));
    const post = chamadas.find(c => /\/api\/notas/.test(c.url) && c.opt && c.opt.method === 'POST');
    assert(post, 'Enter não salvou a nota');
    assert(/visitou hoje e gostou/.test(String(post.opt.body)), 'salvou, mas sem o texto digitado');
    assert(ta.value === '', 'a caixa não foi limpa depois de salvar');

    // E a dica precisa estar escrita: atalho que ninguém sabe não existe.
    const dica = doc.querySelector('.nota-box').textContent;
    assert(/Enter/.test(dica) && /Shift/.test(dica), 'o atalho não está explicado na tela');
  }
};
