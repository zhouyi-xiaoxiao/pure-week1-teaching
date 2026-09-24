"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  let catalog = null;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const localLink = (path) => {
    if (typeof path !== "string" || path.startsWith("/") || path.includes("..") || /^[a-z][a-z\d+.-]*:/i.test(path)) throw new Error("Invalid catalog path");
    const url = new URL(path, location.href);
    if (url.origin !== location.origin) throw new Error("External catalog path");
    return escape(path);
  };
  function lessonCard(course, term, week) {
    const date = new Date(week.date + "T12:00:00Z").toLocaleDateString("zh-CN", {month:"long",day:"numeric",weekday:"long",timeZone:"Europe/London"});
    return `<article class="lesson-card"><div class="card-main"><div class="course-label">${escape(course.title)} · ${escape(course.code)}</div><p class="course-en" lang="en">${escape(course.titleEn)}</p><h2>${escape(week.title)}</h2><div class="meta"><span>${escape(term.title)}</span><time datetime="${escape(week.date)}">${escape(date)}</time><span>${escape(week.durationMinutes)} 分钟课堂流程</span><span class="ready">● 已准备</span></div><ul class="topics" aria-label="主要知识点">${week.topics.map((topic) => `<li>${escape(topic)}</li>`).join("")}</ul></div><div class="card-actions"><a class="action primary" href="${localLink(week.script)}">打开授课讲稿</a><a class="action secondary" href="${localLink(week.reference)}">完整备课资料</a></div></article>`;
  }
  function render() {
    if (!catalog) return;
    const search = $("search").value.trim().toLocaleLowerCase();
    const courseId = $("course").value;
    const results = [];
    for (const course of catalog.courses) {
      if (courseId !== "all" && course.id !== courseId) continue;
      for (const term of course.terms) for (const week of term.weeks) {
        if (week.status !== "ready") continue;
        const haystack = [course.title,course.titleEn,course.code,term.title,week.title,...week.topics].join(" ").toLocaleLowerCase();
        if (!search || haystack.includes(search)) results.push(lessonCard(course,term,week));
      }
    }
    $("lessons").innerHTML = results.length ? results.join("") : '<p class="empty">没有匹配的已准备资料。试试课程代码、知识点，或清除筛选。</p>';
    $("result-status").textContent = `找到 ${results.length} 节已准备的教程`;
  }
  async function load() {
    $("load-error").hidden = true;
    $("result-status").textContent = "正在读取课程目录…";
    try {
      const response = await fetch("teaching-catalog.json", {cache:"no-cache"});
      if (!response.ok) throw new Error("Catalog unavailable");
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.courses)) throw new Error("Unsupported catalog");
      catalog = data;
      $("course").innerHTML = '<option value="all">全部课程</option>' + catalog.courses.map((course) => `<option value="${escape(course.id)}">${escape(course.title)} · ${escape(course.code)}</option>`).join("");
      $("updated").textContent = `目录更新：${catalog.updated}`;
      render();
    } catch (_) {
      catalog = null;
      $("lessons").innerHTML = "";
      $("result-status").textContent = "目录暂时不可用";
      $("load-error").hidden = false;
    }
  }
  $("course").addEventListener("change", render);
  $("search").addEventListener("input", render);
  $("clear").addEventListener("click", () => { $("course").value = "all"; $("search").value = ""; render(); });
  $("retry").addEventListener("click", load);
  load();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async registration=>{await registration.update();await navigator.serviceWorker.ready;const sync=async()=>{if(await caches.match(new URL('teaching-catalog.json',location.href))){$('hub-offline').textContent='课程资料离线已就绪';$('hub-offline').dataset.ready='true';}};await sync();navigator.serviceWorker.addEventListener('controllerchange',sync);setTimeout(sync,1500);}).catch(()=>{$('hub-offline').textContent='当前浏览器需联网使用';});
})();
