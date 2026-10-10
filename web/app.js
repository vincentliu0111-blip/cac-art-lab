import {buildRound, agreement, getInsight, chosenArtwork, isValidState, MOODS, INTERESTS} from './experience-core.mjs';

const $ = id => document.getElementById(id);
// A new schema never backfills untimed choices from earlier prototypes.
const STORAGE_BASE_KEY = 'cac-art-lab-experience-v3';
let storageKey = STORAGE_BASE_KEY;
const LOCALE_KEY = 'cac-art-lab-language';
let locale = 'en';
try { locale = localStorage.getItem(LOCALE_KEY) === 'zh' ? 'zh' : 'en'; } catch {}
const COPY = {
  en: {
    play:'The experiment',metGallery:'Met gallery',collection:'Your collection',about:'The idea',private:'Public experience',loading:'Opening the gallery…',loadErrorTitle:'The gallery couldn’t open.',loadErrorText:'Check your connection and try again. Your saved picks will be here.',retry:'Try again',pendingTitle:'Saving your choice…',pendingExplanation:'Your next painting will appear after this choice is saved online.',retrySave:'Retry saving',eyebrow:'A LITTLE ART. A LITTLE INSTINCT.',title:'Trust your eye.',intro:'Which artwork do you prefer? Tap it to choose. There is no right answer.',saveNotice:'Every choice or skip is saved online before you continue. Please do not choose if you do not want it saved.',settings:'Make it yours',optional:'optional',roundNote:'10 choices. A new perspective.',thisOne:'Choose this one',keyboard:'Use ← → to choose · S to skip',skip:'Can’t decide? Skip this pair',revealNote:'Your perspective unfolds after the round.',roundComplete:'YOUR ROUND, REVEALED',summaryTitle:'A point of view. Yours.',smallDiscovery:'A SMALL DISCOVERY',insightLimit:'A glimpse of this round, not a label for your taste.',youAndAI:'YOU + AI JUDGES',inCommon:'in common',noScore:'Different taste is the whole point. This isn’t a score.',anotherRound:'Follow your curiosity.',anotherRoundSub:'A fresh set of artworks is waiting.',takeCloserLook:'TAKE A CLOSER LOOK',roundPicks:'The art that caught your eye',openArtwork:'Select an artwork to discover its story.',compareDetails:'Explore each choice & AI comparison',communityNote:'Collected votes from this public experience, including your own choice.',personalGallery:'YOUR PERSONAL GALLERY',collectionTitle:'A trail of curiosity.',backToPlay:'Keep exploring',collectionEmpty:'Your eye will lead the way.',collectionEmptyText:'Choose a few artworks and they’ll find a home here.',contribute:'Each choice is saved online.',whatSaved:'What’s saved?',footerTag:'Art is for everyone. So is having an opinion.',sourceCredit:'Artworks from The Met Open Access',aboutLink:'About this experiment',optionalSetup:'OPTIONAL, ALWAYS',settingsTitle:'Come as you are.',settingsIntro:'A little context, if you feel like sharing. These choices won’t change which artworks you see.',moodTitle:'What’s your mood today?',interestsTitle:'What tends to catch your eye?',profileLanguage:'Which language do you feel most at home in?',preferNot:'Prefer not to say',anotherLanguage:'Another language / several languages',languageNote:'Language is optional context, not a measure of culture or identity.',done:'Back to the art',yourChoice:'YOUR CHOICE',privacyTitle:'How choices are saved',privacyOne:'Each choice, including a skip, is saved online before the next pair appears. If you do not want a choice saved, please do not take part.',privacyTwo:'The database saves random browser and round IDs, the pair and display order, your choice, its position, timestamps and elapsed time, a short source label, and any optional settings you provide.',privacyThree:'The app database does not store your name, email, or raw IP address. Cloudflare may process IP addresses in its network and service logs. No AI service is called when you choose.',privacyFour:'Previously received choices remain in the database after you close or restart the page. Contact the study owner to request removal.',privacyFive:'These votes are a convenience sample and do not represent the general public.',fromCollection:'FROM THE MET COLLECTION',detailInvitation:'Stay a little longer. Look for a detail you didn’t notice at first.',viewMet:'Explore at The Met',metNote:'Opens the museum’s official collection page. An online record doesn’t mean the artwork is currently on view.',on:'On',off:'Off',onlyDevice:'Saved in this browser only.',collectorReady:'Online saving is ready.',savedStudy:'Your choice was saved online.',unavailable:'Online saving is unavailable. Please retry before choosing.',pending:n=>`${n} choice${n===1?'':'s'} waiting to sync.`,rejected:'Some choices could not be accepted. Your browser copy is safe.',round:n=>`ROUND ${String(n).padStart(2,'0')}`,pick:(n,total)=>`PICK ${String(n).padStart(2,'0')} OF ${total}`,summaryIntro:(p,s)=>`${p} artwork${p===1?'':'s'} chosen${s?`, ${s} pair${s===1?'':'s'} skipped`:''}. A little window into what moves you.`,judgeText:(n,d)=>`You chose the same artwork as the AI judges in ${n} of ${d} comparable pairs.`,modelText:(n,d)=>`Feature model: ${n} of ${d} choices in common.`,noComparisons:'No evaluated AI pairs in this round yet.',noModel:'No evaluated feature-model pairs in this round yet.',openMind:'Room for discovery.',openMindText:'Your choices took their own path this round. Keep exploring to see what catches your eye.',allSkippedTitle:'Take your time.',allSkippedText:'Nothing has to speak to you. A fresh round offers another place to start.',collectionIntro:n=>`${n} different artwork${n===1?'':'s'} you’ve chosen, gathered in one place.`,skipped:'You skipped this pair',yourPick:'Your pick',judges:'AI judges',model:'Feature model',support:'weighted support',prediction:'predicted probability',tie:'Tie',notAvailable:'Not available',samePick:'Same choice',differentPick:'Different choice',community:(n,total)=>`${n} of ${total} collected choices also picked this artwork.`,noCommunity:'No collected votes for this pair yet.',communityUnavailable:'Collected votes are unavailable.',imageError:'This artwork couldn’t load. You can skip this pair.',storageError:'Storage is full or unavailable. Keep using this tab; progress and settings now stay here only. Reloading may restore older progress and settings.',restoredError:'Your previous saved round couldn’t be restored. A new round is ready.',picked:'Choice saved.',skippedAnnounce:'Pair skipped.',leftArtwork:'Left artwork',rightArtwork:'Right artwork',chooseLeft:'Choose the left artwork',chooseRight:'Choose the right artwork',unknownArtist:'Artist not recorded',unknownDate:'Date not recorded',mood_calm:'Calm',mood_curious:'Curious',mood_energized:'Energized',mood_reflective:'Reflective',interest_landscape:'Landscapes',interest_people:'People',interest_nature:'Nature',interest_abstract:'Abstract forms',interest_stories:'Stories',interest_details:'Little details',
    brightness_higher:'A pull toward light.',brightness_lower:'A taste for deeper tones.',saturation_higher:'Color caught your eye.',saturation_lower:'An eye for quieter color.',detail_higher:'Drawn to the details.',detail_lower:'Room to breathe.',symmetry_higher:'Finding a little balance.',symmetry_lower:'An unexpected balance.',insight:(feature,n,total)=>`You chose the ${feature} image in ${n} of ${total} comparable pairs.`,dimension_brightness_higher:'brighter',dimension_brightness_lower:'darker',dimension_saturation_higher:'more saturated',dimension_saturation_lower:'less saturated',dimension_detail_higher:'more edge-dense',dimension_detail_lower:'less edge-dense',dimension_symmetry_higher:'more left–right symmetrical',dimension_symmetry_lower:'less left–right symmetrical',
  },
  zh: {
    play:'开始探索',metGallery:'大都会画廊',collection:'我的收藏',about:'关于实验',private:'公开体验',loading:'正在打开画廊…',loadErrorTitle:'画廊暂时没有打开。',loadErrorText:'请检查连接后重试。已保存的选择会留在这里。',retry:'重试',pendingTitle:'正在保存你的选择……',pendingExplanation:'保存成功后才会出现下一组画。',retrySave:'重试保存',eyebrow:'一点艺术，一点直觉。',title:'相信你的眼光。',intro:'你更喜欢哪一幅？点画面就好，没有标准答案。',saveNotice:'每次选择或跳过都会先在线保存，之后才能继续。不愿保存时请不要选画。',settings:'我的偏好',optional:'可跳过',roundNote:'10 次选择，发现一点不一样。',thisOne:'选这一幅',keyboard:'按 ← → 选择 · S 跳过',skip:'难以决定？跳过这一组',revealNote:'完成一轮，再发现你的视角。',roundComplete:'这一轮，你的视角',summaryTitle:'你的眼光，自有不同。',smallDiscovery:'一个小小的发现',insightLimit:'这只是本轮的观察，不是给你的审美贴标签。',youAndAI:'你与 AI 裁判',inCommon:'选择一致',noScore:'不同的偏好才有趣。这不是审美成绩。',anotherRound:'让好奇心继续。',anotherRoundSub:'下一组作品，等你发现。',takeCloserLook:'再靠近一点',roundPicks:'那些吸引你的作品',openArtwork:'点击作品，继续了解它。',compareDetails:'逐一回顾你的选择与 AI 偏好',communityNote:'投票统计来自这个公开体验，也包含你的选择。',personalGallery:'属于你的小画廊',collectionTitle:'好奇心走过的地方。',backToPlay:'继续探索',collectionEmpty:'让你的眼光带路。',collectionEmptyText:'选几幅喜欢的作品，它们就会出现在这里。',contribute:'每次选择都会在线保存。',whatSaved:'会保存什么？',footerTag:'人人都可以亲近艺术，也可以拥有自己的看法。',sourceCredit:'作品来自大都会博物馆开放资源',aboutLink:'关于这项实验',optionalSetup:'随时可选，也可跳过',settingsTitle:'带着此刻的自己。',settingsIntro:'如果愿意，可以留下少量背景信息。它们不会改变你看到的作品。',moodTitle:'你此刻的心情如何？',interestsTitle:'什么通常会吸引你的目光？',profileLanguage:'你最习惯使用哪种语言？',preferNot:'暂不提供',anotherLanguage:'其他语言／多种语言',languageNote:'语言只作可选背景信息，不代表文化或身份。',done:'回到作品',yourChoice:'由你选择',privacyTitle:'选择如何保存',privacyOne:'每次选择（包括跳过）都会先在线保存，之后才出现下一组画。如果不愿保存，请不要参与选画。',privacyTwo:'数据库保存随机浏览器与轮次编号、画对与展示顺序、选择、题序、时间与用时、简短来源标签，以及你自愿提供的设置。',privacyThree:'应用数据库不保存姓名、邮箱或原始 IP 地址；Cloudflare 的网络与服务日志可能处理 IP 地址。选画时不会调用 AI 服务。',privacyFour:'关闭或重启页面后，已经接收的记录仍保留在数据库中。如需移除，请联系项目负责人。',privacyFive:'这些选择是便利样本，不代表大众审美。',fromCollection:'来自大都会博物馆馆藏',detailInvitation:'再停留一会儿，找一个刚才没注意到的细节。',viewMet:'在大都会官网继续探索',metNote:'打开博物馆官方藏品页。存在网上记录不代表作品正在展出。',on:'开',off:'关',onlyDevice:'仅保存在当前浏览器。',collectorReady:'在线保存已就绪。',savedStudy:'你的选择已在线保存。',unavailable:'在线保存暂不可用，请重试后再选画。',pending:n=>`${n} 条选择等待同步。`,rejected:'部分选择未被接收，浏览器副本仍保留。',round:n=>`第 ${String(n).padStart(2,'0')} 轮`,pick:(n,total)=>`第 ${String(n).padStart(2,'0')} / ${total} 组`,summaryIntro:(p,s)=>`选择了 ${p} 幅作品${s?`，跳过了 ${s} 组`:''}。看看什么打动了你。`,judgeText:(n,d)=>`在 ${d} 组可比较的选择中，你与 AI 裁判有 ${n} 次偏好相同。`,modelText:(n,d)=>`图像特征模型：${d} 次中有 ${n} 次与你一致。`,noComparisons:'本轮暂无已完成 AI 评测的画对。',noModel:'本轮暂无已完成特征模型评测的画对。',openMind:'给发现留一点空间。',openMindText:'这一轮，你的选择有自己的路线。继续看看还有什么吸引你。',allSkippedTitle:'慢慢来，也很好。',allSkippedText:'不必勉强喜欢任何一幅。新一轮还有其他作品等你。',collectionIntro:n=>`你选择过的 ${n} 幅不同作品，汇集成这一方小画廊。`,skipped:'这一组你选择了跳过',yourPick:'你的选择',judges:'AI 裁判',model:'特征模型',support:'加权支持度',prediction:'预测概率',tie:'平局',notAvailable:'暂无结果',samePick:'与你相同',differentPick:'与你不同',community:(n,total)=>`本组 ${total} 次已收集选择中，${n} 次也选择了这幅。`,noCommunity:'这一组暂时没有已收集投票。',communityUnavailable:'投票统计暂不可用。',imageError:'这幅作品未能加载，你可以跳过这一组。',storageError:'浏览器存储已满或不可用。可在此标签页继续体验；新进度和设置仅临时保留，刷新可能恢复旧进度与旧设置。',restoredError:'之前的存档无法恢复，已为你准备新一轮。',picked:'选择已保存。',skippedAnnounce:'已跳过这一组。',leftArtwork:'左侧作品',rightArtwork:'右侧作品',chooseLeft:'选择左侧作品',chooseRight:'选择右侧作品',unknownArtist:'作者信息缺失',unknownDate:'年代信息缺失',mood_calm:'平静',mood_curious:'好奇',mood_energized:'充满活力',mood_reflective:'若有所思',interest_landscape:'风景',interest_people:'人物',interest_nature:'自然',interest_abstract:'抽象形式',interest_stories:'故事',interest_details:'细节',
    brightness_higher:'被光亮吸引。',brightness_lower:'偏爱深一些的色调。',saturation_higher:'色彩抓住了你的目光。',saturation_lower:'看见安静的色彩。',detail_higher:'在细节里停留。',detail_lower:'给画面留一点呼吸。',symmetry_higher:'寻找一点平衡。',symmetry_lower:'意料之外的平衡。',insight:(feature,n,total)=>`在 ${total} 组可比较画对中，你有 ${n} 次选择了${feature}的图像。`,dimension_brightness_higher:'更明亮',dimension_brightness_lower:'更暗',dimension_saturation_higher:'饱和度更高',dimension_saturation_lower:'饱和度更低',dimension_detail_higher:'边缘更密集',dimension_detail_lower:'边缘更疏朗',dimension_symmetry_higher:'左右更对称',dimension_symmetry_lower:'左右较不对称',
  }
};
const t = (key, ...args) => typeof COPY[locale][key] === 'function' ? COPY[locale][key](...args) : COPY[locale][key] ?? COPY.en[key] ?? key;
let data, pairsById, state;
let view = 'play', busy = false, displayKey = '', renderToken = 0;
let collector = false, syncing = false, hasSynced = false, rejected = false, syncController;
let collectorEndpoint = '';
let storageMessage = '', memoryOnly = false, communityRequest = 0;

