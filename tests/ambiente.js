// Monta o painel em jsdom com os dublês necessários.
// `quando` congela a data, para simular a virada do dia/mês/ano.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ALVO = path.join(__dirname, '..', 'public', 'index.html');

function montar({ quando = null, capturarCharts = false } = {}) {
  const graficos = {};
  const html = fs.readFileSync(ALVO, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://painel.local/',
    beforeParse(w) {
      if (quando) {
        const Real = Date;
        class Congelada extends Real {
          constructor(...a) { if (a.length === 0) super(quando.getTime()); else super(...a); }
          static now() { return quando.getTime(); }
        }
        w.Date = Congelada;
      }
      // Sem backend nos testes: o painel tem que se virar com a lista vazia.
      w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      function ChartFalso(el, cfg) {
        if (capturarCharts && el && el.id) graficos[el.id] = cfg;
        this.destroy = function () {}; this.update = function () {};
        return this;
      }
      ChartFalso.register = function () {};
      ChartFalso.helpers = {};
      ChartFalso.defaults = { font: { family: 's', size: 12 }, color: '#000', plugins: { legend: { labels: {} } } };
      // Nos testes o painel roda como desktop: (pointer: fine) casa. É o
      // ambiente onde o Enter salva a nota — no toque, o botão é o caminho.
      w.matchMedia = (q) => ({
        media: q, matches: /pointer:\s*fine/.test(String(q)), onchange: null,
        addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }
      });
      w.Chart = ChartFalso;
    }
  });
  return new Promise(resolve => {
    setTimeout(() => resolve({ dom, doc: dom.window.document, graficos }), 1500);
  });
}

const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
// DATA é `const` no escopo do script: cria binding léxico, não vira window.DATA.
const dados = (dom) => dom.window.eval('DATA');
const porId = (doc, id) => txt(doc.getElementById(id));
const clicar = (dom, el) => el.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

module.exports = { montar, txt, porId, clicar, dados, ALVO };
