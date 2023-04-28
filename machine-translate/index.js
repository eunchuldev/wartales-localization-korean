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
const libxml = require('libxmljs2');

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


const entityMap = {
'$ChampionName': '<<챔피언 이름>>',
'$NAME': '<<범죄자>>',
'::A1InquisitionCampSlot1::': '<<납치된 동료>>',
'::G2TrialPalaceAccused::': '<<실수한 동료>>',
'::H1RuinsRoom13Tracker::': '<<버려진 동료>>',
'::amount::': '892',
'::bounty::': '<<현상금>>',
'::count::': '<<갯수>>',
'::desc::': '<<설명>>',
'::descStrategy::': '<<전술 설명>>',
'::due::': '8192',
'::gold::': '<<골드>>',
'::groupType::': '<<워갤>>',
'::index::': '<<번호 3>>',
'::injury::': '<<부상>>',
'::item::': '<<아이템>>',
'::itemName::': '<<아이템 이름>>',
'::items::': '<<아이템 목록>>',
'::job::': '<<직업>>',
'::jobName::': '<<직업명>>',
'::leaver::': '<<떠난 사람>>',
'::me::': '<<나>>',
'::name1::': '<<이름1>>',
'::name2::': '<<이름2>>',
'::name::': '<<이름3>>',
'::names::': '<<이름 목록>>',
'::newName::': '<<새 이름>>',
'::newTarget::': '<<새 타겟>>',
'::place::': '<<그 장소>>',
'::prev::': '<<예전 이름>>',
'::rank::': '<<랭크>>',
'::rats::': '864',
'::reason::': '<<이유>>',
'::roaming::': '<<떠돌이>>',
'::strategy::': '<<전략>>',
'::target::': '<<대상>>',
'::total::': '<<총 갯수>>',
'::trait::': '<<특성>>',
'::until_vars.days::': '98',
'::until_vars.limitDay::': '103',
'::user::': '<<유저>>',
'::valeur::': '13',
'::value1::': '74',
'::value2::': '82',
'::value3::': '58',
'::value::': '69',
'[A1ArenaBlueGazZone]': '<<청색 가스 지역>>',
'[A1ArenaBlueGaz]': '<<청색 가스>>>',
'[A1ArenaRedGazZone]': '<<적색 가스 지역>>',
'[A1ArenaRedGaz]': '<<적색 가스>>',
'[A1Arena]': '<<a1 아레나>>',
'[A1BorderPost]': '<<a1 국경 초소>>',
'[A1CastleEnviro]': '<<a1 성>>',
'[A1Fishery]': '<<a1 낚시터>>',
'[A1InquisitionCamp]': '<<a1 캠프>>',
'[A1Prison]': '<<a1 감옥>>',
'[A1Stables2]': '<<a1 마굿간2>>',
'[A1Stables]': '<<a1 마굿간>>',
'[A1TrackersCamp]': '<<추적자의 캠프>>',
'[A1University]': '<<대학교>>',
'[ADMIN]': '<<어드민>>',
'[ASSIGN]': '<<할당받은 사람>>',
'[ATTR]': '43.2',
'[ATTR_0]': '59.3',
'[ATTR_1]': '68.4',
'[ActionBase]': '<<기본 공격>>',
'[AnimalMarkedBonus]': '<<동물 표식 보너스>>',
'[AnimalMarked]': '<<동물 표식>>',
'[AnimalProtection]': '<<동물 보호>>',
'[Arena_Dying]': '<<전투 열외>>',
'[Arena_Willforce]': '<<끈기>>',
'[Armor]': '<<방어력>>',
'[BackEyed]': '<<뒤통수에 눈>>',
'[Backstab]': '<<백스탭>>',
'[BeeArea]': '<<벌 영역>>',
'[BeltAccGuardEngaged]': '<<가죽 스트랩>>',
'[Berserk]': '<<광폭성>>',
'[BerserkerStance]': '<<버서커 자세>>',
'[BionnPanic]': '<<비욘의 페닉 상태>>',
'[Bleeding]': '<<출혈>>',
'[Blind]': '<<실명>>',
'[BloodReserve]': '<<혈액 비축>>',
'[Bloodshed]': '<<유혈>>',
'[Boue]': '<<진탕>>',
'[BrothersFury]': '<<형제의 분노>>',
'[BrutalityLeader]': '<<리더의 잔인함>>',
'[Brutality]': '<<잔인성>>',
'[Burning]': '<<연소>>',
'[CapaCritical]': '<<치명타 적용 시>>',
'[CelestiumLightning]': '<<눈의 심판>>',
'[Chased]': '<<쫒김>>',
'[Condemn]': '<<정죄>>',
'[Confus]': '<<혼란>>',
'[Constitution]': '<<체력>>',
'[Corrosion]': '<<부패>>',
'[CritHitDamageBonusPercent]': '<<치명타 피해량 보너스 퍼센트>>',
'[CritHitChanceBonusPercent]': '<<치명타 확률 보너스 퍼센트>>',
'[CritHitPercent]': '<<치명타 적중률>>',
'[CriticalHit]': '<<치명타>>',
'[CriticalLeader]': '<<리더의 공격성>>',
'[Critique]': '<<비판>>',
'[DMG]': '<<피해>>',
'[DamageBonusOppAttack]': '<<기회 공격 피해>>',
'[DamageBonusPercent]': '<<피해량>>',
'[DamageReducePercent]': '피해 감소량',
'[DamageTakenPercent]': '<<받는 피해량>>',
'[DeadlyBlow]': '<<치명적인 일격>>',
'[DefensiveStance]': '<<방어 자세>>',
'[Deflection]': '<<굴절>>',
'[Deftness]': '<<손재주>>',
'[Destabilization]': '<<불안정화>>',
'[Dexterity]': '<<민첩>>',
'[Disarm]': '<<무장 해제>>',
'[DmgPerBonusLeader]': '<<리더의 의지력>>',
'[Dodge]': '<<회피>>',
'[Doped]': '<<도핑>>',
'[DustFog]': '<<모래 안개>>',
'[Dying]': '<<죽어가는>>',
'[E1TrainingCamp]': '<<훈련 캠프>>',
'[Electrified]': '<<감전>>',
'[Enervate]': '<<화남>>',
'[Entrenched]': '<<요새화>>',
'[Euphoria]': '<<행복감>>',
'[Executer]': '<<집행자>>',
'[FV3]': '<<저주받은 도시>>',
'[FX]': '<<FX>>',
'[FarmChild]': '<<농장1>>',
'[FarmPlague]': '<<농장2>>',
'[FenrisCourage]': '<<용맹한 힘>>',
'[Fever]': '<<발열>>',
'[Fire]': '<<불>>',
'[Fragility]': '<<연약함>>',
'[Frenzy]': '<<광란>>',
'[Frightened]': '<<겁먹음>>',
'[Fury]': '<<격분>>',
'[G1BrunhildeCastel]': '<<g1성1>>',
'[G1HeillmarCastel]': '<<g1성2>>',
'[G1LenaideAbbey]': '<<g1학교>>',
'[G1Prison]': '<<g1 감옥>>',
'[G1Stable]': '<<g1 마굿간>>',
'[G1TrainingCamp]': '<<g1 훈련장>>',
'[G2BernnaArena]': '<<g1 아레나>>',
'[G2CompanionFort]': '<<g2 요새>>',
'[G2Hall]': '<<g2 홀>>',
'[G2HoevendorpMine]': '<<g2 철광>>',
'[G2MarketplaceFish]': '<<g2 낚시터>>',
'[G2Stables]': '<<g2 마굿간>>',
'[G2TierryAbode]': '<<g2 에스테>>',
'[G2TradePalace]': '<<g2 팔라스>>',
'[GROUPTYPE]': '<<집단 유형>>',
'[Galvanization]': '<<고무>>',
'[Guard]': '<<방어막>>',
'[H1HaragBorderPost]': '<<h1 초소>>',
'[H1Prison]': '<<h1 감옥>>',
'[H1TrainingCamp]': '<<h1 캠프>>',
'[HamletLaheartCastle]': '<<h1 성>>',
'[Health]': '<<생명력>>',
'[HorounMark]': '<<호룬의 표식>>',
'[IR1Hostel]': '<<i1 여관>>',
'[Immobile]': '<<이동 불가 상태>>',
'[Immobilisation]': '<<이동 불가>>',
'[InspirationLeader]': '<<리더의 동기 부여>>',
'[Inspiration]': '<<영감>>',
'[JOBASSIGN]': '<<할당된 동료>>',
'[KEY_Camp]': '<<캠프 키>>',
'[KEY_Chat]': '<<대화 키>>',
'[KEY_Grimoire]': '<<마도서 키>>',
'[KEY_Inventory]': '<<인벤토리 키>>',
'[KEY_Minimap]': '<<미니맵 키>>',
'[KEY_Path]': '<<경로 키>>',
'[KEY_Pause]': '<<일시정지 키>>',
'[KEY_Settings]': '<<설정 키>>',
'[KEY_Sprint]': '<<달리기 키>>',
'[KogoTarget]': '<<코고의 타겟>>',
'[LMB]': '<<마우스 왼쪽 버튼>>',
'[LegionCamp]': '<<군단 캠프>>',
'[LoneWolf]': '<<외로운 늑대>>',
'[MX]': '<<MX>>',
'[MaxHealth]': '<<최대 생명력>>',
'[MillChild]': '<<방앗간>>',
'[MischiefMakerCritical]': '<<약탈을 해본 경험>>',
'[Morale]': '<<사기>>',
'[Motivation]': '<<동기 부여>>',
'[Movement]': '<<기동력>>',
'[NAME]': '<<이름>>',
'[NX]': '<<nx>>',
'[NarsesMark]': '<<나르세스의 표식>>',
'[NoReflexes]': '<<어지러움>>',
'[Objet]': '<<오브젝트>>',
'[Ordered]': '<<명령>>',
'[PROGRESS]': '<<진행도>>',
'[PlagueHamlet]': '<<오염된 도시>>',
'[PlaguedRatEnraged]': '<<격노>>',
'[PoisonCloud]': '<<독구름>>',
'[Poison]': '<<독>>',
'[Precision]': '<<정확도>>',
'[PrideInfused]': '<<자신감의 물결>>',
'[Prison]': '<<감옥>>',
'[ProtectionLeader]': '<<리더의 보호>>',
'[Protection]': '<<보호력>>',
'[Pyrophobia]': '<<화염공포증>>',
'[RANKEDASSIGN]': '<<할당된 상위 티어 유닛>>',
'[RMB]': '<<마우스 오른쪽 버튼>>',
'[Region_Alazar_Aneding]': '<<틸트란 의회>>',
'[Region_Edoran_1]': '<<엘도란 의회>>',
'[Region_Gosenberg_1]': '고센버그 의회',
'[Region_Gosenberg_2]': '<<고센버그 의회2>>',
'[Region_Harag_1]': '<<하라크 지역>>',
'[Relentlessness]': '<<무모함>>',
'[Riposte]': '<<반격>>',
'[Rivalry]': '<<라이벌>>',
'[Savagery]': '<<잔인함>>',
'[Sentence]': '<<정의>>',
'[Sheepfold]': '<<양우리>>',
'[SlowReflexes]': '<<느린 반사 신경>>',
'[Slowdown]': '<<감속>>',
'[SportGuard]': '<<스포츠 가드>>',
'[Strength]': '<<힘>>',
'[Stun]': '<<스턴>>',
'[SupportLeader]': '<<리더의 지원>>',
'[Supported]': '<<지원받음>>',
'[Surprised]': '<<놀람>>',
'[Surrounded]': '<<둘러쌓기>>',
'[T1]': '<<장소1>>',
'[T2]': '<<장소2>>',
'[T3Bis]': '<<장소3>>',
'[T3]': '<<장소4>>',
'[T4]': '<<장소5>>',
'[T4bis]': '<<장소6>>',
'[T4ter]': '<<장소7>>',
'[T5Bis]': '<<장소8>>',
'[T5]': '<<장소9>>',
'[TARGET]': '<<대상1>>',
'[TerrorLink]': '<<테러의 연결>>',
'[Terror]': '<<테러>>', 
'[ToPosition]': '<<알맞은 위치>>',
'[ToroTarget]': '<<토로의 무자비함>>',
'[TrackersCamp]': '<<추적자 캠프>>',
'[Transport]': '<<수송 능력>>',
'[TrueDamageLeader]': '<<리더의 기회주의>>',
'[Unleashed]': '<<동물 풀기>>',
'[Unwavering]': '<<부동>>',
'[VALUE]': '36.5',
'[VALUE_STACK]': '72.7',
'[VernalisCastel]': '<<베르뇌른 성>>',
'[Vulnerability]': '<<취약성>>',
'[Weakening]': '<<약화>>',
'[Willpower]': '<<의지력>>',
'[Wrath]': '<<분노>>',
'[XF]': '<<조건1>>',
'[XM]': '<<조건2>>',
'[XX]': '<<조건3>>',
'[Zeal]': '<<열정>>'
}
const glosery = {
  'the unit': '유닛',
  'this unit': '이 유닛'
}
const entityReverseMap = Object.fromEntries(Object.entries(entityMap).map(([k,v]) => [v,k]));
const t = new Set(Object.values(entityReverseMap));
console.log(Object.keys(entityMap).filter(key => !t.has(key)));
assert(Object.keys(entityReverseMap).length === Object.keys(entityMap).length);
const entityPattern = new RegExp(Object.values(entityMap).map(k => [`(${k})`, `(${k.replace('<<', '<')})`, `(${k.replace('>>', '>')})`]).flat().join('|'), 'g');

