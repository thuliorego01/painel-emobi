// Runner: roda todo tests/t-*.js e resume. Sai com código 1 se algo falhar.
const fs = require('fs');
const path = require('path');

(async () => {
  const arquivos = fs.readdirSync(__dirname).filter(f => /^t-.*\.js$/.test(f)).sort();
  let falhas = 0;
  for (const f of arquivos) {
    const suite = require(path.join(__dirname, f));
    process.stdout.write('  ' + suite.nome.padEnd(46));
    try {
      await suite.rodar();
      console.log('ok');
    } catch (e) {
      falhas++;
      console.log('FALHOU');
      console.log('     → ' + (e && e.message ? e.message : e));
    }
  }
  console.log(falhas === 0 ? `\n${arquivos.length} suítes, tudo verde.` : `\n${falhas} de ${arquivos.length} suítes falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})();
