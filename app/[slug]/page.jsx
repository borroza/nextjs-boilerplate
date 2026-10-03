import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPage, getChildren, getNodeArticles } from '../../lib/data'

export function generateStaticParams() {
  const pages = require('../../content/pages.json')
  return pages.filter(p => (p.type === 'hub-model' || p.type === 'hub-node') && p.published)
    .map(p => ({ slug: p.url_path.split('/')[1] }))
}

export function generateMetadata({ params }) {
  const page = getPage('/' + params.slug + '/')
  if (!page) return {}
  return {
    title: page.title, description: page.description,
    alternates: { canonical: '/' + params.slug + '/' }
  }
}

export default function HubPage({ params }) {
  const path = '/' + params.slug + '/'
  const page = getPage(path)
  if (!page || page.type === 'article') return notFound()
  const children = page.type === 'hub-model'
    ? getChildren(page.model)
    : getNodeArticles(page.node)
  return (
    <div>
      <nav className="breadcrumbs"><Link href="/">Главная</Link> / {page.title}</nav>
      <h1>{page.h1 || page.title}</h1>
      {page.html ? <article dangerouslySetInnerHTML={{ __html: page.html }} /> :
        <p className="lead">Раздел в наполнении. Ниже — все материалы по теме.</p>}
      {children.length > 0 && (
        <section className="related">
          <h2>Материалы раздела</h2>
          <div className="hub-children">
            {children.map(c => <Link key={c.url_path} href={c.url_path}>{c.title || c.node}</Link>)}
          </div>
        </section>
      )}
    </div>
  )
}
