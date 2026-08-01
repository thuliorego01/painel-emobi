#!/usr/bin/env node
// Monta public/index.html a partir de public/index.template.html + public/data.json.
// Uso: node scripts/montar-painel.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'public', 'index.template.html');
const DATA_PATH = path.join(ROOT, 'public', 'data.json');
const OUTPUT_PATH = path.join(ROOT, 'public', 'index.html');
const MARKER = 'const DATA = /*__PAINEL_DATA_PLACEHOLDER__*/{};';

function main() {
  const dataRaw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(dataRaw); // lança erro e para tudo se o JSON estiver quebrado

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const ocorrencias = template.split(MARKER).length - 1;
  if (ocorrencias !== 1) {
    throw new Error(
      `Esperava encontrar o marcador exatamente 1 vez em index.template.html, encontrei ${ocorrencias}. Abortando sem escrever nada.`
    );
  }

  // Escapa "</script" pra nunca fechar a tag <script> no meio dos dados.
  const json = JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
  const output = template.replace(MARKER, `const DATA = ${json};`);

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');

  console.log('painel montado com sucesso:');
  console.log('  leads:', (data.leads || []).length);
  console.log('  imoveis:', (data.imoveis || []).length);
  console.log('  logAtividades:', (data.logAtividades || []).length);
  console.log('  ultimaAtualizacao:', data.ultimaAtualizacao);
  console.log('  ->', OUTPUT_PATH);
}

main();
