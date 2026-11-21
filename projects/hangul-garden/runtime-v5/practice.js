'use strict';

const practiceSections = [
  { route: 'grammar', title: '语法', hint: '学接续，再用例句巩固。', tasks: grammarTasks },
  { route: 'listening', title: '听力', hint: '听对话和通知，抓住关键信息。', tasks: listeningTasks },
  { route: 'reading', title: '阅读', hint: '练习读通知、找主旨和理清句子顺序。', tasks: readingTasks },
  { route: 'writing', title: '写作', hint: '从短句补全到图表描述和观点表达。', tasks: writingTasks }
];
const practiceKey = 'hangul-garden.practice.v1';
const basePractice = { choices: {}, drafts: {}, writingDone: {} };
let practiceState = loadPractice();
let practiceLevel = 'all';
const chosenTasks = new Map();

function loadPractice() {
  try {
    return { ...basePractice, ...JSON.parse(localStorage.getItem(practiceKey)) };
  } catch (error) {
    return { ...basePractice };
  }
}

function storePractice() {
  try {
    localStorage.setItem(practiceKey, JSON.stringify(practiceState));
    return true;
  } catch (error) {
    return false;
  }
}

function currentSection() {
  return practiceSections.find(section => section.route === route);
}

function currentTasks(section = currentSection()) {
  return section.tasks.filter(task => practiceLevel === 'all' || String(task.grade) === practiceLevel);
}

function currentTask(section = currentSection()) {
  const visible = currentTasks(section);
  return visible.find(task => task.id === chosenTasks.get(section.route)) || visible[0];
}

function isFinished(task) {
  return Boolean(practiceState.choices[task.id] || practiceState.writingDone[task.id]);
}

function renderPractice() {
  const section = currentSection();
  const tasks = currentTasks(section);
  const task = currentTask(section);
  const completed = tasks.filter(isFinished).length;
  return `<header class="practice-hero">
    <div><h1>韩语专项练习</h1><p>按 3–4 级难度练语法、听力、阅读和写作。</p></div>
    <a class="button outline" href="https://www.topik.go.kr/TWSTDY/TWSTDY0090.do" target="_blank" rel="noopener">TOPIK 官方真题</a>
  </header>
  <nav class="practice-tabs" aria-label="专项练习导航">${practiceSections.map(item => `<a href="#/${item.route}" ${route === item.route ? 'aria-current="page"' : ''}>
    <strong>${item.title}</strong><span>${item.tasks.length} ${item.route === 'grammar' ? '项' : '题'}</span>
  </a>`).join('')}</nav>
  <div class="practice-layout">
    <aside class="panel practice-index" aria-label="${section.title}题目列表">
      <div class="practice-index-header"><div><h2>${section.title}练习</h2><p>${section.hint}</p></div>
        <label class="practice-filter">难度 <select id="practice-level" class="filter">${[['all', '3–4 级'], ['3', '3 级'], ['4', '4 级']].map(([id, label]) => option(id, label, practiceLevel)).join('')}</select></label>
      </div>
      <p class="practice-completion">已完成 ${completed} / ${tasks.length}</p>
      <div class="practice-index-list">${tasks.map((item, index) => `<button class="practice-list-item" data-action="skill-open" data-id="${item.id}" ${task.id === item.id ? 'aria-current="true"' : ''}>
        <span class="practice-position" aria-hidden="true">${isFinished(item) ? '✓' : index + 1}</span>
        <span><strong ${item.id.startsWith('g-') ? 'lang="ko"' : ''}>${safe(item.title)}</strong><small>${item.grade} 级 · ${safe(item.type)}</small></span>
      </button>`).join('')}</div>
      <label class="practice-mobile-picker">题目
        <select id="practice-jump" class="filter">${tasks.map((item, index) => option(item.id, `${index + 1}. ${item.title}${isFinished(item) ? ' ✓' : ''}`, task.id)).join('')}</select>
      </label>
    </aside>
    <article class="panel practice-paper">
      <div class="practice-question-header">
        <div class="practice-meta"><span class="pill">${task.grade} 级</span><span>${safe(task.type)}</span></div>
        <h2 id="practice-title" tabindex="-1" ${route === 'grammar' ? 'lang="ko"' : ''}>${safe(task.title)}</h2>
      </div>
      ${route === 'writing' ? renderWriting(task) : renderChoice(task, section)}
      ${renderTaskPager(task, tasks)}
    </article>
  </div>`;
}

