import './globals.css'
import Script from 'next/script'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://kia-gid.vercel.app'),
  title: { default: 'КиаГид — руководство по обслуживанию и ремонту Kia', template: '%s — КиаГид' },
  description: 'Практическое руководство по Kia: замена, диагностика, выбор запчастей и регламенты обслуживания.',
}

function Metrika() {
  const id = 113337961 // КиаГид
  if (!id) return null
  return (
    <Script id="ym" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${id}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });`}
    </Script>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head><Metrika /></head>
      <body>
        <noscript><div><img src="https://mc.yandex.ru/watch/113337961" style={{position:'absolute',left:'-9999px'}} alt="" /></div></noscript>
        <header className="site-header">
          <div className="wrap header-in">
            <a href="/" className="brand">Киа<span className="brand-accent">Гид</span></a>
            <nav>
              <a href="/">Главная</a>
              <a href="/about">О проекте</a><a href="/politics">Политика</a><a href="/contacts">Контакты</a>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <div>© {new Date().getFullYear()} КиаГид — независимое руководство по автомобилям Kia.</div>
            <div>Материалы носят справочный характер. Работы выполняйте по регламенту производителя.</div>
            <div><a href="/about">О проекте</a> · <a href="/about">Как мы готовим материалы</a></div>
          </div>
        </footer>
      </body>
    </html>
  )
}
