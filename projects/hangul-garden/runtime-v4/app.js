'use strict';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const dialogShade = document.querySelector('#dialog-shade');
const supportsNativeDialog = typeof dialog.showModal === 'function';
const search = document.querySelector('#search');
const toast = document.querySelector('#toast');
const storageKey = 'hangul-garden.learning.v1';
const pageSize = 8;
const dayMs = 86400000;
const goal = 10;
const routeLabels = {
  wordbank: '韩语词库', hangul: '韩文字母', review: '闪卡复习', saved: '我的收藏', progress: '学习进度'
};
for (const section of practiceSections) routeLabels[section.route] = `${section.title}练习`;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
const shortDate = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', weekday: 'short' });
const defaultState = { favorites: [], custom: [], records: {}, activity: {} };
let state = loadState();
let route = '';
let topic = 'all';
let gradeFilter = 'all';
let reviewGrade = 'all';
let status = 'all';
let query = '';
let page = 1;
let session = null;
let selection = null;
let toastTimeout;
let searchScrollPending = false;
let dialogTrigger = null;

function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return { ...defaultState, ...value };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    announce('浏览器无法保存记录，本次打开时仍可继续学习。');
    return false;
  }
}

function safe(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const allWords = () => [...builtInWords, ...state.custom];
const builtInWordById = new Map(builtInWords.map(word => [word.id, word]));
const wordById = id => builtInWordById.get(id) || state.custom.find(word => word.id === id);
const topicName = id => {
  const found = topics.find(item => item.id === id);
  return found ? found.name : '自定义';
};
const dayKey = (time = Date.now()) => dateFormatter.format(time);
const dailyIds = (time = Date.now()) => state.activity[dayKey(time)] || [];
const isDue = (word, now = Date.now()) => {
  const entry = state.records[word.id];
  return Boolean(entry && entry.due <= now);
};
const isKnown = word => {
  const entry = state.records[word.id];
  return Boolean(entry && entry.level >= 3);
};
const activeWords = () => allWords().filter(word => state.records[word.id]);
const gradeGroups = [
  { id: 'beginner', label: '初级', exam: 'TOPIK I', grades: [1, 2] },
  { id: 'intermediate', label: '中级', exam: 'TOPIK II', grades: [3, 4] },
  { id: 'advanced', label: '高级', exam: 'TOPIK II', grades: [5, 6] }
];
const gradeRanges = new Map(gradeGroups.map(group => [group.id, group.grades]));
gradeRanges.set('topik2', [3, 4, 5, 6]);
const matchesGrade = (word, grade) => {
  if (grade === 'all') return true;
  if (grade === 'extra') return !word.grade;
  const range = gradeRanges.get(grade);
  return range ? range.includes(word.grade) : String(word.grade) === grade;
};
const gradeOptions = [
  ['all', '所有等级'],
  ['topik2', 'TOPIK II（3–6 级）']
];
for (const { id, label, grades } of gradeGroups) {
  gradeOptions.push([id, `${label}（${grades[0]}–${grades[1]} 级）`]);
  gradeOptions.push(...grades.map(grade => [String(grade), `课程 ${grade} 级`]));
}
gradeOptions.push(['extra', '补充词汇']);
const gradeLabel = grade => {
  const found = gradeOptions.find(([value]) => value === grade);
  return found ? found[1] : '所有等级';
};
const option = (id, label, current) => `<option value="${id}" ${current === id ? 'selected' : ''}>${label}</option>`;
const number = value => value.toLocaleString('zh-CN');
const soundIcon = '<span class="speaker" aria-hidden="true"></span>';

function announce(message) {
  if (dialog.hasAttribute('open')) {
    const statusLine = dialog.querySelector('[data-dialog-status]');
    if (statusLine) {
      statusLine.textContent = message;
      return;
    }
  }
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.hidden = false;
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 4500);
}

