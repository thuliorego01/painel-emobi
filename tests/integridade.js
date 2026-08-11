// ---------------------------------------------------------------------------
// Verificador de integridade referencial do CRM.
//
// Cinco bugs desta semana foram a MESMA falha em cantos diferentes: uma
// referência guardada de forma instável (nome, texto, posição no array).
// Análise por julgamento acha a categoria; só a varredura acha todas as
// instâncias. Este arquivo percorre as relações uma a uma e prova que cada
// referência resolve — ou aponta exatamente onde não resolve.
//
// Uso: node tests/integridade.js        (também roda dentro do verificar.sh)
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data.json'), 'utf8'));
const problemas = [];
const avisos = [];
const relatorio = [];

const leads = DATA.leads || [];
const imoveis = DATA.imoveis || [];
const negs = DATA.listaNegociacoes || [];
const ctr = DATA.conectaTR || {};
const indicacoes = ctr.lista || [];
const indicadores = ctr.indicadoresLista || [];
const prospeccao = DATA.prospeccaoCaptacao || [];
const lembretes = DATA.lembretes || [];
const log = DATA.logAtividades || [];

const idsLeads = new Set(leads.map(l => String(l.id)));
const nomesLeads = new Set(leads.map(l => l.nome));
const nomesImoveis = new Set(imoveis.map(i => i.nome));
const idsImoveis = new Set(imoveis.map(i => String(i.id)).filter(v => v !== 'undefined'));
const idsIndicadores = new Set(indicadores.map(i => String(i.id)));
const codsImoveis = new Set(
  imoveis.map(i => (String(i.nome).match(/Cód\.\s*(\d+)/) || [])[1]).filter(Boolean));
const imovelPorCod = new Map();
imoveis.forEach(i => {
  const c = (String(i.nome).match(/Cód\.\s*(\d+)/) || [])[1];
  if (c) imovelPorCod.set(c, i);
});

function checa(nome, itens, campo, resolve, opts = {}) {
  let comValor = 0, quebrados = [];
  itens.forEach((it, i) => {
    const v = typeof campo === 'function' ? campo(it) : it[campo];
    if (v === undefined || v === null || v === '') return;
    comValor++;
    if (!resolve(v, it)) quebrados.push(`${opts.rotulo ? opts.rotulo(it) : '#' + i} → "${v}"`);
  });
  relatorio.push({ nome, comValor, total: itens.length, quebrados: quebrados.length, tipo: opts.tipo || 'ID' });
  if (quebrados.length) {
    problemas.push(`${nome}: ${quebrados.length} referência(s) não resolvem\n      ` + quebrados.join('\n      '));
  }
  if (opts.tipo === 'texto' && comValor > 0) {
    avisos.push(`${nome}: ${comValor} ligação(ões) por ${opts.porQue || 'nome/texto'} — frágil, muda quando o alvo é renomeado`);
  }
}

// --- relações por ID (as sólidas) ---
checa('log → lead', log, 'leadId', v => idsLeads.has(String(v)),
  { rotulo: a => a.data + ' ' + (a.lead || '') });
checa('negociação → vendedor', negs, 'vendedorLeadId', v => idsLeads.has(String(v)),
  { rotulo: n => n.imovel });
checa('negociação → comprador', negs, 'compradorLeadId', v => idsLeads.has(String(v)),
  { rotulo: n => n.imovel });
checa('imóvel → comprador', imoveis, 'compradorLeadId', v => idsLeads.has(String(v)),
  { rotulo: i => i.nome });
checa('indicação → indicador', indicacoes, 'indicadorId', v => idsIndicadores.has(String(v)),
  { rotulo: x => x.protocolo });

// --- relações por nome/código (as frágeis, mas verificáveis) ---
checa('indicação → imóvel', indicacoes, 'imovelId', v => idsImoveis.has(String(v)),
  { rotulo: x => x.protocolo });
checa('lead → imóvel negociado', leads, 'imovelId', v => idsImoveis.has(String(v)),
  { rotulo: l => l.nome });
checa('prospecção → imóvel captado', prospeccao, 'imovelCaptadoCod', v => codsImoveis.has(String(v)),
  { rotulo: p => p.nome, tipo: 'texto', porQue: 'código do imóvel' });

