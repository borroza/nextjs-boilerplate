import './globals.css'
import Script from 'next/script'

export const metadata = {
  metadataBase: new URL('https://kia-gid.vercel.app'),
  title: { default: 'КиаГид — руководство по Kia', template: '%s' },
  description: 'Практические инструкции по обслуживанию и ремонту автомобилей Kia: что ломается, как проверить, как заменить и сколько это стоит.',
  alternates: { canonical: '/' },
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔧</text></svg>" },
  openGraph: { type: 'website', siteName: 'КиаГид', locale: 'ru_RU' }
}

function Metrika() {
  return (
    <Script id="ym" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(113337961, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });`}
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
              <a href="/about">О проекте</a>
              <a href="/politics">Политика</a>
              <a href="/contacts">Контакты</a>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <div>© {new Date().getFullYear()} КиаГид — независимое руководство по автомобилям Kia.</div>
            <div>Материалы носят справочный характер. Работы выполняйте по регламенту производителя.</div>
            <div><a href="/about">О проекте</a> · <a href="/politics">Политика</a> · <a href="/contacts">Контакты</a></div>
          </div>
        </footer>
      </body>
    </html>
  )
}