function translate() {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = locale === 'zh' ? 'CAC Art Lab — 相信你的眼光' : 'CAC Art Lab — Follow your eye';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $('languageToggle').textContent = locale === 'en' ? '中文' : 'EN';
  $('languageToggle').setAttribute('aria-label', locale === 'en' ? 'Switch interface to Chinese' : 'Switch interface to English');
  $('settingsOpen').setAttribute('aria-label', t('settings'));
  $('contribute').setAttribute('aria-label', t('contribute'));
  $('chooseLeft').setAttribute('aria-label', t('chooseLeft'));
  $('chooseRight').setAttribute('aria-label', t('chooseRight'));
  $('leftImage').alt = t('leftArtwork'); $('rightImage').alt = t('rightArtwork');
  if (state) {
    renderSettings(); updateSync(); updateCollectionCount();
    if (view === 'collection') renderCollection();
    else if (state.index >= state.deck.length) renderSummary(false);
    else renderPlay();
  }
  updateStorageWarning();
}
function uuid() { return crypto.randomUUID(); }
function freshState() {
  const sourceParam = new URLSearchParams(location.search).get('source') || 'direct';
  const source = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(sourceParam) ? sourceParam : 'direct';
  return {schema:2,source,presentation:null,datasetVersion:data.version,sessionId:uuid(),roundId:uuid(),roundNumber:1,consent:true,profile:{mood:'',interests:[],language:''},deck:buildRound(data.pairs).deck,index:0,history:[],seen:[],queue:[]};
}
function save() {
  if (memoryOnly) { updateStorageWarning(); return; }
  try { localStorage.setItem(storageKey, JSON.stringify(state)); storageMessage = ''; }
  catch { memoryOnly = true; storageMessage = 'storageError'; }
  updateStorageWarning();
}
// Healthy storage mutations reread the latest snapshot inside one named lock.
// A failed write makes this tab's memory authoritative until reload: rereading
// the older persisted snapshot would silently discard new choices and settings.
// Acknowledgments only remove their own event, so another tab's queued picks survive.
async function mutateState(mutate) {
  const change = () => {
    if (!memoryOnly) {
      try { const raw = localStorage.getItem(storageKey); if (raw) { const latest = JSON.parse(raw); if (isValidState(latest, data)) state = latest; } } catch {}
    }
    const result = mutate(state);
    if (result !== false) save();
    $('contribute').checked = state.consent;
    return result;
  };
  return navigator.locks ? navigator.locks.request(storageKey, change) : change();
}
function updateStorageWarning() {
  $('storageWarning').hidden = !storageMessage;
  $('storageWarning').textContent = storageMessage ? t(storageMessage) : '';
}
function restore() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed, data)) return parsed;
      storageMessage = 'restoredError';
    }
    const old = localStorage.getItem(STORAGE_BASE_KEY);
    if (old) {
      const parsed = JSON.parse(old);
      if (isValidState(parsed, data)) {
        localStorage.setItem(storageKey, old);
        storageMessage = '';
        return parsed;
      }
    }
  } catch { storageMessage = 'restoredError'; }
  return freshState();
}
function validateData(value) {
  if (!value || typeof value.version !== 'string' || !Array.isArray(value.pairs) || !value.pairs.length || !value.artworks) throw new Error('Invalid dataset');
  const seen = new Set();
  for (const pair of value.pairs) {
    if (seen.has(pair.id) || typeof pair.id !== 'string' || !value.artworks[pair.a] || !value.artworks[pair.b] || pair.a === pair.b || ![pair.qA,pair.modelQA].every(v => v === null || (Number.isFinite(v) && v >= 0 && v <= 1))) throw new Error('Invalid pair');
    seen.add(pair.id);
  }
  for (const art of Object.values(value.artworks)) {
    if (!/^(art|met-art)\/\d+\.jpg$/.test(art.image) || !/^https:\/\/www\.metmuseum\.org\/art\/collection\/search\/\d+$/.test(art.sourceUrl)) throw new Error('Invalid artwork link');
  }
}
async function load() {
  $('loadError').hidden = true; $('loading').hidden = false;
  try {
    const response = await fetch('./met_experience_data.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Dataset unavailable');
    const loaded = await response.json(); validateData(loaded); data = loaded;
    storageKey = `${STORAGE_BASE_KEY}:${data.version}`;
    pairsById = new Map(data.pairs.map(pair => [pair.id,pair]));
    state = restore(); state.consent = true; $('contribute').checked = true;
    $('loading').hidden = true; $('contributionBar').hidden = false;
    translate(); renderPlay(); checkCollector();
  } catch {
    $('loading').hidden = true; $('loadError').hidden = false;
  }
}
function setViews(next) {
  view = next;
  const completed = state.index >= state.deck.length;
  const pending = state.queue.length > 0;
  $('pendingView').hidden = next !== 'play' || !pending;
  $('playView').hidden = next !== 'play' || completed || pending;
  $('summaryView').hidden = next !== 'play' || !completed || pending;
  $('collectionView').hidden = next !== 'collection';
  $('playNav').classList.toggle('active', next === 'play');
  $('collectionNav').classList.toggle('active', next === 'collection');
  $('playNav').setAttribute('aria-current', next === 'play' ? 'page' : 'false');
  $('collectionNav').setAttribute('aria-current', next === 'collection' ? 'page' : 'false');
}
function renderPlay() {
  if (!state) return;
  setViews('play');
  if (state.queue.length) { updateSync(); return; }
  if (state.index >= state.deck.length) { renderSummary(); return; }
  const item = state.deck[state.index];
  $('roundLabel').textContent = t('round', state.roundNumber);
  $('pickLabel').textContent = t('pick', state.index+1, state.deck.length);
  $('progressSteps').replaceChildren(...state.deck.map((_,i) => {const dot=document.createElement('span'); dot.className=i<state.index?'done':i===state.index?'current':''; return dot;}));
  $('progressSteps').setAttribute('aria-label', `${state.index} / ${state.deck.length}`);
  $('chooseLeft').classList.remove('selected','not-selected'); $('chooseRight').classList.remove('selected','not-selected');
  const key = state.roundId + ':' + state.index;
  if (displayKey !== key) {
    displayKey = key; const token = ++renderToken;
    $('artStage').classList.remove('entering');
    void $('artStage').offsetWidth;
    $('artStage').classList.add('entering');
    $('pairNotice').hidden=true;
    $('chooseLeft').disabled = true; $('chooseRight').disabled = true;
    $('skipPair').disabled = true;
    Promise.all([setImage($('leftImage'),data.artworks[item.leftId]),setImage($('rightImage'),data.artworks[item.rightId])]).then(async loaded => {
      if (token !== renderToken) return;
      const expectedRound = state.roundId, expectedIndex = state.index;
      await mutateState(current => {
        if (current.roundId !== expectedRound || current.index !== expectedIndex) return false;
        if (!current.presentation) current.presentation = {roundId:current.roundId,pairId:item.pairId,shownAt:new Date().toISOString()};
      });
      if (token !== renderToken || state.roundId !== expectedRound || state.index !== expectedIndex) {displayKey='';renderPlay();return;}
      const complete = loaded.every(Boolean);
      $('chooseLeft').disabled = $('chooseRight').disabled = !complete || !collector;
      $('skipPair').disabled = !collector;
      if (!complete) {$('announcement').textContent=t('imageError');$('pairNotice').textContent=t('imageError');$('pairNotice').hidden=false;}
    });
    const next = state.deck[state.index+1];
    if (next) [next.leftId,next.rightId].forEach(id => {const img=new Image(); img.src=data.artworks[id].image;});
  }
}
function setImage(img, art) {
  return new Promise(resolve => {
    img.classList.remove('failed');
    img.onload=()=>{img.onload=img.onerror=null; resolve(true);};
    img.onerror=()=>{img.classList.add('failed'); img.onload=img.onerror=null; resolve(false);};
    img.src=art.image;
    if (img.complete) {const valid=img.naturalWidth>0; img.onload=img.onerror=null; img.classList.toggle('failed',!valid); resolve(valid);}
  });
}
async function choose(side) {
  if (!state || busy || !collector || state.queue.length || view !== 'play' || state.index >= state.deck.length || !state.presentation) return;
  if (side !== 'skip' && $(side === 'left' ? 'chooseLeft' : 'chooseRight').disabled) return;
  busy = true;
  const expectedRound = state.roundId, expectedIndex = state.index;
  const accepted = await mutateState(current => {
    if (current.roundId !== expectedRound || current.index !== expectedIndex || !current.presentation) return false;
    const item = current.deck[current.index], pair = pairsById.get(item.pairId);
    const chosenId = side === 'left' ? item.leftId : item.rightId;
    const choice = side === 'skip' ? 'skip' : chosenId === pair.a ? 'A' : 'B';
    const chosenAt = new Date().toISOString();
    if (Date.parse(chosenAt) < Date.parse(current.presentation.shownAt)) return false;
    const stacked=Math.abs($('chooseLeft').getBoundingClientRect().top-$('chooseRight').getBoundingClientRect().top)>5;
    const record = {id:uuid(),sessionId:current.sessionId,roundId:current.roundId,datasetVersion:data.version,pairId:pair.id,leftId:item.leftId,rightId:item.rightId,choice,position:current.index+1,layout:stacked?'stacked':'side-by-side',source:current.source,shownAt:current.presentation.shownAt,chosenAt,elapsedMs:Math.min(3600000,Math.max(0,Date.parse(chosenAt)-Date.parse(current.presentation.shownAt))),profile:structuredClone(current.profile),consent:true};
    current.history.push(record); current.seen.push(pair.id); current.index++; current.presentation=null;
    current.queue.push(record);
    return true;
  });
  if (!accepted) {busy=false;displayKey='';renderPlay();return;}
  updateCollectionCount(); updateSync();
  $('chooseLeft').disabled=$('chooseRight').disabled=$('skipPair').disabled=true;
  if (side !== 'skip') {
    $(side==='left'?'chooseLeft':'chooseRight').classList.add('selected');
    $(side==='left'?'chooseRight':'chooseLeft').classList.add('not-selected');
  }
  $('announcement').textContent=t(side==='skip'?'skippedAnnounce':'picked');
  await syncChoices();
  window.setTimeout(()=>{busy=false;if(view==='play')renderPlay();else renderCollection();},matchMedia('(prefers-reduced-motion: reduce)').matches?30:220);
}
function currentRecords() { return state.history.filter(record => record.roundId === state.roundId); }
function uniquePicks(records) { return [...new Set(records.map(record=>chosenArtwork(record,pairsById)).filter(Boolean))]; }
function updateCollectionCount() { $('collectionCount').textContent=uniquePicks(state.history).length; }
function renderSummary(focus=true) {
  setViews('play');
  const records=currentRecords(), picks=records.filter(r=>r.choice!=='skip');
  const judges=agreement(records,pairsById,'qA'), model=agreement(records,pairsById,'modelQA');
  $('summaryIntro').textContent=t('summaryIntro',picks.length,records.length-picks.length);
  $('judgeScore').textContent=judges.percent===null?'—':`${judges.percent}%`;
  $('judgeText').textContent=judges.total?t('judgeText',judges.matched,judges.total):t('noComparisons');
  $('modelText').textContent=model.total?t('modelText',model.matched,model.total):t('noModel');
  const unrated=records.filter(record=>record.choice!=='skip'&&pairsById.get(record.pairId)?.qA===null).length;
  $('unratedNote').textContent=unrated?(locale==='zh'?`本轮有 ${unrated} 组新画作尚未完成 AI 评测；一致率只计算已有裁判结果的画对。`:`${unrated} new pair${unrated===1?'':'s'} await AI review. Agreement uses only pairs with existing judge results.`):'';
  $('unratedNote').hidden=!unrated;
  $('agreementFill').style.width=`${judges.percent??0}%`;
  const insight=getInsight(records,pairsById,data.artworks);
  if(insight){const k=insight.dimension+'_'+insight.direction;$('insightTitle').textContent=t(k);$('insightText').textContent=t('insight',t('dimension_'+k),insight.count,insight.total);}
  else{$('insightTitle').textContent=t(picks.length?'openMind':'allSkippedTitle');$('insightText').textContent=t(picks.length?'openMindText':'allSkippedText');}
  const ids=uniquePicks(records);
  $('insightArtwork').replaceChildren();
  if(ids.length){const button=document.createElement('button');const img=document.createElement('img');img.src=data.artworks[ids[0]].image;img.alt=data.artworks[ids[0]].title;button.append(img);button.addEventListener('click',()=>openArtwork(ids[0]));$('insightArtwork').append(button);}
  renderGallery($('roundGallery'),ids);
  renderComparisons(records);
  if(focus){$('summaryView').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function artworkText(art,key) { return key==='artist'&&art.artist==='Artist not recorded'?t('unknownArtist'):key==='date'&&art.date==='Date not recorded'?t('unknownDate'):art[key]; }
function renderGallery(container,ids) {
  container.replaceChildren(...ids.map(id=>{
    const art=data.artworks[id],button=document.createElement('button');button.className='gallery-card';button.type='button';
    const thumb=document.createElement('span');thumb.className='thumb';const img=document.createElement('img');img.src=art.image;img.alt='';img.loading='lazy';thumb.append(img);
    const title=document.createElement('strong');title.textContent=art.title;
    const artist=document.createElement('small');artist.textContent=artworkText(art,'artist');
    button.append(thumb,title,artist);button.setAttribute('aria-label',art.title);button.addEventListener('click',()=>openArtwork(id));return button;
  }));
}
function renderCollection() {
  if(!state)return;setViews('collection');
  const ids=uniquePicks([...state.history].reverse());$('collectionIntro').textContent=t('collectionIntro',ids.length);$('collectionEmpty').hidden=ids.length>0;renderGallery($('collectionGrid'),ids);
}
function openArtwork(id) {
  const art=data.artworks[id];$('detailImage').src=art.image;$('detailImage').alt=art.title;$('artworkTitle').textContent=art.title;$('detailArtist').textContent=artworkText(art,'artist');$('detailDate').textContent=artworkText(art,'date');$('detailSource').href=art.sourceUrl;$('artworkDialog').showModal();
}
function judgeDescription(record,field) {
  const q=pairsById.get(record.pairId)[field];if(q===null)return locale==='zh'?'尚未评测':'Awaiting review';if(q===.5)return t('tie');
  const preferred=q>.5?'A':'B';return `${t(preferred===record.choice?'samePick':'differentPick')} · ${Math.round(Math.max(q,1-q)*100)}% ${t(field==='qA'?'support':'prediction')}`;
}
async function renderComparisons(records) {
  const request=++communityRequest;
  $('comparisonList').replaceChildren(...records.map((record,index)=>{
    const row=document.createElement('div');row.className='comparison-row';
    const number=document.createElement('span');number.className='comparison-number';number.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('div'),title=document.createElement('strong'),counts=document.createElement('span');counts.dataset.pair=record.pairId;
    const id=chosenArtwork(record,pairsById);title.textContent=id?`${t('yourPick')}: ${data.artworks[id].title}`:t('skipped');counts.textContent=collector?'':t('communityUnavailable');name.append(title,counts);
    const stats=document.createElement('div');stats.className='comparison-stats';
    if(id)for(const [label,field]of[['judges','qA'],['model','modelQA']]){const span=document.createElement('span');span.textContent=`${t(label)}: ${judgeDescription(record,field)}`;stats.append(span);}
    row.append(number,name,stats);return row;
  }));
  if(!collector)return;
  try{
    const response=await fetch(`${collectorEndpoint}/experience/community?pairs=${records.map(r=>encodeURIComponent(r.pairId)).join(',')}`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Unavailable');
    const result=await response.json();if(request!==communityRequest)return;
    for(const record of records){const el=$('comparisonList').querySelector(`[data-pair="${record.pairId}"]`);if(!el)continue;const counts=result.pairs?.[record.pairId];el.textContent=record.choice==='skip'?'':counts?.total?t('community',record.choice==='A'?counts.a:counts.b,counts.total):t('noCommunity');}
  }catch{if(request===communityRequest)$('comparisonList').querySelectorAll('[data-pair]').forEach(el=>el.textContent=t('communityUnavailable'));}
}
async function nextRound() {
  if(!state||busy)return;
  await mutateState(current=>{
    if(current.index < current.deck.length) return false;
    const next=buildRound(data.pairs,current.seen);if(next.newCycle)current.seen=[];
    current.deck=next.deck;current.index=0;current.roundId=uuid();current.roundNumber++;current.presentation=null;
  });
  displayKey='';renderPlay();window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true});
}
function renderSettings() {
  const icons={calm:'◌',curious:'✧',energized:'☀',reflective:'☾'};
  $('moodOptions').replaceChildren(...MOODS.map(mood=>{
    const button=document.createElement('button');button.type='button';button.className='chip';button.textContent=`${icons[mood]} ${t('mood_'+mood)}`;button.setAttribute('aria-pressed',state.profile.mood===mood);button.addEventListener('click',async()=>{await mutateState(current=>{current.profile.mood=current.profile.mood===mood?'':mood;});renderSettings();});return button;
  }));
  $('interestOptions').replaceChildren(...INTERESTS.map(interest=>{
    const button=document.createElement('button');button.type='button';button.className='chip';button.textContent=t('interest_'+interest);button.setAttribute('aria-pressed',state.profile.interests.includes(interest));button.addEventListener('click',async()=>{await mutateState(current=>{current.profile.interests=current.profile.interests.includes(interest)?current.profile.interests.filter(v=>v!==interest):[...current.profile.interests,interest];});renderSettings();});return button;
  }));
  $('profileLanguage').value=state.profile.language;
}
async function checkCollector() {
  try {
    const configResponse=await fetch('./collection_config.json',{cache:'no-cache',signal:AbortSignal.timeout(4000)});
    if(!configResponse.ok)throw new Error('Configuration unavailable');
    const config=await configResponse.json();
    const secureEndpoint=/^https:\/\/[a-z0-9.-]+(?:\/[^?#]*)?$/i.test(config.endpoint);
    const localPreview=location.hostname==='127.0.0.1'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(config.endpoint);
    if(config.datasetVersion!==data.version||!(secureEndpoint||localPreview))throw new Error('Invalid collector configuration');
    collectorEndpoint=config.endpoint.replace(/\/$/,'');
    const response=await fetch(`${collectorEndpoint}/experience/health`,{signal:AbortSignal.timeout(4000)});
    if(!response.ok)throw new Error('Unavailable');
    const result=await response.json();collector=result.mode==='public-online'&&result.datasetVersion===data.version;
  }
  catch{collector=false;}
  updateSync();
  if(collector) {
    if(state.queue.length)await syncChoices();
    else if(view==='play')renderPlay();
    const ready=$('leftImage').complete&&$('leftImage').naturalWidth>0&&$('rightImage').complete&&$('rightImage').naturalWidth>0;
    if(!state.queue.length&&state.index<state.deck.length){$('chooseLeft').disabled=$('chooseRight').disabled=!ready;$('skipPair').disabled=false;}
  } else {$('chooseLeft').disabled=$('chooseRight').disabled=$('skipPair').disabled=true;}
}
function updateSync() {
  if(!state)return;
  $('syncStatus').textContent=rejected?t('rejected'):state.queue.length?t('pending',state.queue.length):!collector?t('unavailable'):hasSynced?t('savedStudy'):t('collectorReady');
  $('retrySave').hidden=!state.queue.length;
}
async function syncChoices() {
  if(syncing||!state?.queue.length||!collector)return;
  syncing=true;
  try{
    while(state.queue.length){
      const event=state.queue[0];syncController=new AbortController();const timer=setTimeout(()=>syncController.abort(),6000);
      let response;
      try{response=await fetch(`${collectorEndpoint}/experience/choices`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),signal:syncController.signal});}finally{clearTimeout(timer);}
      if(!response.ok){if(response.status>=400&&response.status<500){rejected=true;}else{collector=false;}break;}
      const result=await response.json();if(result.ok!==true || result.id!==event.id)throw new Error('Invalid acknowledgment');
      await mutateState(current=>{current.queue=current.queue.filter(item=>item.id!==event.id);});hasSynced=true;rejected=false;updateSync();
    }
  }catch{collector=false;}
  finally{syncing=false;syncController=null;updateSync();if(view==='play')renderPlay();if(view==='play'&&state.index>=state.deck.length&&!state.queue.length)renderComparisons(currentRecords());}
}

$('chooseLeft').addEventListener('click',()=>choose('left'));
$('chooseRight').addEventListener('click',()=>choose('right'));
$('skipPair').addEventListener('click',()=>choose('skip'));
$('nextRound').addEventListener('click',nextRound);
$('playNav').addEventListener('click',()=>{if(state){renderPlay();window.scrollTo({top:0,behavior:'instant'});}});
$('collectionNav').addEventListener('click',()=>{if(state){renderCollection();window.scrollTo({top:0,behavior:'instant'});$('collectionView').focus({preventScroll:true});}});
$('backToPlay').addEventListener('click',()=>{renderPlay();window.scrollTo({top:0,behavior:'instant'});});
$('settingsOpen').addEventListener('click',()=>{renderSettings();$('settingsDialog').showModal();});
$('settingsDone').addEventListener('click',()=>$('settingsDialog').close());
$('profileLanguage').addEventListener('change',async event=>{const language=event.target.value;await mutateState(current=>{current.profile.language=language;});});
$('privacyOpen').addEventListener('click',()=>$('privacyDialog').showModal());
$('retrySave').addEventListener('click',checkCollector);
$('languageToggle').addEventListener('click',()=>{locale=locale==='en'?'zh':'en';try{localStorage.setItem(LOCALE_KEY,locale);}catch{}translate();});
$('retryLoad').addEventListener('click',load);
window.addEventListener('keydown',event=>{
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||document.querySelector('dialog[open]'))return;
  const focused=document.activeElement;
  if(['INPUT','SELECT','TEXTAREA','A','SUMMARY'].includes(focused?.tagName))return;
  if(focused?.tagName==='BUTTON' && (!['chooseLeft','chooseRight'].includes(focused.id)||!['ArrowLeft','ArrowRight','s','S'].includes(event.key)))return;
  const side=event.key==='ArrowLeft'?'left':event.key==='ArrowRight'?'right':event.key.toLowerCase()==='s'?'skip':null;
  if(side&&state&&view==='play'&&state.index<state.deck.length){event.preventDefault();choose(side);}
});
window.addEventListener('storage',event=>{if(event.key!==storageKey||!data||memoryOnly)return;try{const raw=localStorage.getItem(storageKey);if(!raw)return;const latest=JSON.parse(raw);if(!isValidState(latest,data))return;const changed=latest.roundId!==state.roundId||latest.index!==state.index;state=latest;if(!state.consent)syncController?.abort();$('contribute').checked=state.consent;updateSync();updateCollectionCount();if(changed){displayKey='';if(view==='play')renderPlay();else renderCollection();}}catch{}});
window.addEventListener('online',checkCollector);
window.addEventListener('focus',()=>{if(state)checkCollector();});
setInterval(()=>{if(state?.queue.length&&!syncing)checkCollector();},15000);
translate();load();
