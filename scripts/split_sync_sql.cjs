const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '..', 'backups');
const splitDir = path.join(backupDir, 'staging_sync_parts');

if (!fs.existsSync(splitDir)) {
  fs.mkdirSync(splitDir, { recursive: true });
}

// Pulisci vecchi file
fs.readdirSync(splitDir).forEach(f => fs.unlinkSync(path.join(splitDir, f)));

// Leggi il file completo
const fullSqlPath = path.join(backupDir, 'sync_production_to_staging.sql');
const fullSql = fs.readFileSync(fullSqlPath, 'utf8');

// Separiamo i blocchi principali
const truncateBlock = fullSql.substring(0, fullSql.indexOf('-- 2. Inserimento Films'));

const filmsStart = fullSql.indexOf('-- 2. Inserimento Films');
const erroriStart = fullSql.indexOf('-- 3. Inserimento Errori (Bloopers)');
const triviaStart = fullSql.indexOf('-- 4. Inserimento Curiosità (Movie Trivia)');
const votiStart = fullSql.indexOf('-- 5. Inserimento Voti Bloopers');
const seqStart = fullSql.indexOf('-- 6. Ripristino e allineamento');

const filmsBlock = fullSql.substring(filmsStart, erroriStart);
const erroriBlock = fullSql.substring(erroriStart, triviaStart);
const triviaBlock = fullSql.substring(triviaStart, votiStart);
const seqBlock = fullSql.substring(seqStart);

// 1. File 1: TRUNCATE + FILMS (~230 KB)
const part1Sql = truncateBlock + '\n' + filmsBlock;
fs.writeFileSync(path.join(splitDir, 'parte_1_films.sql'), part1Sql, 'utf8');

// 2. Errori / Bloopers: Dividi a metà (~600 KB ciascuno)
const erroriInserts = erroriBlock.split('INSERT INTO public.errori');
const erroriHeader = erroriInserts[0];
const insertStatements = erroriInserts.slice(1).map(s => 'INSERT INTO public.errori' + s);

const halfErrori = Math.ceil(insertStatements.length / 2);
const part2Sql = erroriHeader + insertStatements.slice(0, halfErrori).join('\n');
const part3Sql = '-- Errori parte 2\n' + insertStatements.slice(halfErrori).join('\n');

fs.writeFileSync(path.join(splitDir, 'parte_2_bloopers_1.sql'), part2Sql, 'utf8');
fs.writeFileSync(path.join(splitDir, 'parte_3_bloopers_2.sql'), part3Sql, 'utf8');

// 3. Trivia: Dividi in 3 parti (~650 KB ciascuna)
const triviaInserts = triviaBlock.split('INSERT INTO public.movie_trivia');
const triviaHeader = triviaInserts[0];
const triviaStatements = triviaInserts.slice(1).map(s => 'INSERT INTO public.movie_trivia' + s);

const thirdTrivia = Math.ceil(triviaStatements.length / 3);
const tPart1 = triviaStatements.slice(0, thirdTrivia);
const tPart2 = triviaStatements.slice(thirdTrivia, thirdTrivia * 2);
const tPart3 = triviaStatements.slice(thirdTrivia * 2);

fs.writeFileSync(path.join(splitDir, 'parte_4_curiosita_1.sql'), triviaHeader + tPart1.join('\n'), 'utf8');
fs.writeFileSync(path.join(splitDir, 'parte_5_curiosita_2.sql'), '-- Curiosita parte 2\n' + tPart2.join('\n'), 'utf8');
fs.writeFileSync(path.join(splitDir, 'parte_6_curiosita_3_e_sequenze.sql'), '-- Curiosita parte 3\n' + tPart3.join('\n') + '\n\n' + seqBlock, 'utf8');

console.log('File generati in:', splitDir);
fs.readdirSync(splitDir).sort().forEach(file => {
  const p = path.join(splitDir, file);
  const sizeKb = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(` - ${file}: ${sizeKb} KB`);
});
