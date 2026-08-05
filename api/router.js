if (fullUrl.includes('search-db') || (req.query && JSON.stringify(req.query).includes('search-db'))) {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            console.log("SUPABASE_URL exists:", !!supabaseUrl);

            const response = await fetch(`${supabaseUrl}/rest/v1/pages?select=url_path,category_slug,html_content&limit=10`, {
                headers: { 
                    'apikey': supabaseKey, 
                    'Authorization': `Bearer ${supabaseKey}` 
                }
            });
            
            const rawText = await response.text();
            console.log("Supabase raw response:", rawText);

            let pagesData = [];
            try {
                pagesData = JSON.parse(rawText);
            } catch (e) {
                console.log("JSON parse error:", e.message);
            }

            if (Array.isArray(pagesData) && pagesData.length > 0) {
                const searchDb = pagesData.map(page => {
                    let title = 'Без названия';
                    const html = page.html_content || '';
                    const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                    if (matchH1 && matchH1[1]) {
                        title = matchH1[1].replace(/<[^>]*>/g, '').trim();
                    }

                    let description = '';
                    const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                    if (matchP && matchP[1]) {
                        description = matchP[1].replace(/<[^>]*>/g, '').trim().substring(0, 150);
                    }

                    return {
                        t: title,
                        u: page.url_path ? (page.url_path.startsWith('/') ? page.url_path.slice(1) : page.url_path) : '',
                        c: page.category_slug || '',
                        d: description,
                        tags: page.category_slug || ''
                    };
                });

                return res.status(200)
                    .setHeader('Content-Type', 'application/json; charset=utf-8')
                    .send(JSON.stringify(searchDb));
            }

            return res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8').send('[]');
        } catch (err) {
            console.log("Search catch error:", err.message);
            return res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8').send('[]');
        }
    }

    const currentDomain = (req.headers.host || '').trim();
    // (дальше идет весь остальной код вашего роутера для вывода страниц, стилей и sitemap)

    const sendVercel404 = () => {
        const requestId = `arnl-${Date.now()}-${Math.random().toString(16).substring(2, 10)}`;
        const vercelHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404: NOT_FOUND</title><style>body{font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;background:#fff;color:#000;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}ul{list-style-type:none;padding:0}.container{max-width:500px;text-align:center;padding:20px;border:1px solid #eaeaea;border-radius:5px}h1{font-size:24px;font-weight:500;margin-top:0;margin-bottom:20px;border-bottom:1px solid #eaeaea;padding-bottom:20px}p{font-size:14px;color:#666;margin:10px 0;text-align:left}code{font-family:monospace;background:#fafafa;padding:3px 5px;border-radius:3px;border:1px solid #eaeaea}a{color:#0070f3;text-decoration:none;font-size:14px}a:hover{text-decoration:underline}</style></head><body><div class="container"><h1>404: NOT_FOUND</h1><p>Code: <code>"NOT_FOUND"</code></p><p>ID: <code>"${requestId}"</code></p><br><a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Read our documentation to learn more about this error.</a></div></body></html>`;
        return res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(vercelHtml);
    };

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (fullUrl.includes('style.css') || (req.query && req.query.path && req.query.path.includes('style.css'))) {
            const cssUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=css_content`;
            const cssResponse = await fetch(cssUrl, {
                method: 'GET',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const cssData = await cssResponse.json();
            const actualCss = Array.isArray(cssData) && cssData.length > 0 ? cssData[0].css_content : '';
            return res.status(200)
                .setHeader('Content-Type', 'text/css; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=600')
                .send(actualCss);
        }

        if (fullUrl.includes('//')) {
            return sendVercel404();
        }

        const urlParts = fullUrl.split('?');
        let urlPath = urlParts[0]; 

        if (urlPath.endsWith('/') && urlPath.length > 1) {
            urlPath = urlPath.slice(0, -1);
        }

        const protocol = currentDomain.includes('localhost') ? 'http' : 'https';

        if (urlPath === '/robots.txt') {
            const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${protocol}://${currentDomain}/sitemap.xml`;
            return res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').send(robotsTxt);
        }

        if (urlPath === '/sitemap.xml') {
            const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id`;
            const siteResponse = await fetch(siteCheckUrl, {
                method: 'GET',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const siteData = await siteResponse.json();
            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n`;

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
                        const fixedPath = page.url_path.startsWith('/') ? page.url_path : '/' + page.url_path;
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
        const siteIcon = siteData[0].site_icon || '🔧';
        const siteCss = siteData[0].css_content || '';

        if (urlPath === '/static/css/style.css') {
            return res.status(200)
                .setHeader('Content-Type', 'text/css; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
                .send(siteCss);
        }

        if (urlPath.startsWith('/category/')) {
            let targetPath = urlPath;
            if (targetPath.endsWith('/')) {
                targetPath = targetPath.slice(0, -1);
            }

            let currentCategorySlug = '';
            const PAGE_SIZE = 20;
            let page = 1;

            if (targetPath.indexOf('/page/') !== -1) {
                const parts = targetPath.split('/page/');
                const firstPart = parts[0] || '';
                const secondPart = parts[1] || '';
                currentCategorySlug = firstPart.replace('/category/', '');
                page = parseInt(secondPart) || 1;
            } else {
                currentCategorySlug = targetPath.replace('/category/', '');
            }

            if (!currentCategorySlug) {
                return sendVercel404();
            }

            const categoryTitles = {
                'avtomobil': 'Автомобиль', 'avtoelektrik': 'Автоэлектрик', 'antifriz': 'Антифриз',
                'bamper': 'Бампер', 'generator': 'Генератор', 'dvigatel': 'Двигатель',
                'zamena': 'Замена', 'kolodki': 'Колодки', 'korobka': 'Коробка',
                'kuzov': 'Кузов', 'maslo': 'Масло', 'pokraska': 'Покраска',
                'raznoe': 'Разное', 'remen': 'Ремень', 'remont': 'Ремонт',
                'shod-razval': 'Сходразвал', 'turbina': 'Турбина', 'forsunki': 'Форсунки'
            };

            let russianCategoryTitle = categoryTitles[currentCategorySlug.toLowerCase()];
            if (!russianCategoryTitle) {
                const rawTitle = currentCategorySlug.split('-').join(' ');
                russianCategoryTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
            }

            const offset = (page - 1) * PAGE_SIZE;
            const categoryPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategorySlug)}&select=url_path,html_content&limit=${PAGE_SIZE}&offset=${offset}`;

            const catResponse = await fetch(categoryPagesUrl, {
                method: 'GET',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact' }
            });
            const catPages = await catResponse.json();

            if (!Array.isArray(catPages) || catPages.length === 0) {
                return sendVercel404();
            }

            const contentRange = catResponse.headers.get('content-range') || '';
            const totalCount = contentRange.includes('/') ? parseInt(contentRange.split('/')[1]) : catPages.length;

            let categoryHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${russianCategoryTitle} | ${siteTitle}</title><style>${siteCss}.pagination a.nav-arrow { font-size: 18px; font-weight: 400; transition: transform 0.2s ease, color 0.2s; } .pagination a.arrow-start:hover { transform: translateX(-4px); } .pagination a.arrow-prev:hover { transform: translateX(-3px); } .pagination a.arrow-next:hover { transform: translateX(3px); } .pagination a.arrow-end:hover { transform: translateX(4px); }</style></head><body><div class="topbar"></div><header class="site-header"><div class="container header-inner"><a href="/" class="logo"><span class="logo-icon">${siteIcon}</span> ${siteTitle}</a></div></header><div class="breadcrumbs"><div class="container"><a href="/">Главная</a> <strong>/</strong> <strong>${russianCategoryTitle}</strong></div></div><main class="container" style="padding: 40px 0;"><div class="cat-hero"><span></span><h1>${russianCategoryTitle}</h1></div><div class="cat-list" style="margin-top: 30px; display: grid; gap: 16px;">`;

            catPages.forEach((pageItem, index) => {
                const html = pageItem.html_content || '';
                let title = '';
                if (html.includes('<h1')) {
                    const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                    if (matchH1 && matchH1[1]) { title = String(matchH1[1]).replace(/<[^>]*>/g, '').trim(); }
                }
                if (!title) { title = `Полезный материал №${offset + index + 1}`; }

                let description = '';
                if (html.includes('<p')) {
                    const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                    if (matchP && matchP[1]) {
                        const cleanP = String(matchP[1]).replace(/<[^>]*>/g, '').trim();
                        if (cleanP.length > 15) {
                            if (cleanP.length > 300) {
                                let subStr = cleanP.substring(0, 350);
                                const lastSign = Math.max(subStr.substring(0, 320).lastIndexOf('.'), subStr.substring(0, 320).lastIndexOf('!'), subStr.substring(0, 320).lastIndexOf('?'));
                                description = lastSign > 40 ? subStr.substring(0, lastSign + 1).trim() : subStr.substring(0, 300).trim() + '...';
                            } else {
                                description = cleanP;
                            }
                        }
                    }
                }
                if (!description) { description = 'Разбираем технические особенности, даем практические советы, схемы и подробные пошаговые инструкции в нашем детальном обзоре.'; }

                const fixedPath = pageItem.url_path.startsWith('/') ? pageItem.url_path : '/' + pageItem.url_path;
                categoryHtml += `<article class="article-card"><div class="card-icon"></div><div class="card-body"><h2 style="margin:0 0 6px; font-size:20px; font-weight:700;"><a href="${fixedPath}">${title}</a></h2><p style="margin:0; color:var(--muted); font-size:14px; line-height:1.5;">${description}</p></div></article>`;
            });

            categoryHtml += '</div>';

            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
            if (totalPages > 1) {
                categoryHtml += '<div class="pagination" style="display: flex; gap: 8px; margin-top: 40px; justify-content: center; align-items: center; flex-wrap: wrap;">';
                const catSlug = currentCategorySlug;
                if (page > 1) {
                    categoryHtml += `<a href="/category/${catSlug}/" class="nav-arrow arrow-start" title="В начало">&#10218;</a>`;
                    const prevPageUrl = (page - 1) === 1 ? `/category/${catSlug}/` : `/category/${catSlug}/page/${page - 1}/`;
                    categoryHtml += `<a href="${prevPageUrl}" class="nav-arrow arrow-prev" title="Предыдущая страница">&larr;</a>`;
                }

                const range = 2;
                for (let i = 1; i <= totalPages; i++) {
                    const isActive = i === page;
                    const pageUrl = i === 1 ? `/category/${catSlug}/` : `/category/${catSlug}/page/${i}/`;
                    if (i === 1 || i === totalPages) {
                        categoryHtml += `<a href="${pageUrl}" class="${isActive ? 'is-active' : ''}">${i}</a>`;
                    } else if (i >= page - range && i < page + range) {
                        categoryHtml += `<a href="${pageUrl}" class="${isActive ? 'is-active' : ''}">${i}</a>`;
                    } else if (i === page - range - 1 || i === page + range + 1) {
                        categoryHtml += `<span style="color: var(--muted); padding: 0 4px; font-weight: 500;">...</span>`;
                    }
                }

                if (page < totalPages) {
                    categoryHtml += `<a href="/category/${catSlug}/page/${page + 1}/" class="nav-arrow arrow-next" title="Следующая страница">&rarr;</a>`;
                    categoryHtml += `<a href="/category/${catSlug}/page/${totalPages}/" class="nav-arrow arrow-end" title="В конец">&#10219;</a>`;
                }
                categoryHtml += '</div>';
            }

            categoryHtml += '</main></body></html>';
            return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400').send(categoryHtml);
        }

        if (!urlPath.includes('.') && urlPath !== '/') { return sendVercel404(); }

        const systemExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.js', '.ico', '.svg', '.json'];
        if (systemExtensions.some(ext => urlPath.toLowerCase().endsWith(ext))) { return sendVercel404(); }

        const targetUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&select=html_content,category_slug,id`;
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) { return sendVercel404(); }

        let htmlContent = data[0].html_content;
        const currentCategory = data[0].category_slug;
        const currentPageId = data[0].id;

        htmlContent = htmlContent.replace(/<table([^>]*?)>/gi, '<div class="table-wrap"><table>').replace(/<\/table>/gi, '</table></div>');

        const relatedUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategory)}&id=neq.${currentPageId}&select=url_path,html_content&limit=6`;
        const relatedResponse = await fetch(relatedUrl, {
            method: 'GET',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const relatedData = await relatedResponse.json();

        let sidebarLinksHtml = '';
        let readAlsoCardsHtml = '';
        if (Array.isArray(relatedData) && relatedData.length > 0) {
            relatedData.forEach((p, index) => {
                const h1Match = p.html_content ? p.html_content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) : null;
                const title = h1Match && h1Match[1] ? h1Match[1].replace(/<[^>]*>/g, '').trim() : 'Читать статью';

                if (index < 5) {
                    sidebarLinksHtml += `<li><a href="${p.url_path}">${title}</a></li>`;
                }
                readAlsoCardsHtml += `<div class="article-card"><div class="card-icon"></div><div class="card-body"><small style="color: var(--primary); font-weight: 600; text-transform: uppercase; font-size: 11px;">${currentCategory || ''}</small><h4 style="margin: 4px 0 0; font-size: 16px;"><a href="${p.url_path}" style="color: var(--text); text-decoration: none; font-weight: 700;">${title}</a></h4></div></div>`;
            });
        } else {
            sidebarLinksHtml = '<li>Похожих статей пока нет</li>';
            readAlsoCardsHtml = '<p>В этой категории пока нет других публикаций.</p>';
        }

        htmlContent = htmlContent.replace(/<ul id="dynamicRelatedList">([\s\S]*?)<\/ul>/i, `<ul id="dynamicRelatedList">${sidebarLinksHtml}</ul>`);
        htmlContent = htmlContent.replace(/<div class="list-grid" id="dynamicGridReadAlso">([\s\S]*?)<\/div>/i, `<div class="list-grid" id="dynamicGridReadAlso">${readAlsoCardsHtml}</div>`);

        htmlContent = htmlContent.replaceAll('[CURRENT YEAR]', new Date().getFullYear().toString());
        htmlContent = htmlContent.replaceAll('[SITE TITLE]', siteTitle);

        const jsScripts = `<script>
        document.addEventListener("DOMContentLoaded", function() {
            const contentLinks = document.querySelectorAll('details ol li a[href^="#"]');
            const articleHeaders = document.querySelectorAll('.article-body h2, article h2');
            contentLinks.forEach((anchor, index) => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetElement = articleHeaders[index];
                    if (targetElement) {
                        targetElement.scrollIntoView({behavior: 'smooth', block: 'start'});
                        const targetId = this.getAttribute('href').substring(1);
                        window.history.pushState(null, null, '#' + targetId);
                    }
                });
            });

            const searchInput = document.getElementById('globalSearchInput') || document.querySelector('input[type="search"]');
            const searchDropdown = document.getElementById('globalSearchDropdown') || document.querySelector('.search-dropdown');
            if (searchInput && searchDropdown) {
                let allArticles = [];
                searchInput.addEventListener('focus', async () => {
                    if (allArticles.length === 0) {
                        try {
                            const res = await fetch('/api/search-db');
                            allArticles = await res.json();
                        } catch (e) { console.error("Ошибка загрузки базы поиска"); }
                    }
                }, { once: true });

                searchInput.addEventListener('input', function() {
                    const query = this.value.trim().toLowerCase();
                    searchDropdown.innerHTML = '';
                    if (query.length < 2) { searchDropdown.style.display = 'none'; return; }
                    
                    const filtered = allArticles.filter(art => (art.t || '').toLowerCase().includes(query)).slice(0, 5);
                    if (filtered.length > 0) {
                        filtered.forEach(art => {
                            const item = document.createElement('a');
                            item.href = '/' + art.u;
                            item.className = 'search-item';
                            item.style.display = 'block';
                            item.style.padding = '10px 15px';
                            item.style.color = '#1e293b';
                            item.style.textDecoration = 'none';
                            item.style.borderBottom = '1px solid #f1f5f9';
                            item.style.fontSize = '14px';
                            item.innerHTML = '📄 ' + art.t + (art.c ? '<br><small style="color:var(--muted); font-size:11px;">' + art.c + '</small>' : '');
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
                    if (e.target !== searchInput && !searchDropdown.contains(e.target)) {
                        searchDropdown.style.display = 'none';
                    }
                });
            }
        });
        </script></body>`;

        htmlContent = htmlContent + jsScripts;

        return res.status(200)
            .setHeader('Content-Type', 'text/html; charset=utf-8')
            .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
            .send(htmlContent);

    } catch (err) {
        return res.status(500).send('Internal Error: ' + err.message);
    }
};
