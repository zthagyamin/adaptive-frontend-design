import { articles, byId } from './content.mjs';
import { parseRoute, returnTarget, navigationOrigin, visibleFocusId } from './routing.mjs';

const main = document.querySelector('main');
const dialog = document.querySelector('dialog');
const closeImage = document.querySelector('#close-image');
const toast = document.querySelector('#toast');
let rendered = '';
let scrollTimer;
let toastTimer;
let changing = false;
let imageTrigger;
history.scrollRestoration = 'manual';
const makeKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
function readPosition(key) { try { return JSON.parse(sessionStorage.getItem(`shoreline:${key}`)); } catch { return null; } }
function storePosition(focus) {
  if (changing || dialog.open || !history.state?.journal) return;
  const position = { scroll: scrollY, focus: typeof focus === 'string' ? focus : document.activeElement?.id || null };
  try { sessionStorage.setItem(`shoreline:${history.state.key}`, JSON.stringify(position)); } catch { /* Storage can be disabled; in-memory history remains usable. */ }
  history.replaceState({ ...history.state, ...position }, '', location.href);
}
function identifyEntries(kind) {
  main.querySelectorAll('a, button, h1, h2, .prose p').forEach((element, index) => {
    if (!element.id) element.id = `source-${kind.replace(':', '-')}-${index}`;
  });
}
function restoreVisibleFocus(preferred) {
  const elements = [...main.querySelectorAll('a[id], button[id], h1[id], h2[id], .prose p[id]')];
  const candidates = elements.map(element => ({ id: element.id, rect: element.getBoundingClientRect() }));
  const id = visibleFocusId(preferred, candidates, { width: innerWidth, height: innerHeight });
  const element = id ? document.getElementById(id) : main;
  if (!element.matches('a, button, [tabindex]')) element.tabIndex = -1;
  element.focus({ preventScroll: true });
}
if (!history.state?.journal || history.state.path !== (location.hash || '#/')) {
  history.replaceState({ journal: true, key: makeKey(), path: location.hash || '#/', scroll: 0 }, '', location.hash || '#/');
}

const image = (a, cls = '', loading = 'lazy') => `<img class="${cls}" src="./assets/${a.image}" width="1536" height="1024" alt="${a.alt}" loading="${loading}">`;
const articleLink = (a, label = '阅读全文') => `<a class="read-link" href="#/article/${a.id}" id="entry-${a.id}">${label}<span aria-hidden="true">↗</span></a>`;
const figure = a => `<figure class="article-figure"><button class="image-open" id="image-${a.id}" data-image="${a.id}">${image(a, '', 'eager')}<span>近看影像 <b>＋</b></span></button><figcaption>${a.caption}</figcaption></figure>`;

function home() {
  const [tide, forest, rain] = articles;
  return `<section class="cover" aria-labelledby="cover-title"><div class="cover-intro"><p class="eyebrow">一本独立自然写作概念刊物</p><h1 id="cover-title">在细小处<br>停留<span>Notes on paying attention</span></h1><p class="cover-note">从一条退潮的岸线，走到林下，再回到雨后的院子。三个关于观看的故事。</p><a class="contents-link" href="#/contents">翻开第一辑 <span aria-hidden="true">↓</span></a><span class="cover-issue">岸线 · 第一辑<br>秋日阅读 / 3 篇长文</span></div><div class="cover-media"><a href="#/article/tide">${image(tide, '', 'eager')}<div class="cover-story"><span>本期封面故事</span><h2>${tide.title}</h2><p>阅读长文 <span>↗</span></p></div></a><p class="cover-credit">AI 概念影像 · 想象的河口 / 非实地摄影</p></div></section>
  <section class="editor-letter"><p class="eyebrow">写在前面</p><h2>走得更远之前，<br>先看看脚边。</h2><div><p>我们习惯带着目的地出发。这一期，试着把终点暂时搁在一旁：等一会儿潮水，为一截朽木蹲下，或看一片叶子在雨水里转身。</p><p>这些故事来自想象，不是田野记录。文字与影像一起，为一次缓慢的观看腾出地方。</p></div></section>
  <section class="contents" id="contents" tabindex="-1" aria-labelledby="contents-title"><div class="section-heading"><div><p class="eyebrow">第一辑 · 专题目录</p><h2 id="contents-title">三处停留</h2></div><p>潮间 / 林下 / 雨后</p></div><div class="contents-list">${articles.map(a => `<article class="contents-row"><span class="index-number">${a.number}</span><div class="contents-title"><p>${a.category}</p><h3><a href="#/article/${a.id}">${a.title}</a></h3><span>${a.subtitle}</span></div><span class="reading-time">约 ${a.minutes} 分钟</span><a class="thumb-link" href="#/article/${a.id}" aria-label="阅读：${a.title}">${image(a)}</a><a href="#/article/${a.id}" class="row-arrow" aria-label="阅读：${a.title}">↗</a></article>`).join('')}</div></section>
  <section class="field-notes" aria-labelledby="field-title"><div class="field-heading"><p class="eyebrow">再把目光放近一点</p><h2 id="field-title">有些风景，<br>不在远方。</h2><p>一段倒木，一块积水的石头。<br>把日常读得更慢一些。</p></div><article class="field-story forest"> <a href="#/article/forest" aria-label="阅读：${forest.title}">${image(forest)}</a><p>${forest.category}</p><h3><a href="#/article/forest">${forest.title}</a></h3>${articleLink(forest)}</article><article class="field-story rain"><a href="#/article/rain" aria-label="阅读：${rain.title}">${image(rain)}</a><p>${rain.category}</p><h3><a href="#/article/rain">${rain.title}</a></h3>${articleLink(rain)}</article></section>`;
}

