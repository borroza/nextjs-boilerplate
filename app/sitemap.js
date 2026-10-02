import pages from '../content/pages.json'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kia-gid.vercel.app'

export default function sitemap() {
  const rows = pages.filter(p => p.published)
  const statics = ['', '/about/'].map(p => ({
    url: BASE + p, lastModified: new Date(), changeFrequency: 'weekly', priority: p === '' ? 1 : 0.5,
  }))
  return statics.concat(rows.map(r => ({
    url: BASE + r.url_path,
    lastModified: r.lastmod ? new Date(r.lastmod) : new Date(),
    changeFrequency: 'monthly',
    priority: r.url_path.split('/').filter(Boolean).length === 1 ? 0.8 : 0.6,
  })))
}