function say(value) {
  if (!value) return;
  if (!('speechSynthesis' in window)) {
    announce('此浏览器暂不支持语音朗读。');
    return;
  }
  const speech = new SpeechSynthesisUtterance(value);
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(item => /^ko(?:-|$)/i.test(item.lang));
  if (voices.length && !voice) {
    announce('当前设备没有韩语语音，请在系统语音设置中添加韩语。');
    return;
  }
  speech.lang = 'ko-KR';
  if (voice) speech.voice = voice;
  speech.rate = 0.86;
  speech.onerror = event => {
    if (!['canceled', 'interrupted'].includes(event.error)) announce('暂时无法播放，请检查设备是否启用了韩语语音。');
  };
  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function heading(title, subtitle) {
  return `<header class="page-head"><h1>${title}</h1><p>${subtitle}</p></header>`;
}

function updateNav() {
  document.querySelector('#crumb').textContent = routeLabels[route];
  document.querySelectorAll('[data-route], [data-practice-nav]').forEach(link => {
    const active = link.hasAttribute('data-practice-nav') ? Boolean(currentSection()) : link.dataset.route === route;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const count = allWords().filter(word => isDue(word)).length;
  const badge = document.querySelector('#nav-count');
  badge.hidden = count === 0;
  badge.textContent = count;
}

function render() {
  updateNav();
  const views = { wordbank: renderBank, saved: renderBank, hangul: renderHangul, review: renderReview, progress: renderProgress };
  main.innerHTML = (views[route] || renderPractice)();
}

function renderBank() {
  const saved = route === 'saved';
  const counts = allWords();
  const gradeThree = builtInWords.filter(word => word.grade === 3);
  const dailyWords = gradeThree.length ? gradeThree : builtInWords;
  const dailyIndex = Math.floor((Date.now() + 8 * 3600000) / dayMs) % dailyWords.length;
  const daily = dailyWords[dailyIndex];
  const done = dailyIds().length;
  const spotlight = `<aside aria-label="今日学习">
    <section class="panel panel-pad today-card">
      <h2>今日词卡</h2>
      ${wordLink(daily)}
      <p class="meaning">${safe(daily.zh)}</p>
      <button class="button soft" data-action="sound" data-id="${daily.id}">${soundIcon} 听发音</button>
    </section>
    <section class="panel panel-pad mini-progress">
      <h2>今日学习</h2>
      <p class="mini-count">${done}<span class="muted"> / ${goal} 词</span></p>
      <p class="muted">通过闪卡或测验累计</p>
      ${meter(done, goal, '今日学习进度')}
    </section>
    ${saved ? '' : `<section class="panel panel-pad exam-card">
      <h2>TOPIK II 真题</h2>
      <p>TOPIK II 覆盖 3–6 级，考试包括听力、阅读和写作。</p>
      <a class="button outline" href="https://www.topik.go.kr/TWSTDY/TWSTDY0090.do" target="_blank" rel="noopener">打开官方真题</a>
    </section>`}
  </aside>`;
  const intro = saved ? heading('我的收藏', '把想反复看的词留在这里，也可以只复习收藏的单词。') : `
    <section class="hero" aria-label="韩语词库介绍">
      <div class="hero-copy">
        <h1>TOPIK 分级词库</h1>
        <p>按课程等级查词，搭配中文释义和韩文例句。</p>
        <div class="hero-actions">
          <button class="button" data-action="browse-level" data-id="intermediate">浏览 3–4 级词汇</button>
          <a class="button hero-secondary" href="#/grammar">3–4 级专项练习</a>
          <button class="button hero-secondary" data-action="practice-level" data-id="3">复习 3 级词汇</button>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit second"></div>
        <span class="tile first" lang="ko">한</span><span class="tile last" lang="ko">글</span>
        <span class="art-star">✦</span><span class="art-dot"></span>
      </div>
    </section>
    <section class="topics-section" aria-labelledby="levels-title">
      <div class="section-heading"><h2 id="levels-title">分级词库</h2><p>${number(counts.length)} 个词条</p></div>
      <div class="level-grid">${gradeGroups.map(({ id, label, exam, grades }) => `<section class="level-group ${id}" aria-label="${label}词汇">
        <button class="level-group-control" data-action="browse-level" data-id="${id}" aria-pressed="${gradeFilter === id}">
          <strong>${label}</strong><span>${exam}</span>
        </button>
        <div class="level-links">${grades.map(value => {
          const grade = String(value);
          return `<button class="level-card" data-action="browse-level" data-id="${grade}" aria-pressed="${gradeFilter === grade}">
            <strong>${grade} 级</strong><small>${number(counts.filter(word => word.grade === value).length)} 词条</small>
          </button>`;
        }).join('')}</div>
      </section>`).join('')}</div>
    </section>
    <section class="topics-section starter-topics" aria-labelledby="topic-title">
      <div class="section-heading"><h2 id="topic-title">入门场景</h2><p>${number(counts.filter(word => sceneIds.has(word.topic)).length)} 个场景词条</p></div>
      <div class="topic-grid">${topics.filter(item => item.mark && item.id !== 'custom').map(item => `<button class="topic-card" data-action="topic" data-id="${item.id}" aria-pressed="${topic === item.id}">
        <span class="topic-mark ${item.tone}" lang="ko" aria-hidden="true">${item.mark}</span>
        <span><strong>${item.name}</strong><small>${counts.filter(word => word.topic === item.id).length} 词</small></span>
      </button>`).join('')}</div>
    </section>`;
  return intro + `<div class="columns"><section class="panel" id="word-results" aria-label="词汇列表">${renderList()}</section>${spotlight}</div>`;
}

function meter(value, max, label) {
  const percent = Math.min(100, Math.round(value * 100 / (max || 1)));
  return `<div class="meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>`;
}

function wordLink(word) {
  const pronunciation = word.roman || (word.pronunciation ? `[${word.pronunciation}]` : '');
  return `<button class="word-link" data-action="detail" data-id="${safe(word.id)}"><strong lang="ko">${safe(word.ko)}</strong>${pronunciation ? `<span class="roman">${safe(pronunciation)}</span>` : ''}</button>`;
}

function favoriteButton(word, large = false) {
  const saved = state.favorites.includes(word.id);
  const label = saved ? '取消收藏' : '收藏单词';
  return `<button class="${large ? 'button outline' : 'icon-button'}" data-action="favorite" data-id="${safe(word.id)}" aria-pressed="${saved}" aria-label="${label} ${safe(word.ko)}" title="${label}"><span aria-hidden="true">${saved ? '★' : '☆'}</span>${large ? label : ''}</button>`;
}

function soundButton(word) {
  return `<button class="icon-button" data-action="sound" data-id="${safe(word.id)}" aria-label="听 ${safe(word.ko)} 的发音" title="听发音">${soundIcon}</button>`;
}

function renderList() {
  const terms = query.normalize('NFC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const words = allWords().filter(word => {
    if (route === 'saved' && !state.favorites.includes(word.id)) return false;
    if (topic !== 'all' && word.topic !== topic) return false;
    if (!matchesGrade(word, gradeFilter)) return false;
    if (status === 'due' && !isDue(word)) return false;
    if (status === 'new' && state.records[word.id]) return false;
    if (status === 'known' && !isKnown(word)) return false;
    if (!terms.length) return true;
    const extraGlosses = word.senses ? word.senses.map(([gloss]) => gloss) : [];
    const searchable = [word.ko, word.roman, word.zh, ...extraGlosses].join(' ').normalize('NFC').toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
  const perPage = sceneIds.has(topic) ? 12 : pageSize;
  const totalPages = Math.max(1, Math.ceil(words.length / perPage));
  page = Math.min(page, totalPages);
  const header = `<div class="list-heading"><h2>${route === 'saved' ? '已收藏词汇' : gradeFilter === 'all' ? '全部词汇' : gradeLabel(gradeFilter)}</h2><p role="status">${number(words.length)} 个词条</p></div>
    <div class="inset-controls">
      <select id="grade-filter" class="filter" aria-label="筛选课程等级">${gradeOptions.map(([id, label]) => option(id, label, gradeFilter)).join('')}</select>
      <select id="topic-filter" class="filter" aria-label="筛选词汇主题">${option('all', '所有主题', topic)}${topics.map(item => option(item.id, item.name, topic)).join('')}</select>
      <select id="status-filter" class="filter" aria-label="筛选学习状态">${option('all', '所有状态', status)}${option('new', '未学习', status)}${option('due', '待复习', status)}${option('known', '已掌握', status)}</select>
    </div>`;
  if (!words.length) {
    const noFavorites = route === 'saved' && !state.favorites.length;
    return header + `<div class="empty"><h3>${noFavorites ? '还没有收藏' : '未找到匹配的单词'}</h3><p>${noFavorites ? '在词库里点按星标，就能把词收进来。' : '试试其他关键词或筛选条件。'}</p>
      ${noFavorites ? '<a class="button" href="#/wordbank">浏览词库</a>' : '<button class="button outline" data-action="clear-filters">清除筛选</button>'}</div>`;
  }
  const source = '<p class="word-source">课程词条整理自 <a href="https://krdict.korean.go.kr/" target="_blank" rel="noopener">韩国国立国语院《韩国语基础词典》</a>与 <a href="https://github.com/basickorean/basickorean-vocab" target="_blank" rel="noopener">basickorean-vocab</a>，按国际通用韩语标准课程分级。<a href="https://creativecommons.org/licenses/by-sa/2.0/kr/" target="_blank" rel="noopener">CC BY-SA 2.0 KR</a></p>';
  return header + `<div class="word-row word-header"><span>韩文 / 发音</span><span>中文释义</span><span class="category-cell">等级 / 主题</span><span class="row-actions">操作</span></div>` +
    words.slice((page - 1) * perPage, page * perPage).map(word => `<div class="word-row">
      ${wordLink(word)}<span class="definition">${safe(word.zh)}</span><span class="pill category-cell">${word.grade ? gradeLabel(String(word.grade)) : topicName(word.topic)}</span>
      <span class="row-actions">${soundButton(word)}${favoriteButton(word)}</span>
    </div>`).join('') + `<div class="list-footer"><span>第 ${page} / ${totalPages} 页</span>
      <div class="pagination-buttons"><button class="button outline" data-action="previous" ${page <= 1 ? 'disabled' : ''}>上一页</button>
      <button class="button outline" data-action="next-page" ${page >= totalPages ? 'disabled' : ''}>下一页</button></div>
    </div>` + source;
}

function renderHangul() {
  return heading('韩文字母', '认识 19 个辅音和 21 个元音。点按任意字母，听它组成的音节。') +
    `<section class="panel panel-pad letters-section">
      <h2>音节怎么拼</h2>
      <p>先写辅音，再写元音。有收音时，把辅音放在下方。例如「한」的收音是 ㄴ。</p>
      <div class="syllable" aria-label="韩的字母组成"><span lang="ko">ㅎ</span> + <span lang="ko">ㅏ</span> + <span lang="ko">ㄴ</span> = <span lang="ko">한</span>
        <button class="icon-button" data-action="sound" data-value="한" aria-label="听音节 한">${soundIcon}</button>
      </div>
    </section>` + letterGroups.map(({ title, detail, letters }) => `<section class="panel panel-pad letters-section">
      <h2>${title}</h2><p>${detail}</p><div class="letters-grid">${letters.map(([letter, roman, sample]) => `<button class="letter" data-action="sound" data-value="${sample}" aria-label="${letter}，试听 ${sample}"><strong lang="ko">${letter}</strong><small>${roman}</small></button>`).join('')}</div>
    </section>`).join('');
}

function renderReview() {
  const header = heading('闪卡复习', '先回想词义再翻卡。按记忆程度选择下次复习的间隔。');
  if (!session) {
    const words = allWords().filter(word => matchesGrade(word, reviewGrade));
    const pending = words.filter(word => isDue(word)).length;
    const newCount = words.filter(word => !state.records[word.id]).length;
    const favoriteCount = words.filter(word => state.favorites.includes(word.id)).length;
    return header + `<section class="panel panel-pad review-panel">
      <h2>开始一组练习</h2>
      <label class="review-scope">练习范围
        <select id="review-grade" class="filter">${gradeOptions.map(([id, label]) => option(id, label, reviewGrade)).join('')}</select>
      </label>
      <p class="muted">${number(pending)} 个词到期 · ${number(newCount)} 个新词。每组最多 10 词，优先安排到期词。</p>
      <div class="review-controls">
        <button class="button" data-action="start-review" ${words.length ? '' : 'disabled'}>翻卡自评</button>
        <button class="button outline" data-action="start-quiz" ${words.length ? '' : 'disabled'}>词义测验</button>
        <button class="button outline" data-action="review-saved" ${favoriteCount ? '' : 'disabled'}>复习收藏（${number(favoriteCount)}）</button>
      </div>
    </section>`;
  }
  const { queue, index, revealed, mode, quiz, picked, correct, scope } = session;
  if (index === queue.length) {
    const result = mode === 'quiz' ? `答对 ${correct} / ${queue.length} 题。` : `本组已练习 ${queue.length} 个单词。`;
    return header + `<section class="panel panel-pad review-panel"><h2>本组练习完成</h2><p>${result} 学习记录已更新。</p>
      <div class="review-controls"><button class="button" data-action="end-review">选择下一组</button><a class="button outline" href="#/progress">查看学习进度</a></div></section>`;
  }
  const word = wordById(queue[index]);
  return header + `<section class="panel panel-pad review-panel">
    <div class="review-status"><span>${scope} · ${mode === 'quiz' ? '词义测验' : '翻卡自评'} · 第 ${index + 1} / ${queue.length} 词</span><button class="button ghost" data-action="end-review">结束本组</button></div>
    ${meter(index, queue.length, '本组学习进度')}
    <div class="flashcard">
      <h2 class="large-ko" lang="ko">${safe(word.ko)}</h2>
      ${mode === 'flash' ? soundButton(word) : ''}
      ${revealed ? `<div class="answer"><h3>${safe(word.zh)}</h3>${word.sentence ? `<p lang="ko">${safe(word.sentence)}</p><p class="muted">${safe(word.translation || (word.senses && word.senses[0][1]))}</p>` : ''}</div>` : ''}
    </div>
    ${mode === 'quiz' ? `<div class="quiz-options">${quiz.map((option, idx) => {
      const css = picked < 0 ? '' : option === word.zh ? 'right' : idx === picked ? 'wrong' : '';
      return `<button class="button outline ${css}" data-action="answer" data-id="${idx}" ${picked < 0 ? '' : 'disabled'}>${safe(option)}</button>`;
    }).join('')}</div>${picked >= 0 ? `<div class="quiz-feedback" role="status"><p>${quiz[picked] === word.zh ? '回答正确' : `正确答案是 ${safe(word.zh)}`}</p><button class="button" data-action="next-quiz">继续</button></div>` : ''}
    ` : revealed ? `<div class="review-ratings"><button class="button outline" data-action="rate" data-id="0">忘记了 · 10 分钟</button>
      <button class="button outline" data-action="rate" data-id="1">有印象 · 1 天</button>
      <button class="button soft" data-action="rate" data-id="2">记住了 · 3 天</button>
      <button class="button" data-action="rate" data-id="3">很熟悉 · 7 天</button></div>` : '<button class="button" data-action="flip">翻卡查看释义</button>'}
  </section>`;
}

function renderProgress() {
  const active = activeWords();
  const known = active.filter(isKnown).length;
  const due = active.filter(word => isDue(word)).length;
  const intermediateStats = [3, 4].map(grade => {
    const words = builtInWords.filter(word => word.grade === grade);
    return { grade, total: words.length, reviewed: words.filter(word => state.records[word.id]).length };
  });
  const stats = [['已学习', active.length], ['已掌握', known], ['待复习', due]];
  return heading('学习进度', '记录你练过的词，以及最近一周每天的学习量。') +
    `<div class="progress-grid">${stats.map(([title, value]) => `<section class="panel panel-pad"><h2>${title}</h2><strong>${value}</strong><p>个单词</p></section>`).join('')}</div>
    <section class="panel panel-pad activity">
      <div class="section-heading"><h2>中级词汇进度</h2></div>
      <div class="grade-progress">${intermediateStats.map(({ grade, total, reviewed }) => `<div>
        <div class="section-heading"><h3>课程 ${grade} 级</h3><p>已练 ${number(reviewed)} / ${number(total)} 个词条</p></div>
        ${meter(reviewed, total, `课程 ${grade} 级词汇学习进度`)}
      </div>`).join('')}</div>
    </section>
    <section class="panel panel-pad activity">
      <div class="section-heading"><h2>最近 7 天</h2><p>每天按练过的不同单词计数</p></div>
      <ul class="activity-list">${Array.from({ length: 7 }, (_, index) => {
        const time = Date.now() - index * dayMs;
        return `<li><span>${index ? shortDate.format(time) : '今天'}</span><strong>${dailyIds(time).length} 词</strong></li>`;
      }).join('')}</ul>
      <a class="button" href="#/review">去复习</a>
    </section>`;
}

function showDialog(markup) {
  dialog.innerHTML = markup + '<p class="form-note" data-dialog-status role="status"></p>';
  if (dialog.hasAttribute('open')) return;
  if (supportsNativeDialog) {
    dialog.showModal();
    return;
  }
  dialogTrigger = document.activeElement;
  dialogShade.hidden = false;
  dialog.classList.add('legacy-dialog');
  dialog.setAttribute('open', '');
  dialog.querySelector('button').focus();
}

function closeDialog() {
  if (supportsNativeDialog) {
    dialog.close();
    return;
  }
  if (!dialog.hasAttribute('open')) return;
  dialog.removeAttribute('open');
  dialogShade.hidden = true;
  if (dialogTrigger && document.contains(dialogTrigger)) dialogTrigger.focus({ preventScroll: true });
  dialogTrigger = null;
  dialog.dispatchEvent(new Event('close'));
}

function dialogHeader(title) {
  return `<div class="dialog-top"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" aria-label="关闭">×</button></div>`;
}

function showWord(word) {
  if (!word) return;
  selection = word.id;
  showDialog(dialogHeader(`<span class="large-ko" lang="ko">${safe(word.ko)}</span>`) +
    `<div class="detail-meta">${word.roman ? `<span class="muted">${safe(word.roman)}</span>` : ''}
      ${word.pronunciation ? `<span class="muted" lang="ko">[${safe(word.pronunciation)}]</span>` : ''}${soundButton(word)}
      ${word.grade ? `<span class="pill">${gradeLabel(String(word.grade))}</span>` : ''}
      <span class="pill">${topicName(word.topic)}</span>${word.type ? `<span class="pill">${safe(word.type)}</span>` : ''}</div>
    ${word.senses ? word.senses.map(([gloss, definition, example]) => `<section class="sentence">
      <div class="sentence-top"><strong>${safe(gloss)}</strong>
      ${example ? `<button class="icon-button" data-action="sound" data-value="${safe(example)}" aria-label="听例句">${soundIcon}</button>` : ''}</div>
      ${definition ? `<p class="muted">${safe(definition)}</p>` : ''}
      ${example ? `<p class="sense-example" lang="ko">${safe(example)}</p>` : ''}
    </section>`).join('') : `<p class="detail-meaning">${safe(word.zh)}</p>
    ${word.sentence ? `<section class="sentence"><div class="sentence-top"><strong>例句</strong>
      <button class="icon-button" data-action="sound-sentence" data-id="${safe(word.id)}" aria-label="听例句">${soundIcon}</button></div>
      <p lang="ko">${safe(word.sentence)}</p><p class="muted">${safe(word.translation)}</p></section>` : ''}`}
    <div class="dialog-actions">${favoriteButton(word, true)}
      <button class="button" data-action="review-word" data-id="${safe(word.id)}">练习这个词</button>
      ${word.topic === 'custom' ? `<button class="button danger" data-action="ask-remove" data-id="${safe(word.id)}">删除单词</button>` : ''}</div>`);
}

function showAdd(importing = false) {
  selection = null;
  const fields = importing ? `<p class="form-note" id="import-help">每行一个词。用制表符分隔韩文、中文释义，可在第三列填写罗马字。每次最多 200 行。</p>
    <label>粘贴词表<textarea name="rows" aria-describedby="import-help" required maxlength="64000" placeholder="우산&#9;雨伞&#9;usan"></textarea></label>` :
    `<label>韩文 <input name="ko" lang="ko" required maxlength="70" placeholder="예: 우산"></label>
    <label>中文释义 <input name="zh" required maxlength="150" placeholder="例如，雨伞"></label>
    <label>罗马字（选填） <input name="roman" maxlength="100" placeholder="usan"></label>
    <label>韩文例句（选填） <input name="sentence" lang="ko" maxlength="260" placeholder="우산을 가져가세요."></label>
    <label>例句翻译（选填） <input name="translation" maxlength="260" placeholder="请带上雨伞。"></label>`;
  showDialog(dialogHeader('添加单词') +
    `<div class="dialog-tabs"><button class="button ${importing ? 'outline' : 'soft'}" data-action="add" aria-pressed="${!importing}">手动添加</button>
      <button class="button ${importing ? 'soft' : 'outline'}" data-action="import" aria-pressed="${importing}">批量导入</button></div>
    <form class="form-fields" id="word-form" data-importing="${importing}">${fields}
      <p class="form-error" role="alert" hidden></p><button class="button" type="submit">${importing ? '导入词表' : '添加到词库'}</button></form>`);
  const field = dialog.querySelector('textarea, input');
  if (field) field.focus();
}

function addWords(form) {
  const input = {};
  new FormData(form).forEach((value, key) => { input[key] = value.trim().normalize('NFC'); });
  const importing = form.dataset.importing === 'true';
  const lines = importing ? input.rows.split(/\r?\n/).filter(line => line.trim()) : [];
  const showError = message => {
    const error = form.querySelector('.form-error');
    error.hidden = false;
    error.textContent = message;
  };
  if (lines.length > 200) {
    showError('每次最多导入 200 行，请把词表分成几组。');
    return;
  }
  const candidates = importing ? lines.map(line => {
    const [ko, zh = '', roman = ''] = line.split('\t').map(part => part.trim());
    return { ko, zh, roman };
  }) : [input];
  const invalid = candidates.findIndex(({ ko, zh, roman }) =>
    !/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ko) || !zh || ko.length > 70 || zh.length > 150 || roman.length > 100);
  if (invalid >= 0 || !candidates.length) {
    showError(importing ? `请检查第 ${Math.max(1, invalid + 1)} 条记录，填写韩文和释义，并用制表符分隔。` : '请输入韩文和中文释义。');
    return;
  }
  const existing = new Set(state.custom.map(word => word.ko));
  const added = [];
  for (const candidate of candidates) {
    if (existing.has(candidate.ko)) continue;
    existing.add(candidate.ko);
    const suffix = Array.from(crypto.getRandomValues(new Uint32Array(3))).map(number => number.toString(36)).join('-');
    added.push({ ...candidate, topic: 'custom', id: `custom-${suffix}` });
  }
  if (!added.length) {
    showError('这些单词已经在自定义词库里了。');
    return;
  }
  state.custom = [...added, ...state.custom];
  closeDialog();
  const stored = saveState();
  setFilters('custom');
  navigate('wordbank', true);
  if (stored) announce(`已添加 ${added.length} 个单词${added.length < candidates.length ? '，重复词已跳过' : ''}。`);
}

function toggleFavorite(word, button) {
  if (!word) return;
  const saved = state.favorites.includes(word.id);
  state.favorites = saved ? state.favorites.filter(id => id !== word.id) : [...state.favorites, word.id];
  const label = saved ? '收藏单词' : '取消收藏';
  button.setAttribute('aria-pressed', String(!saved));
  button.setAttribute('aria-label', `${label} ${word.ko}`);
  button.title = label;
  button.innerHTML = `<span aria-hidden="true">${saved ? '☆' : '★'}</span>${button.classList.contains('button') ? label : ''}`;
  if (saveState()) announce(saved ? '已取消收藏。' : '已添加到我的收藏。');
  if (route === 'saved' || dialog.hasAttribute('open')) render();
}

function shuffle(items) {
  const result = [...items];
  for (let end = result.length - 1; end > 0; end -= 1) {
    const selected = Math.floor(Math.random() * (end + 1));
    [result[end], result[selected]] = [result[selected], result[end]];
  }
  return result;
}

function quizOptions(word) {
  const words = allWords().filter(item => item.ko !== word.ko && item.zh !== word.zh);
  const related = words.filter(item => item.grade === word.grade && item.type === word.type);
  const preferred = [...new Set(related.map(item => item.zh))];
  const distractors = preferred.length >= 3 ? preferred : [...new Set(words.map(item => item.zh))];
  return shuffle([word.zh, ...shuffle(distractors).slice(0, 3)]);
}

function start(mode, favoritesOnly = false, singleWord = null) {
  const now = Date.now();
  const words = allWords().filter(word => matchesGrade(word, reviewGrade) && (!favoritesOnly || state.favorites.includes(word.id)));
  const due = words.filter(word => isDue(word, now)).sort((a, b) => state.records[a.id].due - state.records[b.id].due);
  const fresh = words.filter(word => !state.records[word.id]);
  const upcoming = words.filter(word => state.records[word.id] && state.records[word.id].due > now)
    .sort((a, b) => state.records[a.id].due - state.records[b.id].due);
  const pool = [...due, ...fresh];
  const queue = singleWord ? [singleWord.id] : (pool.length ? pool : upcoming).slice(0, 10).map(word => word.id);
  if (!queue.length) return;
  const scope = singleWord
    ? (singleWord.grade ? gradeLabel(String(singleWord.grade)) : '单词练习')
    : gradeLabel(reviewGrade);
  session = { queue, mode, scope, index: 0, revealed: false, quiz: mode === 'quiz' ? quizOptions(wordById(queue[0])) : [], picked: -1, correct: 0 };
  navigate('review');
  const title = main.querySelector('.flashcard h2');
  if (title) title.scrollIntoView({ block: 'nearest' });
}

function record(id, level) {
  const now = Date.now();
  const intervals = [600000, dayMs, 3 * dayMs, 7 * dayMs];
  state.records[id] = { level, due: now + intervals[level] };
  state.activity[dayKey(now)] = [...new Set([...dailyIds(now), id])];
  saveState();
}

function nextReview() {
  session.index += 1;
  session.picked = -1;
  session.revealed = false;
  if (session.mode === 'quiz' && session.index < session.queue.length) {
    session.quiz = quizOptions(wordById(session.queue[session.index]));
  }
  render();
  focusReview();
}

function focusReview(selector = '.flashcard h2, .review-panel h2') {
  const element = main.querySelector(selector);
  if (!element) return;
  element.tabIndex = -1;
  element.focus({ preventScroll: true });
}

function setFilters(nextTopic = 'all') {
  topic = nextTopic;
  gradeFilter = 'all';
  status = 'all';
  query = '';
  search.value = '';
  page = 1;
}

function scrollToResults() {
  const results = document.querySelector('#word-results');
  if (results) results.scrollIntoView({ block: 'start' });
}

function navigate(nextRoute, keepFilters = false) {
  if (nextRoute !== route) {
    if (!keepFilters) setFilters();
    const newHash = `#/${nextRoute}`;
    if (location.hash !== newHash) location.hash = newHash;
    route = nextRoute;
    window.scrollTo(0, 0);
  }
  render();
}

function fromHash() {
  const name = location.hash.slice(2);
  const next = Object.prototype.hasOwnProperty.call(routeLabels, name) ? name : 'wordbank';
  if (route !== next) navigate(next);
  if (searchScrollPending) {
    searchScrollPending = false;
    scrollToResults();
  }
}

function changeTopic(id) {
  topic = topic === id ? 'all' : id;
  gradeFilter = 'all';
  page = 1;
  render();
  const target = main.querySelector('[data-action="topic"][data-id="' + id + '"]');
  if (target) target.focus({ preventScroll: true });
  scrollToResults();
}

const actions = {
  ...practiceActions,
  topic: ({ id }) => changeTopic(id),
  'browse-level': ({ id }) => {
    gradeFilter = id;
    topic = 'all';
    status = 'all';
    page = 1;
    render();
    const filter = main.querySelector('#grade-filter');
    if (filter) filter.focus({ preventScroll: true });
    scrollToResults();
  },
  'practice-level': ({ id }) => {
    reviewGrade = id;
    session = null;
    navigate('review');
    focusReview();
  },
  detail: ({ word }) => showWord(word),
  favorite: ({ word, button }) => toggleFavorite(word, button),
  sound: ({ word, button }) => say(word ? word.ko : button.dataset.value),
  'sound-sentence': ({ word }) => { if (word) say(word.sentence); },
  add: () => showAdd(),
  import: () => showAdd(true),
  close: closeDialog,
  'clear-filters': () => { setFilters(); render(); focusList(); },
  previous: () => { page -= 1; render(); focusList(true); },
  'next-page': () => { page += 1; render(); focusList(true); },
  'start-review': () => start('flash'),
  'start-quiz': () => start('quiz'),
  'review-saved': () => start('flash', true),
  'review-word': ({ word }) => { closeDialog(); if (word) start('flash', false, word); },
  'end-review': () => { session = null; render(); focusReview(); },
  flip: () => { session.revealed = true; render(); focusReview('.flashcard .answer h3'); },
  rate: ({ id }) => {
    record(session.queue[session.index], Number(id));
    nextReview();
  },
  answer: ({ id }) => {
    const word = wordById(session.queue[session.index]);
    session.picked = Number(id);
    const correct = session.quiz[session.picked] === word.zh;
    if (correct) session.correct += 1;
    record(word.id, correct ? 2 : 0);
    render();
    focusReview('[data-action="next-quiz"]');
  },
  'next-quiz': nextReview,
  'ask-remove': ({ word }) => {
    if (!word || word.topic !== 'custom') return;
    showDialog(dialogHeader('删除自定义单词') + `<p>同时移除「${safe(word.ko)}」的收藏与学习记录。</p>
      <div class="dialog-actions"><button class="button outline" data-action="detail" data-id="${safe(word.id)}">返回</button>
      <button class="button danger" data-action="remove" data-id="${safe(word.id)}">确认删除</button></div>`);
  },
  remove: ({ word }) => {
    if (!word || word.topic !== 'custom') return;
    state.custom = state.custom.filter(item => item.id !== word.id);
    state.favorites = state.favorites.filter(id => id !== word.id);
    delete state.records[word.id];
    for (const day of Object.keys(state.activity)) {
      state.activity[day] = state.activity[day].filter(id => id !== word.id);
    }
    if (session && session.queue.includes(word.id)) session = null;
    closeDialog();
    if (saveState()) announce('已删除自定义单词。');
    render();
  }
};

function focusList(firstWord = false) {
  const target = main.querySelector(firstWord ? '.word-row .word-link' : '#topic-filter');
  if (target) target.focus({ preventScroll: true });
  scrollToResults();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (Object.prototype.hasOwnProperty.call(actions, action)) {
    actions[action]({ button, id, word: id ? wordById(id) : null });
  }
});

main.addEventListener('change', event => {
  const id = event.target.id;
  if (id === 'review-grade') reviewGrade = event.target.value;
  else if (id === 'grade-filter') gradeFilter = event.target.value;
  else if (id === 'topic-filter') topic = event.target.value;
  else if (id === 'status-filter') status = event.target.value;
  else return;
  page = 1;
  render();
  const control = document.getElementById(id);
  if (control) control.focus({ preventScroll: true });
});
main.addEventListener('submit', submitPractice);
main.addEventListener('input', updatePracticeDraft);
main.addEventListener('change', changePractice);
main.addEventListener('error', onPracticeAudioError, true);

dialog.addEventListener('submit', event => {
  if (event.target.id !== 'word-form') return;
  event.preventDefault();
  addWords(event.target);
});
dialogShade.addEventListener('click', closeDialog);
dialog.addEventListener('close', () => {
  const lastOpened = selection;
  selection = null;
  if (lastOpened && document.activeElement === document.body) {
    const trigger = Array.from(main.querySelectorAll('[data-action="detail"]')).find(button => button.dataset.id === lastOpened);
    if (trigger) trigger.focus({ preventScroll: true });
  }
});

search.addEventListener('input', () => {
  query = search.value;
  page = 1;
  if (route === 'wordbank' || route === 'saved') {
    document.querySelector('#word-results').innerHTML = renderList();
  } else {
    topic = 'all';
    gradeFilter = 'all';
    status = 'all';
    navigate('wordbank', true);
  }
});

document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  search.blur();
  if (route === 'wordbank' || route === 'saved') scrollToResults();
  else {
    searchScrollPending = true;
    navigate('wordbank', true);
  }
});

document.addEventListener('keydown', event => {
  if (!supportsNativeDialog && dialog.hasAttribute('open')) {
    if (event.key === 'Escape') closeDialog();
    else if (event.key === 'Tab') {
      const controls = dialog.querySelectorAll('button:not([disabled]), input, textarea');
      const edge = event.shiftKey ? controls[0] : controls[controls.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? controls[controls.length - 1] : controls[0]).focus();
      }
    }
    return;
  }
  if (event.key === '/' && !dialog.hasAttribute('open') && !event.target.matches('input, textarea, select, [contenteditable]')) {
    event.preventDefault();
    search.focus();
  }
});
window.addEventListener('hashchange', fromHash);
fromHash();
