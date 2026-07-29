export default async function handler(req, res) {
  try {
    const fullUrl = req.url || '';
    const urlParts = fullUrl.split('?');
    const urlPath = urlParts[0]; // Строго берем чистый путь

    // Текущий домен из запроса
    const currentDomain = req.headers.host; 
    const protocol = currentDomain.includes('localhost') ? 'http' : 'https';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1. ОТДАЧА ROBOTS.TXT
    if (urlPath === '/robots.txt') {
      const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${protocol}://${currentDomain}/sitemap.xml`;
      return res.status(200)
                .setHeader('Content-Type', 'text/plain; charset=utf-8')
                .send(robotsTxt);
    }

    // 2. ОТДАЧА SITEMAP.XML
    if (urlPath === '/sitemap.xml') {
      const targetUrl = `${supabaseUrl}/rest/v1/pages?sites!inner(domain)=eq.${encodeURIComponent(currentDomain)}&select=url_path,created_at`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      
      const data = await response.json();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n`;
      xml += `  <url>\n    <loc>${protocol}://${currentDomain}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

      if (Array.isArray(data)) {
        data.forEach(page => {
          const fixedPath = page.url_path.startsWith('/') ? page.url_path : `/${page.url_path}`;
          const date = page.created_at ? page.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

          xml += `  <url>\n    <loc>${protocol}://${currentDomain}${fixedPath}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });
      }

      xml += `</urlset>`;

      return res.status(200)
                .setHeader('Content-Type', 'application/xml; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
                .send(xml);
    }

    // 3. ОТДАЧА ОБЫЧНОЙ СТАТЬИ ПОЛЬЗОВАТЕЛЮ
    if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
      return res.status(404).send('Not found');
    }

    // Ищем статью по url_path (прямой и самый надежный запрос)
    const targetUrl = `${supabaseUrl}/rest/v1/pages?url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    const data = await response.json();

    // Проверяем, что база вернула массив и в нём есть хотя бы одна строка
    if (!Array.isArray(data) || data.length === 0 || !data[0]) {
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send('<h1>404 Страница не найдена</h1><p>Этого URL еще нет в базе Supabase.</p>');
    }

    // ИСПРАВЛЕНО: Безопасно забираем html_content из первого элемента массива
    const htmlContent = data[0].html_content;

    return res.status(200)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
              .send(htmlContent);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}