function articleView(a) {
  const back = returnTarget(history.state, byId);
  return `<article class="reading" data-article="${a.id}"><div class="reading-top"><a href="${back.href}" data-return class="return-link">← ${back.label}</a><button class="share" data-share="${a.id}">复制文章地址 <span aria-hidden="true">↗</span></button></div><header class="article-header"><p class="eyebrow">第一辑 · ${a.category}</p><h1 tabindex="-1" id="article-title">${a.title}</h1><p class="article-deck">${a.subtitle}</p><div class="byline"><span>${a.author} · 原创虚构散文</span><span>约 ${a.minutes} 分钟</span></div></header>${figure(a)}<div class="reading-layout"><aside class="article-aside"><p>这一篇</p><nav aria-label="文章章节">${a.sections.map((s, i) => `<a href="#section-${i+1}" data-section="section-${i+1}"><span>0${i+1}</span>${s.title}</a>`).join('')}</nav><p class="aside-note">虚构叙事<br>非实地观察或科学资料</p></aside><div class="prose"><p class="article-intro">${a.intro}</p>${a.sections.map((s,i) => `<section id="section-${i+1}"><h2>${s.title}</h2>${s.paragraphs.map(p => `<p>${p}</p>`).join('')}</section>${i === 0 ? `<blockquote>${a.id === 'tide' ? '这个地方的抵达，<br>本来就包含了等待。' : a.id === 'forest' ? '前进的感觉没有消失，<br>只是从脚下移到了眼睛里。' : '小的东西，<br>不需要被放大成壮观。'}</blockquote>` : ''}`).join('')}<div class="end-mark" aria-label="全文完">· 岸线 ·</div><p class="creation-note">创作说明：本文为原创虚构散文，人物、场景与叙述均为文学创作；配图为 AI 概念影像。文字不作为实地观察、物种辨识或科学事实的依据。</p><div class="article-end-actions"><a href="${back.href}" data-return>← ${back.label}</a><button data-share="${a.id}">复制文章地址</button></div></div></div><section class="related" aria-labelledby="related-title"><div class="section-heading"><h2 id="related-title">继续停留</h2><p>本期的另两篇故事</p></div><div class="related-grid">${articles.filter(b => b.id !== a.id).map(b => `<article><a href="#/article/${b.id}" aria-label="阅读：${b.title}">${image(b)}</a><p>${b.category}</p><h3><a href="#/article/${b.id}">${b.title}</a></h3><p>${b.subtitle}</p>${articleLink(b, '继续阅读')}</article>`).join('')}</div></section></article>`;
}

function about() { return `<section class="about"><p class="eyebrow">关于这本概念刊物</p><h1 tabindex="-1" id="about-title">岸线，<br>是一种观看的速度。</h1><div class="about-copy"><p>我们写那些不必去远方寻找的事物：潮水退后的泥岸、路旁的朽木、雨停之后的一汪水。这里的“自然写作”是一种文学尝试，关心人与眼前事物之间的距离，也保留不知道的部分。</p><h2>这是虚构作品</h2><p>本站为完整阅读网站的设计示例，刊名、编辑室、文章与叙述场景均为原创概念创作，不对应真实刊物、人物采访或实地考察。三篇文章的第一人称为文学叙述者，不代表作者具有相应经历。</p><h2>关于影像</h2><p>三幅影像使用内置 ImageGen 生成，分别描绘想象的潮滩、林下朽木与雨后积水石。它们服务于文学意境，均在展示处标记为 AI 概念影像，不冒充真实摄影，也不承担生态知识或物种辨识的证据职责。</p><h2>关于阅读</h2><p>每篇文章都有独立地址，可以复制、直接打开与刷新。近看影像后，关闭即可继续原来的段落；由关联文章进入时，页首与文末会保留回到来源文章的入口。</p><a class="read-link" href="#/contents">回到第一辑目录 <span aria-hidden="true">↗</span></a></div></section>`; }

