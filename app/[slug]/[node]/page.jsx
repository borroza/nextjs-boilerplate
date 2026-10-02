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
  return { title: page.title, description: page.description }
}

export default function ArticlePage({ params }) {
  const page = getPage('/' + params.slug + '/' + params.node + '/')
  if (!page || page.type !== 'article') return notFound()
  const modelHub = '/' + params.slug + '/'
  return (
    <article>
      <nav className="breadcrumbs">
        <Link href="/">Главная</Link> / <Link href={modelHub}>Kia {params.slug}</Link> / {page.node}
      </nav>
      <h1>{page.h1}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  )
}
