// A VIRADA DO ANO.
//
// O painel era um painel de 2026: o título dizia "Meta 2026", a meta vinha de
// DATA.meta2026 e todo número do ano somava listaNegociacoes INTEIRA — o que
// dava certo só porque ali só havia negócios de 2026.
//
// Simulado em 05/01/2027, ele dizia "Recebido em 2027: R$114.111" para dinheiro
// de 2026, mantinha o título "Meta 2026" e projetava R$8,3 milhões de comissão
// porque dividia o ano inteiro por cinco dias decorridos.
//
// A regra que este teste protege: VOLUME pertence ao ano do FECHAMENTO,
// DINHEIRO pertence ao ano em que CAIU, e "a receber" é estoque — não pertence
// a ano nenhum e não zera em 1º de janeiro. O caso concreto é a Angélica:
// venda de setembro de 2026 com parcelas caindo até fevereiro de 2027.
const { montar, dados } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };
const txt = (doc, id) => { const e = doc.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };

module.exports = {
  nome: 'A virada do ano não quebra nem mente',
  async rodar() {
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.template.html'), 'utf8');

    // 1. O ano não pode estar escrito à mão em lugar nenhum que renderize.
    assert(!/const ANO_META = 20\d\d;/.test(tpl), 'o ano da meta voltou a ser fixo no código');
    assert(/const ANO_CORRENTE = \(new Date\(\)\)\.getFullYear\(\)/.test(tpl),
      'o ano corrente precisa vir do relógio');
    // As chaves antigas só podem sobreviver DENTRO de metaDoAno, como reserva
    // do ano que elas nomeiam. Fora dali, são o ano preso no código de novo.
    const dentro = (tpl.match(/function metaDoAno[\s\S]*?\n}/) || [''])[0];
    const fora = tpl.split(dentro).join('').replace(/\/\/[^\n]*/g, '');
    assert(!/DATA\.meta(Comissao)?2026/.test(fora),
      'DATA.meta2026 voltou a ser usado fora de metaDoAno — o ano ficou preso no código de novo');
    assert(/DATA\.metas/.test(tpl), 'não existe mais o mapa de metas por ano');

    // 2. Hoje (2026) nada pode ter mudado de comportamento.
    {
      const { doc } = await montar({ quando: new Date('2026-09-12T10:00:00-03:00') });
      assert(/Meta 2026 \(vendas\)/.test(doc.body.textContent), 'o título de 2026 deixou de dizer 2026');
      assert(!/R\$ 0 de R\$ 0/.test(txt(doc, 'metaHint')), 'a meta de 2026 sumiu');
    }

    // 3. Em 05/01/2027 o painel vira de ano sozinho.
    {
      const { dom, doc } = await montar({ quando: new Date('2027-01-05T10:00:00-03:00') });
      const D = dados(dom);
      // textContent do body inclui o texto dos <script>, e os comentários do
      // código citam "Meta 2026" de propósito, contando a história. O que
      // importa aqui é o que aparece NA TELA.
      const copia = doc.body.cloneNode(true);
      Array.prototype.forEach.call(copia.querySelectorAll('script, style'), n => n.remove());
      const corpo = copia.textContent.replace(/\s+/g, ' ');

      assert(/Meta 2027 \(vendas\)/.test(corpo), 'o título não acompanhou a virada do ano');
      assert(!/Meta 2026/.test(corpo), 'em 2027 ainda aparece "Meta 2026" em algum título');
      assert(/Recebido em 2027/.test(corpo), 'o rótulo do recebido não virou o ano');

      // Volume do ano novo começa do zero — o de 2026 não se arrasta.
      const negociado2027 = (D.listaNegociacoes || [])
        .filter(n => Number(n.ano) === 2027 && (n.tipo === 'Venda' || n.tipo === 'Locação'))
        .reduce((s, n) => s + (n.valor || 0), 0);
      const digitos = txt(doc, 'totalNegociado').replace(/\D/g, '');
      assert(digitos === String(Math.round(negociado2027)) || Number(digitos || 0) === Math.round(negociado2027),
        `"Total Negociado no Ano" mostra ${txt(doc, 'totalNegociado')} em 2027, e o volume de 2027 é ${negociado2027}`);

      // Dinheiro pertence ao ano em que CAIU: só parcelas com data de
      // recebimento em 2027 entram no recebido de 2027.
      const recebido2027 = (D.listaNegociacoes || []).reduce((soma, n) => {
        if (Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.length && n.valor) {
          return soma + n.fluxoPagamento
            .filter(p => p.recebido && String(p.dataRecebimento || '').slice(0, 4) === '2027')
            .reduce((s, p) => s + (p.valor / n.valor) * (n.comissao || 0), 0);
        }
        return soma + (Number(n.ano) === 2027 ? (n.status === 'pago' ? (n.comissao || 0) : (n.comissaoRecebida || 0)) : 0);
      }, 0);
      const pagoNaTela = Number(txt(doc, 'comissaoPaga').replace(/\D/g, '') || 0);
      assert(Math.abs(pagoNaTela - Math.round(recebido2027)) <= 1,
        `"Comissão Paga" mostra ${pagoNaTela} em 2027 e o recebido em 2027 é ${Math.round(recebido2027)}`);

      // "A receber" é ESTOQUE: não zera na virada.
      const aberto = (D.listaNegociacoes || []).reduce((s, n) => {
        const rec = (Array.isArray(n.fluxoPagamento) && n.fluxoPagamento.length && n.valor)
          ? n.fluxoPagamento.filter(p => p.recebido).reduce((x, p) => x + (p.valor / n.valor) * (n.comissao || 0), 0)
          : (typeof n.comissaoRecebida === 'number' ? n.comissaoRecebida : (n.status === 'pago' ? (n.comissao || 0) : 0));
        return s + Math.max(0, (n.comissao || 0) - rec);
      }, 0);
      const aguardandoTela = Number(txt(doc, 'comissaoAguardando').replace(/\D/g, '') || 0);
      assert(Math.abs(aguardandoTela - Math.round(aberto)) <= 1,
        `comissão a receber virou ${aguardandoTela} em 2027 — devia continuar ${Math.round(aberto)}, porque dívida não zera em 1º de janeiro`);

      // Projeção a partir de cinco dias é invenção.
      assert(txt(doc, 'projecaoAnual') === '—', 'o painel projetou o ano inteiro com menos de um mês de ritmo');
      assert(/cedo demais/i.test(txt(doc, 'projecaoAnualHint')), 'a projeção suprimida não explica por quê');

      // Meta inexistente é "não definida", nunca zero.
      assert(/ainda não definida/i.test(txt(doc, 'metaComissaoHint')),
        'sem meta para o ano novo, o painel precisa dizer que ela não existe em vez de mostrar 0 de 0');
    }
  }
};
