import { clamp, chapterAt, smooth } from './math.mjs';

const chapters = [
  { title: 'A line begins<br>with a contour.', body: 'A contour records a boundary. Before anything moves, the complete image gives that boundary a place and a scale.', caption: '01 / Contour study — a stack of cut paper horizons', image: 'contour.svg', alt: 'Original contour illustration: pale paper curves stacked over a deep green horizon.' },
  { title: 'A change reveals<br>the layers.', body: 'As you scroll, the outer image gives way to a closer cut. The layers separate, making the structure behind the contour visible.', caption: '02 / Section study — the hidden spacing between layers', image: 'section.svg', alt: 'Original section illustration: separated orange and pale curved layers show their spacing.' },
  { title: 'Space carries<br>the next thought.', body: 'The final view opens the composition. A mark becomes a field of possibilities, leaving room for the next study to respond to your hand.', caption: '03 / Field study — a contour disperses into many marks', image: 'field.svg', alt: 'Original field illustration: small pale and coral marks disperse around a sweeping contour.' },
];
export function createEffect({ host, reducedMotion }) {
  let reduced = reducedMotion, destroyed = false, raf = 0, current = -1;
  const abort = new AbortController();
  host.innerHTML = `<div class="effect-heading"><div><h2>01 / The shape of a sequence</h2><p>Scroll at your own pace. Stop between views, reverse direction, or jump to a chapter. The page keeps its native scroll.</p></div><div class="effect-tools"><button class="quiet-button" data-reset>Back to beginning ↑</button></div></div><div class="scroll-story"><div class="story-sticky"><div class="story-copy"><p class="story-kicker">FORM NOTES / <span data-number>01</span></p><h3 data-title></h3><p class="story-body"></p><p class="story-caption"></p><nav class="story-progress" aria-label="Sequence chapters">${chapters.map((chapter, index) => `<a href="#chapter-${index + 1}" data-chapter="${index}" aria-label="Chapter ${index + 1}: ${chapter.title.replaceAll('<br>', ' ')}"></a>`).join('')}</nav></div><div class="story-art">${chapters.map(chapter => `<img src="./assets/${chapter.image}" alt="${chapter.alt}" draggable="false">`).join('')}<p class="art-caption">ORIGINAL DIGITAL CUT-PAPER STUDIES</p></div><span class="story-scroll-label">SCROLL TO TURN THE PAGE ↓</span></div></div><div class="static-story-list" hidden>${chapters.map(chapter => `<article><h3>${chapter.title}</h3><p>${chapter.body}</p></article>`).join('')}</div><p class="story-end">The story ends here. Your scroll never belonged to the animation.</p><div class="mechanism-note"><p><strong>Mechanism.</strong> Native document progress directly controls image scale and handoff. A single semantic chapter owns the text, so stopping at a boundary never leaves two paragraphs superimposed.</p><p><strong>Try the edge.</strong> Reverse in the middle, resize the window, or use Page Down. Reduce motion removes the spatial choreography and exposes every chapter as ordinary reading.</p></div>`;
  const story = host.querySelector('.scroll-story'), images = [...host.querySelectorAll('.story-art img')], links = [...host.querySelectorAll('[data-chapter]')];
  const title = host.querySelector('[data-title]'), body = host.querySelector('.story-body'), caption = host.querySelector('.story-caption');
  function showChapter(index) {
    if (current === index) return;
    current = index; const chapter = chapters[index];
    title.innerHTML = chapter.title; body.textContent = chapter.body; caption.textContent = chapter.caption;
    host.querySelector('[data-number]').textContent = `0${index + 1}`;
    links.forEach((link, i) => { if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); });
    images.forEach((image, i) => image.setAttribute('aria-hidden', String(i !== index)));
  }
  function update() {
    raf = 0; if (destroyed) return;
    const bounds = story.getBoundingClientRect(), range = Math.max(1, story.offsetHeight - innerHeight);
    const progress = reduced ? current < 0 ? 0 : current / 2 : clamp(-bounds.top / range);
    showChapter(reduced ? Math.max(0, current) : chapterAt(progress));
    const phase = progress * 3;
    images.forEach((image, i) => {
      const incoming = smooth((phase - i + .34) / .62);
      const outgoing = smooth((phase - i - .66) / .62);
      const opacity = reduced ? Number(i === current) : i === 0 ? 1 - outgoing : i === 2 ? incoming : incoming * (1 - outgoing);
      image.style.opacity = String(opacity);
      image.style.transform = reduced ? 'none' : `translateY(${(i - phase) * 7}%) scale(${1.09 + clamp(phase - i, -.5, 1) * .075})`;
    });
  }
  function queue() { if (!raf && !destroyed) raf = requestAnimationFrame(update); }
  function jump(index) {
    if (reduced) { showChapter(index); update(); return; }
    const top = scrollY + story.getBoundingClientRect().top;
    const range = Math.max(1, story.offsetHeight - innerHeight);
    window.scrollTo({ top: top + (index + .35) / 3 * range, behavior: 'instant' }); queue();
  }
  for (const link of links) link.addEventListener('click', event => { event.preventDefault(); jump(Number(link.dataset.chapter)); }, { signal: abort.signal });
  host.querySelector('[data-reset]').addEventListener('click', () => jump(0), { signal: abort.signal });
  window.addEventListener('scroll', queue, { passive: true, signal: abort.signal });
  window.addEventListener('resize', queue, { passive: true, signal: abort.signal });
  const observer = new ResizeObserver(queue); observer.observe(story);
  function setReducedMotion(value) { reduced = value; story.classList.toggle('is-reduced', reduced); host.querySelector('.static-story-list').hidden = !reduced; update(); }
  showChapter(0); setReducedMotion(reduced);
  return { reset: () => jump(0), setReducedMotion, destroy() { if (destroyed) return; destroyed = true; abort.abort(); observer.disconnect(); cancelAnimationFrame(raf); host.replaceChildren(); } };
}
