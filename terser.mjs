// minify.js
import * as fs from "fs";
import * as path from "path";
import { dirname } from 'path';
import * as Terser from "terser";
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAllFiles(dirPath) {
  let files = fs.readdirSync(path.join(dirPath));
  let arrayOfFiles = [];

  files.forEach(function(file) {
    let entry = path.join(dirPath, file)
    if (fs.statSync(entry).isDirectory()) {
      arrayOfFiles = arrayOfFiles.concat(getAllFiles(entry));
    } else {
      arrayOfFiles.push(entry);
    }
  });
  return arrayOfFiles;
}

async function minifyFiles(filePaths) {
  for (const filePath of filePaths) {
    let sourcemapFile = filePath + '.map';
    let sourcemap = fs.existsSync(sourcemapFile);
    let match = (filePath.match(/.*[f]?esm(\d+).*/));
    let ecma = match && match.length > 1 ? match[1] : 'es6';
    let terser = await Terser.minify(fs.readFileSync(filePath, "utf8"), { ecma, compress: true, mangle: true, sourceMap: { content: 'inline' } });
    fs.writeFileSync(filePath, terser.code);
    if(sourcemap) {
      fs.writeFileSync(sourcemapFile, terser.map);
    }
  }
}

async function deleteFiles(filePaths) {
  for (const filePath of filePaths) {
    fs.rmSync(filePath);
  }
}

let allFiles = getAllFiles("./dist/actionstack");

let maps = allFiles.filter(path => path.match(/\.map$/));
await deleteFiles(maps);

let js = allFiles.filter(path => path.match(/\.[mc]?js$/));
// await minifyFiles(js);

let definitions = allFiles.filter(path => !path.includes('@actioncrew') && path.match(/\.d\.ts$/));
await deleteFiles(definitions);

fs.rmSync('./dist/actionstack/esm2022', {recursive: true, force: true});
fs.rmSync('./dist/actionstack/lib', {recursive: true, force: true});
fs.rmSync('./dist/actionstack/epics/lib', {recursive: true, force: true});
fs.rmSync('./dist/actionstack/sagas/lib', {recursive: true, force: true});
fs.rmSync('./dist/actionstack/tools/lib', {recursive: true, force: true});
fs.copyFileSync('./dist/actionstack/@actioncrew/actionstack.d.ts', './dist/actionstack/index.d.ts');
fs.copyFileSync('./dist/actionstack/@actioncrew/actionstack-epics.d.ts', './dist/actionstack/epics/index.d.ts');
fs.copyFileSync('./dist/actionstack/@actioncrew/actionstack-sagas.d.ts', './dist/actionstack/sagas/index.d.ts');
fs.copyFileSync('./dist/actionstack/@actioncrew/actionstack-tools.d.ts', './dist/actionstack/tools/index.d.ts');
fs.rmSync('./dist/actionstack/@actioncrew', {recursive: true, force: true});
fs.copyFileSync('./CHANGELOG.md', './dist/actionstack/CHANGELOG.md');
