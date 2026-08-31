// O index.html é GERADO: ele carrega uma cópia dos dados dentro de si. Se
// alguém publicar um index.html montado a partir de um data.json antigo, o
// painel mostra dados velhos com um data.json novo ao lado — e ninguém
// desconfia, porque o arquivo de dados está certo.
// Aconteceu em 31/08/2026: o rodapé dizia "há 3 dias" enquanto o data.json
// publicado já tinha o registro daquela manhã.
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'O HTML publicado bate com o data.json publicado',
  async rodar() {
    const raiz = path.join(__dirname, '..');
    const tpl = fs.readFileSync(path.join(raiz, 'public', 'index.template.html'), 'utf8');
    const dados = JSON.parse(fs.readFileSync(path.join(raiz, 'public', 'data.json'), 'utf8'));
    const html = fs.readFileSync(path.join(raiz, 'public', 'index.html'), 'utf8');

    const MARCADOR = 'const DATA = /*__PAINEL_DATA_PLACEHOLDER__*/{};';
    assert(tpl.split(MARCADOR).length - 1 === 1,
      'o marcador não aparece exatamente uma vez no template');

    const esperado = tpl.replace(MARCADOR,
      'const DATA = ' + JSON.stringify(dados).replace(/<\/script/gi, '<\\/script') + ';');

    if (esperado !== html) {
      // Diz QUAL das duas pontas está velha, senão o erro não ajuda ninguém.
      const iH = html.indexOf('"ultimaAtualizacao":');
      const noHtml = iH === -1 ? '(não achei)' : html.slice(iH + 20, iH + 46);
      assert(false,
        'index.html não corresponde a index.template.html + data.json.\n' +
        '  data.json diz ultimaAtualizacao ' + JSON.stringify(dados.ultimaAtualizacao) + '\n' +
        '  index.html  diz ultimaAtualizacao ' + noHtml + '\n' +
        '  Rode: node scripts/montar-painel.js e publique o index.html gerado.');
    }
  }
};