function renderTaskPager(task, tasks) {
  const index = tasks.indexOf(task);
  const prev = tasks[index - 1];
  const next = tasks[index + 1];
  return `<div class="practice-pager"><span>第 ${index + 1} / ${tasks.length} 项</span><div>
    <button class="button outline" data-action="skill-open" ${prev ? `data-id="${prev.id}"` : 'disabled'}>上一项</button>
    <button class="button outline" data-action="skill-open" ${next ? `data-id="${next.id}"` : 'disabled'}>下一项</button>
  </div></div>`;
}

function renderChoice(task, section) {
  const saved = practiceState.choices[task.id];
  const content = {
    grammar: () => `<details class="practice-material" ${saved ? 'open' : ''}><summary>语法要点和例句</summary>
      <p>${safe(task.rule)}</p><p lang="ko">${safe(task.example)}</p><p class="muted">${safe(task.translation)}</p></details>`,
    listening: () => `<section class="practice-material audio-material">
      <div class="audio-top"><strong>听力音频</strong><label>播放速度
        <select id="practice-speed" class="filter"><option value="1">1×</option><option value="0.8">0.8×</option><option value="1.15">1.15×</option></select>
      </label></div>
      <audio id="practice-audio" controls preload="none" aria-label="韩语听力音频" src="audio/${task.id}.mp3"></audio>
      <p class="muted practice-audio-credit">韩语合成音频 · <a href="https://huggingface.co/Supertone/supertonic-3" target="_blank" rel="noopener">Supertonic 3</a></p>
      <p id="practice-audio-error" hidden class="muted">音频无法加载，可使用设备的韩语语音朗读。</p>
      <button class="button outline" id="practice-audio-fallback" data-action="skill-speech" hidden>朗读听力材料</button>
      <details class="practice-transcript" ${saved ? 'open' : ''}><summary>听力原文</summary>
        ${task.lines.map(([speaker, line]) => `<p lang="ko">${task.lines.length > 1 ? `<strong>${speaker === 'F' ? '여자' : '남자'}</strong> ` : ''}${safe(line)}</p>`).join('')}</details>
    </section>`,
    reading: () => `<div class="practice-material practice-passage" lang="ko">${safe(task.passage)}</div>`
  };
  return `${content[section.route]()}
    <form id="practice-choice">
      <fieldset class="practice-choice"><legend lang="ko">${safe(task.prompt)}</legend>
      ${task.options.map((text, index) => {
        const result = !saved ? '' : index === task.answer ? 'correct' : index === saved.choice ? 'incorrect' : '';
        return `<label class="practice-option ${result}">
          <input type="radio" name="choice" value="${index}" ${index === 0 ? 'required' : ''} ${saved ? 'disabled' : ''} ${saved && saved.choice === index ? 'checked' : ''}>
          <span lang="ko">${safe(text)}</span>${result ? `<small>${result === 'correct' ? '正确答案' : '你的选项'}</small>` : ''}
        </label>`;
      }).join('')}</fieldset>
      ${saved ? `<div class="practice-feedback ${saved.choice === task.answer ? 'correct' : 'incorrect'}" tabindex="-1">
        <strong>${saved.choice === task.answer ? '回答正确' : '再看一下解析'}</strong><p>${safe(task.explanation)}</p>
      </div><button class="button outline" type="button" data-action="skill-reset">重做本题</button>`
      : '<button class="button" type="submit">检查答案</button>'}
    </form>`;
}

function charCount(value) {
  return [...value.normalize('NFC').replace(/\r?\n/g, '').trim()].length;
}

