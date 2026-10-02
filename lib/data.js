import pages from '../content/pages.json'

const byPath = Object.fromEntries(pages.map(p => [p.url_path, p]))

export function getPage(path) {
  const p = byPath[path]
  return p && p.published ? p : null
}

export function getChildren(model) {
  return pages.filter(p => p.type === 'article' && p.model === model && p.published)
    .map(p => ({ url_path: p.url_path, title: p.title, node: p.node, gen: p.gen }))
}

export function getNodeArticles(node) {
  return pages.filter(p => p.type === 'article' && p.node === node && p.published)
    .map(p => ({ url_path: p.url_path, title: p.title, model: p.model, gen: p.gen }))
}

export function getHubs() {
  return pages.filter(p => (p.type === 'hub-model' || p.type === 'hub-node') && p.published)
    .map(p => ({ url_path: p.url_path, title: p.title, model: p.model, node: p.node, type: p.type }))
}

export function getAllPages() {
  return pages.filter(p => p.published)
}
