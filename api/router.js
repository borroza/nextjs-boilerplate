export default async function handler(req, res) {
  try {
    const fullUrl = req.url || '';
    const urlParts = fullUrl.split('?');
    let urlPath = urlParts[0]; 

    // Нормализуем путь
    if (urlPath.endsWith('/') && urlPath.length > 1) {
      urlPath = urlPath.slice(0, -1);
    }

    const currentDomain = req.headers.host || ''; 
    const protocol = currentDomain.includes('localhost') ? 'http' : 'https';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1. ОТДАЧА ROBOTS.TXT
    if (urlPath === '/robots.txt') {
      const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${protocol}://${currentDomain}/sitemap.xml`;
      return res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').send(robotsTxt);
    }

    // 2. ОТДАЧА SITEMAP.XML
    if (urlPath === '/sitemap.xml') {
      const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id`;
      const siteResponse = await fetch(siteCheckUrl, {
        method: 'GET',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const siteData = await siteResponse.json();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n`;
      xml += `  <url>\n    <loc>${protocol}://${currentDomain}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

      if (Array.isArray(siteData) && siteData.length > 0) {
        const currentSiteId = siteData[0].id;
        const pagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&select=url_path,created_at&limit=50000`;
        
        const pagesResponse = await fetch(pagesUrl, {
          method: 'GET',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const pagesData = await pagesResponse.json();

        if (Array.isArray(pagesData)) {
          pagesData.forEach(page => {
            const fixedPath = page.url_path.startsWith('/') ? page.url_path : `/${page.url_path}`;
            const date = page.created_at ? page.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
            xml += `  <url>\n    <loc>${protocol}://${currentDomain}${fixedPath}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
          });
        }
      }
      xml += `</urlset>`;
      return res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=60').send(xml);
    }

    // Получаем ID сайта из базы
    const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id,site_title,site_icon`;
    const siteResponse = await fetch(siteCheckUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const siteData = await siteResponse.json();
    
    if (!Array.isArray(siteData) || siteData.length === 0) {
      return res.status(404).send('Site not configured in Supabase.');
    }
    const currentSiteId = siteData[0].id;
    const siteTitle = siteData[0].site_title;
    const siteIcon = siteData[0].site_icon || '🛠️';

    // 3. СБОРКА СТРАНИЦЫ КАТЕГОРИИ НА ЛЕТУ С ПАРСИНГОМ ТЕКСТА
    const isCategoryPath = urlPath.startsWith('/category/') || (!urlPath.includes('.') && urlPath !== '/');
    
    if (isCategoryPath) {
      const currentCategorySlug = urlPath.replace('/category/', '').replace('/', '');

      // Тянем url_path и контент, чтобы вытащить H1 и описание
      const categoryPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategorySlug)}&select=url_path,html_content`;
      const catResponse = await fetch(categoryPagesUrl, {
        method: 'GET',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const catPages = await catResponse.json();

      if (!Array.isArray(catPages) || catPages.length === 0) {
        return res.status(404)
                  .setHeader('Content-Type', 'text/html; charset=utf-8')
                  .send(`<h1>404 Рубрика пуста</h1><p>В категории <b>${currentCategorySlug}</b> пока нет материалов.</p>`);
      }

      const formattedCatTitle = currentCategorySlug.split('-').join(' ').toUpperCase();

      // HTML структура с готовыми классами под ваш будущий CSS
      let categoryHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formattedCatTitle} | ${siteTitle}</title>
    <!-- Сюда вы потом подключите ваш общий файл стилей, например: -->
    <!-- <link rel="stylesheet" href="/style.css"> -->
</head>
<body>
    <header class="site-header">
        <div class="nav-container">
            <a href="/" class="logo"><span>${siteIcon}</span> ${siteTitle}</a>
        </div>
    </header>
    <div class="breadcrumbs">
        <a href="/">Главная</a> / <span>${formattedCatTitle}</span>
    </div>
    <main class="category-main">
        <div class="category-header">
            <h1>Рубрика: ${formattedCatTitle}</h1>
            <p>Список опубликованных материалов в данном разделе сайта.</p>
        </div>
        <div class="articles-grid">`;

      // Генерируем карточки, парся заголовки и анонсы с помощью регулярных выражений
      catPages.forEach(page => {
        let title = 'Читать статью';
        let description = 'Разбираем особенности, даем практические советы и инструкции в детальном обзоре...';
        
        const html = page.html_content || '';

        // 1. Ищем первый тег <h1> для заглавия анонса
        if (html.includes('<h1')) {
          const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          if (matchH1 && matchH1[1]) {
            title = matchH1[1].replace(/<[^>]*>/g, '').trim(); // Вырезаем внутренние теги, если они есть
          }
        }

        // 2. Ищем первый тег <p> для описания анонса
        if (html.includes('<p')) {
          const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          if (matchP && matchP[1]) {
            const cleanP = matchP[1].replace(/<[^>]*>/g, '').trim();
            if (cleanP.length > 10) {
              // Обрезаем до 180 символов, чтобы анонс выглядел аккуратно
              description = cleanP.length > 180 ? cleanP.substring(0, 180) + '...' : cleanP;
            }
          }
        }

        const fixedPath = page.url_path.startsWith('/') ? page.url_path : `/${page.url_path}`;
        
        // Разметка карточки. Вы сможете оформить ее стилями через класс .article-card, .card-title и .card-description
        categoryHtml += `
            <article class="article-card">
                <h2 class="card-title"><a href="${fixedPath}">${title}</a></h2>
                <p class="card-description">${description}</p>
            </article>`;
      });

      categoryHtml += `
        </div>
    </main>
</body>
</html>`;

      return res.status(200)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=600')
                .send(categoryHtml);
    }

    // 4. ОТДАЧА ОБЫЧНОЙ СТАТЬИ ПОЛЬЗОВАТЕЛЮ
    if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
      return res.status(404).send('Not found');
    }

    const targetUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send('<h1>404 Страница не найдена</h1><p>Этого URL еще нет в базе Supabase.</p>');
    }

    return res.status(200)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
              .send(data[0].html_content);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}