const gloseryPattern = new RegExp(Object.keys(glosery).map(k => `(${k})`).join('|'), 'g');

function encode(texts) {
  const encodedTexts = {};
  for(const [path, text] of Object.entries(texts)) {
    let encodedText = text;
    encodedText = encodedText.replaceAll(/&lt;(img [^&]+)&gt;/g, '<$1>');
    encodedText = encodedText.replaceAll(/&lt;[^> /&]+&gt;/g, '<b>');
    encodedText = encodedText.replaceAll(/&lt;\/[^> &]+&gt;/g, '</b>');
    encodedText = unescapeXML(encodedText);
    for(const entity of (text.match(/(::\w+::)|(\[\w+\])|(\$\w+)/g) || [])) {
      encodedText = encodedText.replaceAll(entity, entityMap[entity]);
    }
    for(const dictKey of (text.match(gloseryPattern) || [])) {
      encodedText = encodedText.replaceAll(dictKey, glosery[dictKey]);
    }
    encodedTexts[path] = encodedText;
  }
  return encodedTexts
}


function decode(texts, originalTexts) {
  const decodedTexts = {};
  for(const [path, text] of Object.entries(texts)) {
    const originalText = originalTexts[path];
    let decodedText = text;

    for(const entity of (originalText.match(/(&lt;[^> &\/]+&gt;)/g) || [])) {
      decodedText = decodedText.replace('<b>', unescapeXML(entity));
    }
    for(const entity of (originalText.match(/(&lt;\/[^> &\/]+&gt;)/g)|| [])) {
      decodedText = decodedText.replace('</b>', unescapeXML(entity));
    }
    for(const entity of (text.match(entityPattern) || [])) {
      decodedText = decodedText.replaceAll(entity, entityReverseMap[entity]);
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
  const maxBytes=1024*90;
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
        preserveFormat: 1,
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
function validateXml(decodes) {
  Object.values(decodes).forEach((text, i) => {try {
    libxml.parseXml('<t>' + text + '</t>')
  } catch {
    console.log('line', i)
  }})
}

const [texts, stopNodes] = extractTexts(inputPath);
const encodes = encode(texts);

translate(encodes).then(translated => {
  const decodes = decode(translated, texts);
  validateXml(decodes);
  const xml = patchXml(inputPath, decodes);
  const builder = new XMLBuilder({
    preserveOrder: true, 
    stopNodes,
    format: true,
    ignoreAttributes: false,
  });
  fs.writeFileSync(outputPath, builder.build(xml).trim());
});
