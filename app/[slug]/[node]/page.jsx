import { notFound } from 'next/navigation'
import { getPage } from '../../../lib/data'
import Link from 'next/link'

export function generateStaticParams() {
  const pages = require('../../../content/pages.json')
  return pages.filter(p => p.type === 'article' && p.published)
    .map(p => ({ slug: p.url_path.split('/')[1], node: p.url_path.split('/')[2] }))
}

export function generateMetadata({ params }) {
  const page = getPage('/' + params.slug + '/' + params.node + '/')
  if (!page) return {}
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: '/' + params.slug + '/' + params.node + '/' },
    openGraph: { title: page.title, description: page.description, type: 'article', locale: 'ru_RU' }
  }
}

export default function ArticlePage({ params }) {
  const page = getPage('/' + params.slug + '/' + params.node + '/')
  if (!page || page.type !== 'article') return notFound()
  const modelHub = '/' + params.slug + '/'
  return (
    <article>
      <nav className="breadcrumbs">
        <Link href="/">Главная</Link> / <Link href={modelHub}>Kia {params.slug.replace(/-/g, ' ')}</Link> / {page.node}
      </nav>
      <h1>{page.h1}</h1>
      {(() => {
        const h2s = [...page.html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(m => m[1])
        if (h2s.length < 3) return null
        return (
          <details className="article-toc"><summary>Содержание</summary>
            <nav><ul>{h2s.map((h, i) => <li key={i}><a href={'#section-' + i}>{h}</a></li>)}</ul></nav>
          </details>
        )
      })()}
      <div dangerouslySetInnerHTML={{ __html: page.html.replace(/<h2[^>]*>/g, (m, o) => m) }} />
    </article>
  )
}
