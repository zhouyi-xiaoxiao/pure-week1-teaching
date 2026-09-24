(() => {
  'use strict';
  history.scrollRestoration = 'manual';
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const config = document.body.dataset;
  const store = config.storageKey || 'pure-full-library-v1';
  const asset = config.reference || './library-data.json?v=public2';
  let items = [], filter = 'all', selected = 'K1', cn = true, size = 23;
  try {
    const prefs = JSON.parse(localStorage.getItem(store + '-prefs') || '{}');
    cn = prefs.cn !== false;
    size = Math.max(14, Math.min(34, Number(prefs.size) || 23));
    selected = prefs.selected || 'K1';
    localStorage.removeItem(store + '-key');
  } catch {}
  function persist() {
    try { localStorage.setItem(store + '-prefs', JSON.stringify({cn, size, selected})); } catch {}
  }
  function settings() {
    document.body.classList.toggle('hide-cn', !cn);
    $('#cn').textContent = '中文 · ' + (cn ? '开' : '关');
    $('#cn').setAttribute('aria-pressed', String(cn));
    document.documentElement.style.setProperty('--read-size', size + 'px');
    $('#font-size').textContent = size + 'px';
    $('#font-status').textContent = size >= 34 ? '正文 34px：已达到最大字号，A＋暂不可用。可点 A− 缩小，或点“默认”恢复 23px。' : size <= 14 ? '正文 14px：已达到最小字号，A−暂不可用。可点 A＋放大，或点“默认”恢复 23px。' : '正文 ' + size + 'px；A− 缩小，A＋ 放大；“默认”恢复 23px。';
    $('#smaller').disabled = size <= 14;
    $('#larger').disabled = size >= 34;
    persist();
  }
  $('#cn').onclick = () => { cn = !cn; settings(); };
  $('#smaller').onclick = () => { size = Math.max(14, size - 2); settings(); };
  $('#larger').onclick = () => { size = Math.min(34, size + 2); settings(); };
  $('#font-reset').onclick = () => { size = 23; settings(); };
  settings();
  function measureHeader() {
    document.documentElement.style.setProperty('--header-height', $('header').offsetHeight + 'px');
    document.documentElement.style.setProperty('--controls-height', $('.reading-controls').offsetHeight + 'px');
  }
  new ResizeObserver(measureHeader).observe($('header'));
  new ResizeObserver(measureHeader).observe($('.reading-controls'));
  const visible = () => items.filter(item =>
    (filter === 'all' || item.id.startsWith(filter)) &&
    item.search.includes($('#search').value.trim().toLowerCase())
  );
  function choose(id, scroll = true) {
    const item = items.find(item => item.id === id);
    if (!item) return;
    selected = id;
    $('#content').innerHTML = item.html;
    $('#entry-select').value = id;
    all('#entries button').forEach(button => {
      const current = button.dataset.id === id;
      button.classList.toggle('active', current);
      if (current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    const list = visible(), index = list.findIndex(item => item.id === id);
    $('#previous').disabled = index <= 0;
    $('#next-entry').disabled = index < 0 || index >= list.length - 1;
    $('#previous').textContent = index > 0 ? '← ' + list[index - 1].id : '← 上一项';
    $('#next-entry').textContent = list[index + 1] ? list[index + 1].id + ' →' : '下一项 →';
    const solution = $('.solution');
    const sync = () => { $('#answer-toggle').textContent = solution.open ? '收起答案' : '展开答案'; };
    solution.addEventListener('toggle', sync); sync();
    $('#section-jumps').replaceChildren();
    const headings = [
      ['overview', '先看目标'], ['question', id.startsWith('K') ? '概念' : '题目'],
      ['prerequisites', '所需知识'], ['strategy', '怎么想到'], ['solution', '逐步解答'],
      ['alternatives', '其他例子'], ['say', '英文讲法'], ['pitfalls', '易错点']
    ];
    for (const [name, label] of headings) {
      const section = $('#content .' + name);
      if (!section) continue;
      const button = document.createElement('button');
      button.textContent = label;
      button.dataset.anchor = name;
      button.onclick = () => {
        if (name === 'solution') section.open = true;
        section.scrollIntoView({block: 'start', behavior: 'instant'});
      };
      $('#section-jumps').append(button);
    }
    history.replaceState(null, '', '#entry=' + id);
    persist(); measureHeader();
    if (scroll) $('#content').scrollIntoView({block: 'start', behavior: 'instant'});
  }
  function nav() {
    const list = visible();
    $('#count').textContent = `显示 ${list.length} / ${items.length} 项`;
    $('#entries').replaceChildren(); $('#entry-select').replaceChildren();
    for (const item of list) {
      const button = document.createElement('button');
      const number = document.createElement('strong'); number.textContent = item.id;
      const title = document.createElement('span'); title.textContent = item.title;
      button.append(number, title); button.dataset.id = item.id; button.onclick = () => choose(item.id);
      $('#entries').append(button);
      const option = document.createElement('option'); option.value = item.id; option.textContent = item.id + ' · ' + item.title;
      $('#entry-select').append(option);
    }
    if (!list.length) {
      $('#content').innerHTML = '<p class="empty-result">没有匹配的内容。试试题号，或更短的中英文关键词。</p>';
      $('#section-jumps').replaceChildren();
      $('#answer-toggle').disabled = true; $('#previous').disabled = true; $('#next-entry').disabled = true;
      return;
    }
    $('#answer-toggle').disabled = false;
    choose(list.some(item => item.id === selected) ? selected : list[0].id, false);
  }
  $('#search').oninput = nav;
  all('[data-filter]').forEach(button => button.onclick = () => {
    filter = button.dataset.filter;
    all('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    nav();
  });
  $('#entry-select').onchange = event => choose(event.target.value);
  $('#answer-toggle').onclick = () => { $('.solution').open = !$('.solution').open; };
  function move(direction) {
    const list = visible(), index = list.findIndex(item => item.id === selected);
    if (list[index + direction]) choose(list[index + direction].id);
  }
  $('#previous').onclick = () => move(-1);
  $('#next-entry').onclick = () => move(1);
  $('#top').onclick = () => $('#content').scrollIntoView({block: 'start', behavior: 'instant'});
  async function setupOffline() {
    const badge = $('#offline');
    try {
      const registration = await navigator.serviceWorker.register(config.worker || './sw.js', {updateViaCache: 'none'});
      await registration.update(); await navigator.serviceWorker.ready;
      const update = async () => {
        const cached = await caches.match(new URL(asset, location.href));
        badge.textContent = cached ? (navigator.onLine ? '完整资料离线已就绪' : '完整资料离线可用') : '资料已打开，正在准备离线';
        if (cached) badge.dataset.ready = 'true';
      };
      await update(); navigator.serviceWorker.addEventListener('controllerchange', update);
      window.addEventListener('offline', update); window.addEventListener('online', update); setTimeout(update, 1500);
    } catch { badge.textContent = '资料已打开；此浏览器需联网使用'; }
  }
  function readAddress() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get('entry')) selected = params.get('entry');
    if (params.has('key')) history.replaceState(null, '', location.pathname + location.search + '#entry=' + encodeURIComponent(selected));
  }
  readAddress();
  window.addEventListener('hashchange', () => {
    readAddress();
    if (items.length) { filter = 'all'; $('#search').value = ''; all('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all')); nav(); }
  });
  async function load() {
    $('#retry').hidden = true;
    try {
      const response = await fetch(asset);
      if (!response.ok) throw new Error();
      items = await response.json();
      if (!Array.isArray(items) || !items.length) throw new Error();
      $('#load-status').hidden = true; $('#library').hidden = false;
      nav(); window.scrollTo(0, 0); setupOffline();
    } catch {
      $('#load-status p').textContent = '资料暂时未能加载。首次打开请保持联网，然后点“重新加载”。无需账号或访问码。';
      $('#retry').hidden = false;
    }
  }
  $('#retry').onclick = load;
  load();
})();
