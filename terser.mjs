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

let allFiles = getAllFiles("./dist/streamix");

let maps = allFiles.filter(path => path.match(/\.map$/));
await deleteFiles(maps);

let js = allFiles.filter(path => path.match(/\.[mc]?js$/));
// await minifyFiles(js);

let definitions = allFiles.filter(path => !path.includes('@actioncrew') && path.match(/\.d\.ts$/));
// await deleteFiles(definitions);

fs.rmSync('./dist/streamix/esm2020', {recursive: true, force: true});
fs.rmSync('./dist/streamix/fesm2015', {recursive: true, force: true});
fs.rmSync('./dist/streamix/lib', {recursive: true, force: true});
fs.rmSync('./dist/streamix/epics/lib', {recursive: true, force: true});
fs.rmSync('./dist/streamix/sagas/lib', {recursive: true, force: true});
fs.rmSync('./dist/streamix/tools/lib', {recursive: true, force: true});
fs.copyFileSync('./dist/streamix/@actioncrew/index.d.ts', './dist/streamix/index.d.ts');
fs.copyFileSync('./dist/streamix/epics/@actioncrew/index.d.ts', './dist/streamix/epics/index.d.ts');
fs.copyFileSync('./dist/streamix/sagas/@actioncrew/index.d.ts', './dist/streamix/sagas/index.d.ts');
fs.copyFileSync('./dist/streamix/tools/@actioncrew/index.d.ts', './dist/streamix/tools/index.d.ts');
fs.rmSync('./dist/streamix/@actioncrew', {recursive: true, force: true});
fs.rmSync('./dist/streamix/epics/@actioncrew', {recursive: true, force: true});
fs.rmSync('./dist/streamix/sagas/@actioncrew', {recursive: true, force: true});
fs.rmSync('./dist/streamix/tools/@actioncrew', {recursive: true, force: true});