// imóveis compatíveis: lista de "Cód. NNNNN"
(function compativeis() {
  let comValor = 0; const quebrados = [];
  leads.forEach(l => {
    (l.imoveisCompativeis || []).forEach(ref => {
      comValor++;
      const cod = (String(ref).match(/(\d+)/) || [])[1];
      if (!cod || !codsImoveis.has(cod)) quebrados.push(`${l.nome} → "${ref}" (não existe)`);
      // Imóvel que saiu da carteira não é sugestão: o painel nem mostra mais.
      else if (imovelPorCod.get(cod) && imovelPorCod.get(cod).status === 'Fora da carteira')
        quebrados.push(`${l.nome} → "${ref}" (fora da carteira: ${imovelPorCod.get(cod).motivoSaida || 'sem motivo'})`);
    });
  });
  relatorio.push({ nome: 'lead → imóveis compatíveis', comValor, total: leads.length, quebrados: quebrados.length, tipo: 'texto' });
  if (quebrados.length) problemas.push('lead → imóveis compatíveis: código inexistente\n      ' + quebrados.join('\n      '));
  if (comValor) avisos.push(`lead → imóveis compatíveis: ${comValor} ligação(ões) por código dentro de texto`);
})();

// lembrete → cliente: texto livre, pode apontar para lead, imóvel ou nada
(function lembretesRel() {
  let comValor = 0; const soltos = [];
  lembretes.forEach(l => {
    if (!l.relacionado) return;
    comValor++;
    // Um lembrete pode se referir a lead, imóvel, indicador do Conecta TR ou
    // prospecção — todos são alvos legítimos. Só é órfão quem não é nenhum.
    const alvo = l.relacionado;
    const ehLead = nomesLeads.has(alvo);
    const ehImovel = [...nomesImoveis].some(n => n.includes(alvo) || alvo.includes(n));
    const ehCodigo = /Cód\.\s*(\d+)/.test(alvo) && codsImoveis.has((alvo.match(/Cód\.\s*(\d+)/) || [])[1]);
    const ehIndicador = indicadores.some(i => i.nome.includes(alvo) || alvo.includes(i.nome.split(' ')[0]));
    const ehProspeccao = prospeccao.some(pr => pr.nome === alvo);
    const ehGenerico = /carteira|conecta|clientes/i.test(alvo);
    if (!(ehLead || ehImovel || ehCodigo || ehIndicador || ehProspeccao || ehGenerico))
      soltos.push(`"${alvo}" (${l.texto.slice(0, 44)}…)`);
  });
  relatorio.push({ nome: 'lembrete → cliente', comValor, total: lembretes.length, quebrados: soltos.length, tipo: 'texto' });
  if (soltos.length) avisos.push('lembrete → cliente: ' + soltos.length + ' apontam para nome que não é lead nem imóvel\n      ' + soltos.join('\n      '));
  if (comValor) avisos.push(`lembrete → cliente: ${comValor} ligação(ões) por texto livre — deveria ser leadId`);
})();

