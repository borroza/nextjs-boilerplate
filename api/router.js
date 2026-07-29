export default async function handler(req, res) {
  // Универсальная функция, которая выводит ТОЧНУЮ копию фирменной страницы 404 Vercel
  const sendVercel404 = () => {
    const requestId = `arn1::fbm7g-${Date.now()}-${Math.random().toString(16).substring(2, 10)}`;
    const vercelHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404: NOT_FOUND</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#000;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}ul{list-style-type:none;padding:0}.container{max-width:500px;text-align:center;padding:20px;border:1px solid #eaeaea;border-radius:5px}h1{font-size:24px;font-weight:500;margin-top:0;margin-bottom:20px;border-bottom:1px solid #eaeaea;padding-bottom:20px}p{font-size:14px;color:#666;margin:10px 0;text-align:left}code{font-family:monospace;background:#fafafa;padding:3px 5px;border-radius:3px;border:1px solid #eaeaea}a{color:#0070f3;text-decoration:none;font-size:14px}a:hover{text-decoration:underline}</style></head><body><div class="container"><h1>404: NOT_FOUND</h1><p>Code: <code>"NOT_FOUND"</code></p><p>ID: <code>"${requestId}"</code></p><br><a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Read our documentation to learn more about this error.</a></div></body></html>`;
    return res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(vercelHtml);
  };

  try {
    const fullUrl = req.url || '';
    
    // Защита от дублей
    if (fullUrl.includes('//')) {
      return sendVercel404();
    }

    const urlParts = fullUrl.split('?');
    let urlPath = urlParts[0]; 

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

    // Получаем инфо о сайте
    const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id,site_title,site_icon`;
    const siteResponse = await fetch(siteCheckUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const siteData = await siteResponse.json();
    
    if (!Array.isArray(siteData) || siteData.length === 0) {
      return sendVercel404();
    }
    const currentSiteId = siteData[0].id;
    const siteTitle = siteData[0].site_title;
    const siteIcon = siteData[0].site_icon || '🛠️';

    // 3. СТРОГАЯ СБОРКА КАТЕГОРИИ
    if (urlPath.startsWith('/category/')) {
      const currentCategorySlug = urlPath.replace('/category/', '');

      if (!currentCategorySlug) {
        return sendVercel404();
      }

      const categoryTitles = {
        'avtomobil': 'Автомобили',
        'standarty-topliva': 'Стандарты топлива',
        'generator': 'Ремонт генератора',
        'podveska': 'Подвеска и ходовая'
      };

      let russianCategoryTitle = categoryTitles[currentCategorySlug.toLowerCase()];
      if (!russianCategoryTitle) {
        const rawTitle = currentCategorySlug.split('-').join(' ');
        russianCategoryTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
      }

      const categoryPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategorySlug)}&select=url_path,html_content`;
      const catResponse = await fetch(categoryPagesUrl, {
        method: 'GET',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const catPages = await catResponse.json();

      if (!Array.isArray(catPages) || catPages.length === 0) {
        return sendVercel404();
      }

      let categoryHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${russianCategoryTitle} | ${siteTitle}</title></head><body><header class="site-header"><div class="nav-container"><a href="/" class="logo"><span>${siteIcon}</span> ${siteTitle}</a></div></header><div class="breadcrumbs"><a href="/">Главная</a> / <span>${russianCategoryTitle}</span></div><main class="category-main"><div class="category-header"><h1>${russianCategoryTitle}</h1><p>Список опубликованных материалов в данном разделе сайта.</p></div><div class="articles-grid">`;

      catPages.forEach(page => {
        let title = 'Читать статью';
        let description = 'Разбираем особенности, даем практические советы и инструкции в детальном обзоре...';
        const html = page.html_content || '';

        if (html.includes('<h1')) {
          const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          if (matchH1 && matchH1[1]) title = matchH1[1].replace(/<[^>]*>/g, '').trim();
        }

        if (html.includes('<p')) {
          const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          if (matchP && matchP[1]) {
            const cleanP = matchP[1].replace(/<[^>]*>/g, '').trim();
            if (cleanP.length > 10) {
              if (cleanP.length > 190) {
                const subStr = cleanP.substring(0, 190);
                const lastDotIndex = subStr.lastIndexOf('.');
                if (lastDotIndex > 40) description = subStr.substring(0, lastDotIndex + 1);
                else {
                  const lastSpaceIndex = subStr.lastIndexOf(' ');
                  description = subStr.substring(0, lastSpaceIndex) + '.';
                }
              } else description = cleanP.endsWith('.') ? cleanP : cleanP + '.';
            }
          }
        }

        const fixedPath = page.url_path.startsWith('/') ? page.url_path : `/${page.url_path}`;
        categoryHtml += `<article class="article-card"><h2 class="card-title"><a href="${fixedPath}">${title}</a></h2><p class="card-description">${description}</p></article>`;
      });

      categoryHtml += `</div></main></body></html>`;
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=600').send(categoryHtml);
    }

    // Если это путь без расширения и не главная, отдаем Vercel 404
    if (!urlPath.includes('.') && urlPath !== '/') {
      return sendVercel404();
    }

    // Блокируем явный системный мусор
    const systemExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.ico', '.svg', '.json'];
    const hasSystemExtension = systemExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
    if (hasSystemExtension) {
      return sendVercel404();
    }

    // 4. ОТДАЧА СТАТЬИ ИЗ БАЗЫ
    const targetUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return sendVercel404();
    }

    const htmlContent = data[0].html_content;
    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600').send(htmlContent);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}