function render({ initial = false, historyMove = false } = {}) {
  const route = parseRoute(location.hash);
  const a = route.kind === 'article' ? byId[route.id] : null;
  const kind = a ? `article:${a.id}` : ['home', 'contents'].includes(route.kind) ? 'home' : route.kind === 'about' ? 'about' : 'missing';
  const changed = kind !== rendered;
  if (dialog.open && !route.image) dialog.close();
  if (changed) {
    main.innerHTML = kind === 'home' ? home() : a ? articleView(a) : kind === 'about' ? about() : `<section class="not-found"><p class="eyebrow">这一页不在本期目录中</p><h1>不妨从岸边重新开始。</h1><p>文章地址可能有误，三篇完整故事仍在这里。</p><a class="read-link" href="#/contents">查看本期目录 <span>↗</span></a></section>`;
    rendered = kind;
    identifyEntries(kind);
  } else if (a) {
    const back = returnTarget(history.state, byId);
    document.querySelectorAll('[data-return]').forEach(link => { link.href = back.href; link.textContent = `← ${back.label}`; });
  }
  document.title = a ? `${a.title} — 岸线` : kind === 'about' ? '关于岸线 — 岸线' : '岸线 — 在细小处停留';
  document.body.dataset.page = a ? 'article' : kind;
  document.querySelectorAll('.site-header nav a').forEach(link => link.toggleAttribute('aria-current', link.hash === route.path));
  if (route.image && a) {
    document.querySelector('#image-title').textContent = a.title;
    const full = document.querySelector('#full-image'); full.src = `./assets/${a.fullImage || a.image}`; full.alt = a.alt;
    document.querySelector('#image-caption').textContent = a.caption;
    if (!dialog.open) dialog.showModal();
  }
  if (changed || historyMove || initial || route.kind === 'contents') {
    changing = true;
    requestAnimationFrame(() => {
      const saved = readPosition(history.state?.key) || history.state;
      if ((historyMove || initial) && saved?.scroll > 0) scrollTo(0, saved.scroll);
      else if (route.kind === 'contents') document.querySelector('#contents').scrollIntoView();
      else scrollTo(0, 0);
      if (!route.image && !initial) {
        if (historyMove) restoreVisibleFocus(saved?.focus);
        else (a ? document.querySelector('#article-title') : route.kind === 'contents' ? document.querySelector('#contents') : main).focus({ preventScroll: true });
      }
      changing = false;
    });
  }
  if (!route.image && imageTrigger) { document.getElementById(imageTrigger)?.focus({ preventScroll: true }); imageTrigger = null; }
}

function navigate(path, { replace = false, imageMode = false, source } = {}) {
  const scope = source?.closest('.contents') ? 'contents' : source?.closest('.cover') ? 'cover' : null;
  const origin = navigationOrigin(parseRoute(location.hash), history.state.key, source?.id || null, scope);
  // The shared home DOM has distinct cover and directory origins; keep its address truthful.
  if (source && scope && origin.path !== location.hash) history.replaceState({ ...history.state, path: origin.path }, '', origin.path);
  storePosition(source?.id);
  const current = history.state;
  const next = { journal: true, key: makeKey(), path, scroll: imageMode ? scrollY : 0, parentKey: replace ? null : current.key, from: imageMode || replace ? current.from : origin };
  history[replace ? 'replaceState' : 'pushState'](next, '', path);
  render();
}

function dismissImage() {
  if (!dialog.open) return;
  const route = parseRoute(location.hash);
  if (history.state?.parentKey) history.back();
  else navigate(`#/article/${route.id}`, { replace: true });
}
document.addEventListener('click', async event => {
  const imageButton = event.target.closest('[data-image]');
  if (imageButton) { imageTrigger = imageButton.id; navigate(`#/article/${imageButton.dataset.image}/image`, { imageMode: true }); return; }
  const share = event.target.closest('[data-share]');
  if (share) {
    const url = new URL(location.href); url.hash = `/article/${share.dataset.share}`;
    try { await navigator.clipboard.writeText(url.href); toast.textContent = '文章地址已复制'; } catch { toast.textContent = '复制受限，可从地址栏复制文章地址。'; }
    toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500); return;
  }
  const sectionLink = event.target.closest('[data-section]');
  if (sectionLink) { event.preventDefault(); document.getElementById(sectionLink.dataset.section)?.scrollIntoView({ behavior: 'instant' }); return; }
  const link = event.target.closest('a');
  if (link?.getAttribute('href') === '#main') { event.preventDefault(); main.focus(); scrollTo(0,0); return; }
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !link.getAttribute('href')?.startsWith('#/')) return;
  event.preventDefault();
  const path = link.getAttribute('href');
  if (link.hasAttribute('data-return') && returnTarget(history.state, byId).back) { storePosition(); history.back(); return; }
  if (path === location.hash) { if (path === '#/contents') document.querySelector('#contents')?.scrollIntoView(); else scrollTo(0,0); return; }
  navigate(path, { source: link });
});
closeImage.addEventListener('click', dismissImage);
dialog.addEventListener('cancel', event => { event.preventDefault(); dismissImage(); });
dialog.addEventListener('click', event => { if (event.target === dialog) dismissImage(); });
window.addEventListener('popstate', () => render({ historyMove: true }));
window.addEventListener('hashchange', () => {
  // Internal navigation and popstate already rendered; do not overwrite their scroll/focus.
  if (history.state?.path === location.hash) return;
  history.replaceState({ journal: true, key: makeKey(), path: location.hash, scroll: 0 }, '', location.href);
  render();
});
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(storePosition, 100); }, { passive: true });
window.addEventListener('pagehide', storePosition);
render({ initial: true });