// --- coerência interna, além das referências ---
leads.filter(l => l.fase === 'Fechado Ganho').forEach(l => {
  if (!l.dataFechamento) problemas.push(`${l.nome} está em Fechado Ganho sem dataFechamento — a cadência de pós-venda não roda`);
  const temNeg = negs.some(n => String(n.compradorLeadId) === String(l.id) || String(n.vendedorLeadId) === String(l.id));
  if (!temNeg) avisos.push(`${l.nome} fechou negócio mas não está ligado a nenhuma negociação`);
});
leads.forEach(l => {
  const temLog = log.some(a => String(a.leadId) === String(l.id));
  if (!temLog) problemas.push(`${l.nome} não tem nenhuma entrada de histórico ligada por ID`);
});
imoveis.filter(i => i.status === 'Vendido').forEach(i => {
  ['dataVenda', 'comissaoThulioVenda'].forEach(c => {
    if (i[c] === undefined || i[c] === null) problemas.push(`${i.nome} está Vendido sem ${c}`);
  });
});
// campos que viraram cálculo ao vivo não podem ressuscitar
const MORTOS = [
  ['leads[].statusReativacao', leads.some(l => 'statusReativacao' in l)],
  ['leads[].status', leads.some(l => 'status' in l)],
  ['imoveis[].pctComissao', imoveis.some(i => 'pctComissao' in i)],
  // Inativo não tem temperatura: ela vira temperaturaAoInativar quando o lead para.
  ['leads inativos com temperatura', leads.some(l => l.fase === 'Inativo' && l.temperatura)],
  // A nota de 2021 (Ubatuba) já está somada aos totais desde 30/07. Ela voltou
  // sozinha em 09/08 porque a planilha continuava sendo a fonte dela.
  ['historico.notaDivergencia', 'notaDivergencia' in (DATA.historico || {})],
  ['historico.notaAmostra', 'notaAmostra' in (DATA.historico || {})],
  ['lembretes[].quando', lembretes.some(l => 'quando' in l)],
  ['lembretes[].dataFmt', lembretes.some(l => 'dataFmt' in l)],
  ['prospeccao[].statusPrazo', prospeccao.some(p => 'statusPrazo' in p)],
  ['conectaTR.lista[].vinculadoId', indicacoes.some(x => 'vinculadoId' in x)],
  ['historico.sazonalidade', 'sazonalidade' in (DATA.historico || {})],
  ['meta2026.realizado', 'realizado' in (DATA.meta2026 || {})],
  ['comissao.paga', 'paga' in (DATA.comissao || {})]
];
// Nome de imóvel copiado para outro registro é a semente do bug #2: a cópia
// dessincroniza quando o original muda.
const COPIAS = [
  ['conectaTR.lista[].imovelCarteira', indicacoes.some(x => 'imovelCarteira' in x)],
  ['leads[].imovelNegociado', leads.some(l => 'imovelNegociado' in l)]
];
COPIAS.filter(([, existe]) => existe).forEach(([nome]) =>
  problemas.push(`${nome} guarda o NOME do imóvel — use imovelId e calcule o nome na hora`));
// Todo imóvel precisa de id: sem ele, quem quiser referenciá-lo vai inventar
// uma chave frágil (foi o que produziu o índice posicional).
const semId = imoveis.filter(i => i.id === undefined || i.id === null).map(i => i.nome);
if (semId.length) problemas.push(`${semId.length} imóvel(is) sem id estável:\n      ` + semId.join('\n      '));

MORTOS.filter(([, existe]) => existe).forEach(([nome]) =>
  problemas.push(`${nome} ressuscitou — esse campo virou cálculo ao vivo e vai envelhecer se ficar guardado`));

// --- saída ---
console.log('\n  RELAÇÕES DO CRM');
relatorio.forEach(r => {
  // ✗ só quando é erro de verdade. Ligação por texto que aponta para algo
  // fora do CRM é fragilidade, não quebra.
  const erro = r.quebrados && r.tipo !== 'texto';
  const marca = erro ? '✗' : (r.tipo === 'texto' ? '~' : '✓');
  console.log(`   ${marca} ${r.nome.padEnd(32)} ${String(r.comValor).padStart(3)}/${String(r.total).padEnd(4)} ${r.tipo === 'texto' ? 'por texto' : 'por ID'}${r.quebrados ? '  — ' + r.quebrados + (erro ? ' quebrada(s)' : ' fora do CRM') : ''}`);
});
const porTexto = relatorio.filter(r => r.tipo === 'texto' && r.comValor > 0).length;
console.log(`\n  ${relatorio.length} relações · ${porTexto} ainda dependem de nome ou texto`);

if (avisos.length) {
  console.log('\n  FRAGILIDADES (não quebrado hoje, quebra quando algo for renomeado)');
  avisos.forEach(a => console.log('   ~ ' + a));
}
if (problemas.length) {
  console.log('\n  QUEBRADO');
  problemas.forEach(p => console.log('   ✗ ' + p));
  console.log(`\n  ${problemas.length} problema(s) de integridade.\n`);
  process.exit(1);
}
console.log('\n  Nenhuma referência quebrada.\n');
