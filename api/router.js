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
    let urlPath = urlParts[0]; // Чистый путь

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

    // 2. УМНАЯ ГЕНЕРАЦИЯ SITEMAP.XML
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
        const pagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&select=url_path,category_slug,created_at&order=created_at.desc&limit=50000`;
        
        const pagesResponse = await fetch(pagesUrl, {
          method: 'GET',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const pagesData = await pagesResponse.json();

        if (Array.isArray(pagesData) && pagesData.length > 0) {
          const latestDate = pagesData[0].created_at ? pagesData[0].created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          xml += `  <url>\n    <loc>${protocol}://${currentDomain}/</loc>\n    <lastmod>${latestDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

          const uniqueCategories = new Set();
          pagesData.forEach(page => {
            if (page.category_slug && page.category_slug.trim() !== '') {
              uniqueCategories.add(page.category_slug.trim().toLowerCase());
            }
          });

          uniqueCategories.forEach(catSlug => {
            xml += `  <url>\n    <loc>${protocol}://${currentDomain}/category/${catSlug}</loc>\n    <lastmod>${latestDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
          });

          pagesData.forEach(page => {
            const fixedPath = page.url_path.startsWith('/') ? page.url_path : `/${page.url_path}`;
            const date = page.created_at ? page.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
            xml += `  <url>\n    <loc>${protocol}://${currentDomain}${fixedPath}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
          });
        } else {
          const today = new Date().toISOString().split('T')[0];
          xml += `  <url>\n    <loc>${protocol}://${currentDomain}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        }
      }
      xml += `</urlset>`;
      return res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=60').send(xml);
    }

    // Получаем инфо о сайте
    const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id,site_title,site_icon,css_content`;
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
    const siteIcon = siteData[0].site_icon || '🛠';
    const siteCss = siteData[0].css_content || '';

    // ДИНАМИЧЕСКАЯ ОТДАЧА СТИЛЕЙ КУДА ССЫЛАЕТСЯ HTML СТАТЬИ ⚡
    if (urlPath === '/static/css/style.css') {
      return res.status(200)
                .setHeader('Content-Type', 'text/css; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
                .send(siteCss);
    }

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

          // НАСТРОЙКА ПАГИНАЦИИ (заменяет старую строку 132)
    const PAGE_SIZE = 20; 
    const urlObj = new URL(req.url, `http://${currentDomain}`);
    const page = parseInt(urlObj.searchParams.get('page')) || 1;
    const offset = (page - 1) * PAGE_SIZE;

    const categoryPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategorySlug)}&select=url_path,html_content&limit=${PAGE_SIZE}&offset=${offset}`;
    
    const catResponse = await fetch(categoryPagesUrl, {
      method: 'GET',
      headers: { 
        'apikey': supabaseKey, 
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact' 
      }
    });
    const catPages = await catResponse.json();

    if (!Array.isArray(catPages) || catPages.length === 0) {
      return sendVercel404();
    }

    const contentRange = catResponse.headers.get('content-range') || '';
    const totalCount = contentRange.includes('/') ? parseInt(contentRange.split('/')[1]) : catPages.length;

    // Внедряем инлайновые стили ${siteCss} вместо ломающегося файла стилей
    let categoryHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${russianCategoryTitle} | ${siteTitle}</title><style>${siteCss}</style></head><body><header class="site-header"><div class="nav-container"><a href="/" class="logo"><span>${siteIcon}</span> ${siteTitle}</a></div></header><div class="breadcrumbs"><a href="/">Главная</a> / <span>${russianCategoryTitle}</span></div><main class="category-main"><div class="category-header"><h1>${russianCategoryTitle}</h1><p>Список опубликованных материалов в данном разделе сайта (Всего: ${totalCount}).</p></div><div class="articles-grid">`;

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

    // Отрисовка кнопок переключения страниц
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    if (totalPages > 1) {
      categoryHtml += `</div><div class="pagination" style="display: flex; gap: 8px; justify-content: center; margin: 30px 0; clear: both;">`;
      for (let i = 1; i <= totalPages; i++) {
        const isCurrent = i === page;
        categoryHtml += `<a href="?page=${i}" style="padding: 8px 16px; border: 1px solid #eaeaea; text-decoration: none; color: ${isCurrent ? '#fff' : '#0070f3'}; background: ${isCurrent ? '#0070f3' : '#fff'}; border-radius: 5px; font-weight: 500;">${i}</a>`;
      }
    }

    categoryHtml += `</div></main></body></html>`;

      
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=600').send(categoryHtml);
    }

    // Если это путь без расширения и не главная, отдаем Vercel 404
    if (!urlPath.includes('.') && urlPath !== '/') {
      return sendVercel404();
    }

      // Блокируем явный системный мусор
    const systemExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.js', '.ico', '.svg', '.json'];
    const hasSystemExtension = systemExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
    if (hasSystemExtension) {
      return sendVercel404();
    }

    // 4. ОТДАЧА СТАТЬИ ИЗ БАЗЫ
    // Скачиваем саму статью
    const targetUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return sendVercel404();
    }

    let htmlContent = data[0].html_content;

    // ВАЖНО: Параллельно скачиваем из базы названия и пути ВСЕХ статей этого сайта для мгновенного поиска
    const allPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&select=url_path,html_content&limit=1000`;
    const allPagesResponse = await fetch(allPagesUrl, {
      method: 'GET',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const allPagesData = await allPagesResponse.json();

    let searchDatabase = [];
    if (Array.isArray(allPagesData)) {
      allPagesData.forEach(p => {
        // Забираем только статьи, пропускаем служебные страницы
        if (p.url_path.includes('.') || p.url_path.endsWith('.html')) {
          let title = p.url_path;
          // Пытаемся вытащить реальный русский заголовок H1 статьи для красивого вывода в поиске
          if (p.html_content && p.html_content.includes('<h1')) {
            const matchH1 = p.html_content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            if (matchH1 && matchH1[1]) {
              title = matchH1[1].replace(/<[^>]*>/g, '').trim();
            }
          }
          searchDatabase.push({ name: title, path: p.url_path });
        }
      });
    }

    // Внедряем JavaScript-скрипт с уже готовой базой статей внутри
    const jsScripts = `
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        // 1. Плавный скролл содержания по заголовкам H2
        const contentLinks = document.querySelectorAll('details ol li a[href^="#"]');
        const articleHeaders = document.querySelectorAll('.article-body h2, .article h2, article h2');

        contentLinks.forEach((anchor, index) => {
          anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetElement = articleHeaders[index];
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              const targetId = this.getAttribute('href').substring(1);
              window.history.pushState(null, null, '#' + targetId);
            }
          });
        });

        // База данных для поиска, сгенерированная сервером на лету
        const allArticles = ${JSON.stringify(searchDatabase)};

        // 2. ЖИВОЙ ВЫПАДАЮЩИЙ ПОИСК
        const searchInput = document.getElementById('globalSearchInput') || document.querySelector('input[type="search"]');
        const searchDropdown = document.getElementById('globalSearchDropdown') || document.querySelector('.search-dropdown');

        if (searchInput && searchDropdown) {
          searchDropdown.style.display = 'none';
          searchDropdown.style.position = 'absolute';
          searchDropdown.style.backgroundColor = '#fff';
          searchDropdown.style.border = '1px solid #e2e8f0';
          searchDropdown.style.borderRadius = '8px';
          searchDropdown.style.width = searchInput.offsetWidth + 'px';
          searchDropdown.style.maxHeight = '300px';
          searchDropdown.style.overflowY = 'auto';
          searchDropdown.style.zIndex = '999';
          searchDropdown.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';

          searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            searchDropdown.innerHTML = '';
            
            if (query.length < 2) {
              searchDropdown.style.display = 'none';
              return;
            }

            const filtered = allArticles.filter(art => art.name.toLowerCase().includes(query)).slice(0, 5);

            if (filtered.length > 0) {
              filtered.forEach(art => {
                const item = document.createElement('a');
                item.href = art.path.startsWith('/') ? art.path : '/' + art.path;
                item.className = 'search-item';
                item.style.display = 'block';
                item.style.padding = '10px 15px';
                item.style.color = '#1e293b';
                item.style.textDecoration = 'none';
                item.style.borderBottom = '1px solid #f1f5f9';
                item.style.fontSize = '14px';
                item.innerHTML = '📄 ' + art.name;
                
                item.addEventListener('mouseover', () => item.style.backgroundColor = '#f1f5f9');
                item.addEventListener('mouseout', () => item.style.backgroundColor = '#fff');
                
                searchDropdown.appendChild(item);
              });
              searchDropdown.style.display = 'block';
            } else {
              searchDropdown.innerHTML = '<div style="padding: 10px 15px; color: #64748b; font-size: 14px;">Ничего не найдено</div>';
              searchDropdown.style.display = 'block';
            }
          });

          document.addEventListener('click', function(e) {
            if (e.target !== searchInput && e.target !== searchDropdown) {
              searchDropdown.style.display = 'none';
            }
          });
        }
      });
    </script>
    </body>`;

    // Принудительно склеиваем текст статьи и наш JavaScript
    htmlContent = htmlContent + jsScripts;

    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600').send(htmlContent);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}

