export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return { kind: 'home', path: '#/' };
  if (parts.length === 1 && ['contents', 'about'].includes(parts[0])) return { kind: parts[0], path: `#/${parts[0]}` };
  if (parts[0] === 'article' && parts[1] && parts.length <= 3 && (!parts[2] || parts[2] === 'image')) return { kind: 'article', id: parts[1], image: parts[2] === 'image', path: `#/article/${parts[1]}${parts[2] ? '/image' : ''}` };
  return { kind: 'missing', path: hash };
}

export function returnTarget(state, byId) {
  const from = state?.from;
  if (from?.id && byId[from.id]) return { href: `#/article/${from.id}`, label: `返回《${byId[from.id].title}》`, back: Boolean(state.parentKey && state.parentKey === from.key) };
  const target = from?.kind === 'cover' ? { href: '#/', label: '返回本期封面' }
    : from?.kind === 'home' ? { href: '#/', label: '返回刊物首页' }
    : from?.kind === 'about' ? { href: '#/about', label: '返回关于岸线' }
    : { href: '#/contents', label: '返回本期目录' };
  return { ...target, back: Boolean(state?.parentKey && state.parentKey === from?.key) };
}

export function navigationOrigin(route, key, entry, scope) {
  if (route.kind === 'article') return { kind: 'article', id: route.id, key, entry, path: `#/article/${route.id}` };
  const kind = scope === 'contents' ? 'contents' : scope === 'cover' ? 'cover' : route.kind;
  const path = kind === 'contents' ? '#/contents' : kind === 'about' ? '#/about' : '#/';
  return { kind, key, entry, path };
}

// Rectangles are measured after scroll restoration, so stale offscreen focus cannot win.
export function visibleFocusId(preferred, candidates, viewport) {
  const visible = candidates.filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.bottom > 8 && rect.top < viewport.height - 8 && rect.right > 0 && rect.left < viewport.width);
  return visible.find(candidate => candidate.id === preferred)?.id
    || visible.find(candidate => candidate.rect.top >= 0 && candidate.rect.bottom <= viewport.height)?.id
    || visible[0]?.id || null;
}