function renderWriting(task) {
  const saved = practiceState.drafts[task.id] || {};
  const done = practiceState.writingDone[task.id];
  const fields = task.blanks || ['用韩语作答'];
  return `<div class="practice-material practice-passage" lang="ko">${safe(task.passage)}</div>
    ${task.rows ? `<table class="practice-data-table"><thead><tr>${task.columns.map(column => `<th scope="col">${safe(column)}</th>`).join('')}</tr></thead>
      <tbody>${task.rows.map(([name, ...cells]) => `<tr><th scope="row">${safe(name)}</th>${cells.map(cell => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
    <p class="writing-instructions" id="writing-instructions">${safe(task.instruction)}</p>
    <form id="practice-writing">
      ${fields.map((label, index) => `<label class="writing-field">
        <span>${safe(label)}</span>
        <textarea name="draft-${index}" lang="ko" aria-describedby="writing-instructions" rows="${task.blanks ? 2 : 8}" maxlength="${task.blanks ? 220 : 1400}" required>${safe(saved[index])}</textarea>
      </label>`).join('')}
      <div class="writing-meta">
        <small id="writing-status" role="status">${Object.values(saved).some(Boolean) ? '草稿保存在此浏览器' : ''}</small>
        ${task.range ? `<small><span id="writing-count">${charCount(saved[0] || '')}</span> 字 · 建议 ${task.range.join('–')} 字（含空格）</small>` : ''}
      </div>
      ${!done ? '<button class="button" type="submit">完成并对照参考</button>' : ''}
    </form>
    ${done ? `<section class="practice-feedback writing-reference" tabindex="-1">
      <h3>参考写法</h3>
      ${task.models.map((model, index) => `<p lang="ko">${task.blanks ? `<strong>${index ? '㉡' : '㉠'}</strong> ` : ''}${safe(model)}</p>`).join('')}
      <h3>自查要点</h3><ul>${task.checks.map(item => `<li>${safe(item)}</li>`).join('')}</ul>
      <p class="muted">可以有不同写法，请按要点对照自己的答案。</p>
    </section>` : ''}`;
}

function practiceFocus(selector) {
  const element = main.querySelector(selector);
  if (element) element.focus({ preventScroll: true });
  return element;
}

function openPracticeTask(id, moveFocus = true) {
  const section = currentSection();
  if (!section || !currentTasks(section).some(task => task.id === id)) return;
  chosenTasks.set(section.route, id);
  render();
  if (moveFocus) {
    const title = practiceFocus('#practice-title');
    if (title) title.scrollIntoView({ block: 'nearest' });
  }
}

const practiceActions = {
  'skill-open': ({ id }) => openPracticeTask(id),
  'skill-reset': () => {
    delete practiceState.choices[currentTask().id];
    storePractice();
    render();
    practiceFocus('.practice-option input');
  },
  'skill-speech': () => say(currentTask().lines.map(([, text]) => text).join(' '))
};

function submitPractice(event) {
  const form = event.target;
  if (form.id !== 'practice-choice' && form.id !== 'practice-writing') return;
  event.preventDefault();
  const task = currentTask();
  const response = new FormData(form);
  if (form.id === 'practice-choice') {
    const choice = response.get('choice');
    if (choice === null) return;
    practiceState.choices[task.id] = { choice: Number(choice) };
  } else {
    const values = [...response.values()];
    if (values.some(value => !value.trim())) {
      announce('请先填完答案，再对照参考写法。');
      return;
    }
    const draft = {};
    values.forEach((value, index) => { draft[index] = value; });
    practiceState.drafts[task.id] = draft;
    practiceState.writingDone[task.id] = true;
  }
  const stored = storePractice();
  render();
  if (!stored) announce('浏览器暂时无法保存此记录。');
  const feedback = practiceFocus('.practice-feedback');
  if (feedback) feedback.scrollIntoView({ block: 'nearest' });
}

function updatePracticeDraft(event) {
  const field = event.target;
  if (!field.closest('#practice-writing')) return;
  const task = currentTask();
  const index = field.name.slice('draft-'.length);
  const draft = practiceState.drafts[task.id] || {};
  draft[index] = field.value;
  practiceState.drafts[task.id] = draft;
  const countEl = main.querySelector('#writing-count');
  if (countEl) countEl.textContent = charCount(field.value);
  const statusEl = main.querySelector('#writing-status');
  statusEl.textContent = storePractice() ? '草稿已保存' : '浏览器暂时无法保存草稿';
}

function changePractice(event) {
  const field = event.target;
  if (field.id === 'practice-level') {
    practiceLevel = field.value;
    render();
    practiceFocus('#practice-level');
  } else if (field.id === 'practice-jump') {
    openPracticeTask(field.value, false);
    practiceFocus('#practice-jump');
  } else if (field.id === 'practice-speed') {
    main.querySelector('#practice-audio').playbackRate = Number(field.value);
  }
}

function onPracticeAudioError(event) {
  if (event.target.id !== 'practice-audio') return;
  main.querySelector('#practice-audio-error').hidden = false;
  main.querySelector('#practice-audio-fallback').hidden = false;
}
