export default async function handler(req, res) {
  try {
    const fullUrl = req.url || '';
    const urlParts = fullUrl.split('?');
    // Забираем чистый путь (строка)
    const urlPath = urlParts[0]; 

    // Динамически определяем текущий домен сайта
    const currentDomain = req.headers.host || ''; 
    const protocol = currentDomain.includes('localhost') ? 'http' : 'https';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1. УМНАЯ ГЕНЕРАЦИЯ ROBOTS.TXT
    if (urlPath === '/robots.txt') {
      const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${protocol}://${currentDomain}/sitemap.xml`;
      return res.status(200)
                .setHeader('Content-Type', 'text/plain; charset=utf-8')
                .send(robotsTxt);
    }

    // 2. УМНАЯ ГЕНЕРАЦИЯ SITEMAP.XML С SEO-КЭШЕМ
    if (urlPath === '/sitemap.xml') {
      // Шаг А: Узнаем системный ID сайта по текущему домену
      const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id`;
      const siteResponse = await fetch(siteCheckUrl, {
        method: 'GET',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const siteData = await siteResponse.json();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n`;
      // Всегда добавляем главную страницу сайта
      xml += `  <url>\n    <loc>${protocol}://${currentDomain}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

      // Шаг Б: Если сайт найден, вытаскиваем ВСЕ его страницы по site_id
      if (Array.isArray(siteData) && siteData.length > 0) {
        const currentSiteId = siteData[0].id; // Точечно забираем ID из первого элемента массива
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

      // Умный ISR кэш: роботы получают карту сайта за 0.01 сек, а кэш в фоне обновляется при выходе новых статей
      return res.status(200)
                .setHeader('Content-Type', 'application/xml; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=60')
                .send(xml);
    }

    // 3. ОТДАЧА ОБЫЧНОЙ СТАТЬИ ПОЛЬЗОВАТЕЛЮ И РОБОТАМ
    if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
      return res.status(404).send('Not found');
    }

    // Вытаскиваем статью по прямому пути
    const targetUrl = `${supabaseUrl}/rest/v1/pages?url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;

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

    // Забираем чистый HTML-текст статьи
    const htmlContent = data[0].html_content;

    return res.status(200)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
              .send(htmlContent);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}
