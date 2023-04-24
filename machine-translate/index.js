require('dotenv').config()

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv))
  .command('[input] [output]', 'parse input xml to output path')
  .command('[input] [output] -r', 'reverse parse output path file into input xml')
  .positional('input', {
    description: 'input xml file path',
  })
  .positional('output', {
    description: 'output file path',
  })
  .parse()

const whyNotEqual = require('is-equal/why')
const assert = require('node:assert');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { Translator } = require('deepl-node');
const fs = require('fs');
const flatten = require('flat');

const unescapeXML = (text) => text.replaceAll(/(&amp;|&lt;|&gt;)/g, (_, entity) => ({
  "&amp;" : "&",
  "&lt;"  : "<",
  "&gt;"  : ">",
}[entity]));
const escapeXML = (text) => text.replaceAll('<br/>', '||br||').replaceAll(/([&<>])/g, (_, entity) => ({
  "&": "&amp;", 
  "<": "&lt;",
  ">": "&gt;",
}[entity])).replaceAll('||br||', '<br/>');



const [inputPath, outputPath] = argv._;

function travelPreserveOrderXml(obj, fn, parentKey=null, parentValue=null, index=null, path=null) {
  if(Array.isArray(obj)) {
    for(let i=0; i<obj.length; ++i) {
      const newPath = path? `${path}/${i}` : `${i}`
      travelPreserveOrderXml(obj[i], fn, parentKey, obj, i, newPath);
    }
  } else if(typeof(obj) === 'object') {
    for(let key in obj) {
      const newPath = path? `${path}/${key}` : `${key}`
      fn(key, obj[key], parentKey, obj, index, newPath);
      travelPreserveOrderXml(obj[key], fn, key, obj, index, newPath);
    }
  }
}

function loadXML(inputPath, ignoreAttributes=true) {
  const buf = fs.readFileSync(inputPath);
  const xml = new XMLParser({preserveOrder:true}).parse(buf);

  const hasText = new Set();
  travelPreserveOrderXml(xml, (tag, value, parentTag) => { if(tag === '#text') hasText.add(parentTag) });
  const stopNodes = [...hasText].map(tag => `*.${tag}`);
  const brTagAliveXml = new XMLParser({
    preserveOrder: true, 
    stopNodes,
    parseTagValue: false,
    ignoreAttributes,
  }).parse(buf);
  return [brTagAliveXml, stopNodes];
}

function extractTexts(inputPath) {
  const [xml, stopNodes] = loadXML(inputPath);
  return [flatten(xml, {delimiter: '/'}), stopNodes];
}

function patchXml(inputPath, translated) {
  const [xml, _] = loadXML(inputPath, false);
  travelPreserveOrderXml(xml, (tag, value, _, parentValue, index, path) => { 
    if(translated[path] !== undefined) {
      if(Array.isArray(parentValue))
        parentValue[index][tag] = translated[path];
      else
        parentValue[tag] = translated[path];
    }
  });
  return xml;
}

function entityTagFormat(index, entity) {
  return `<_e${index}>`;
}
const entityTagRegex = /(<_e\d+>)/g;

function encode(texts) {
  const entityDict = {};
  const encodedTexts = {};
  let i=0;
  for(const [path, text] of Object.entries(texts)) {
    let encodedText = text;
    for(const entity of (text.match(/(::\w+::)|(\[\w+\])|(\$\w+)/g) || [])) {
      if(entityDict[entity] === undefined)
        entityDict[entity] = entityTagFormat(++i);
      encodedText = encodedText.replaceAll(entity, entityDict[entity]);
    }
    encodedTexts[path] = unescapeXML(unescapeXML(encodedText));
  }
  return [encodedTexts, entityDict];
}

function decode(texts, entityDict) {
  const dict = Object.fromEntries(Object.entries(entityDict).map(([k,v]) => [v,k]));
  const decodedTexts = {};
  for(const [path, text] of Object.entries(texts)) {
    let decodedText = text;
    for(const entity of (text.match(entityTagRegex) || [])) {
      decodedText = decodedText.replaceAll(entity, dict[entity]);
    }
    decodedTexts[path] = escapeXML(decodedText);
  }
  return decodedTexts;
}

const translator = new Translator(process.env.DEEPL_AUTH_KEY, {
  minTimeout: 100000,
});

function readTranslateCache(cacheFilePath) {
  if(fs.existsSync(cacheFilePath)) {
    return Object.fromEntries(fs.readFileSync(cacheFilePath).toString()
      .split('\n')
      .filter(t => t.split('¬').length > 1)
      .map(t => [t.split('¬')[0], t.split('¬')[2]]));
  } else {
    return {};
  }
}
async function translate(texts, cacheFilePath='./translate_cache.txt') {
  const translated = readTranslateCache(cacheFilePath);
  texts = Object.fromEntries(Object.entries(texts).filter(([key, _]) => !translated[key]));
  const file = await fs.promises.open(cacheFilePath, 'a')
  const maxBytes=1024*100;
  let chunk = [];
  let bytes = 0;
  let processed=0;
  let totalLength = Object.keys(texts).length;
  for (let [path, text] of Object.entries(texts)) {
    chunk.push([path, text]);
    bytes += Buffer.byteLength(text, 'utf8') + 1;
    ++processed;
    if(bytes >= maxBytes || processed >= totalLength) {
      console.log(`try to ${chunk.length} lines(${bytes/1000}kb) translate..`); 
      let res = await translator.translateText(chunk.map(([path, text]) => text).join('\n'), 'en', 'ko', { 
        tagHandling: 'xml',
        outlineDetection: 0 ,
      });
      res = res.text.split('\n');
      await file.appendFile(chunk.map(([path, text], i) => `${path}¬${text}¬${res[i]}\n`).join(''));
      chunk.forEach(([path, text], i) => {
        translated[path] = res[i];
      });
      chunk = [];
      bytes = 0;
      console.log(`${processed}/${totalLength} proccessed`); 
    }
  }
  await file.close();

  return translated;
}

const [texts, stopNodes] = extractTexts(inputPath);
const [encodes, entities] = encode(texts);

translate(encodes).then(translated => {
  const decodes = decode(translated, entities);
  const xml = patchXml(inputPath, decodes);
  const builder = new XMLBuilder({
    preserveOrder: true, 
    stopNodes,
    format: true,
    ignoreAttributes: false,
  });
  fs.writeFileSync(outputPath, builder.build(xml).trim());
});
