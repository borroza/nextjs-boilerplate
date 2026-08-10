module.exports = async function handler(req, res) {
    const fullUrl = req.url || '';

    if (fullUrl.includes('search-db') || (req.query && JSON.stringify(req.query).includes('search-db'))) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                return res.status(200).send(JSON.stringify({ error: "🚨 ОШИБКА: НЕТ КЛЮЧЕЙ SUPABASE В VERCEL" }));
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/pages?select=url_path,category_slug,html_content&limit=500`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            
            if (!response.ok) {
                return res.status(200).send(JSON.stringify({ error: "🚨 ОШИБКА ОТВЕТА ОТ SUPABASE" }));
            }

            const pagesData = await response.json();
            if (Array.isArray(pagesData) && pagesData.length > 0) {
                const searchDb = pagesData.map(page => {
                    let title = 'Без названия';
                    const html = page.html_content || '';
                    const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                    if (matchH1 && matchH1[1]) {
                        title = matchH1[1].replace(/<[^>]*>/g, '').trim();
                    }
                    return {
                        t: title,
                        u: page.url_path ? (page.url_path.startsWith('/') ? page.url_path.slice(1) : page.url_path) : '',
                        c: page.category_slug || ''
                    };
                });
                return res.status(200).send(JSON.stringify(searchDb));
            }
            return res.status(200).send(JSON.stringify({ error: "🚨 SUPABASE ВЕРНУЛ ПУСТОТУ" }));
        } catch (err) {
            return res.status(200).send(JSON.stringify({ error: "🚨 ОШИБКА В CATCH БЛОКЕ", message: err.message }));
        }
    }

    const currentDomain = (req.headers.host || '').trim();

    const sendVercel404 = () => {
        const requestId = `arnl-${Date.now()}-${Math.random().toString(16).substring(2, 10)}`;
        const vercelHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404: NOT_FOUND</title></head><body><h1>404: NOT_FOUND</h1><p>ID: <code>"${requestId}"</code></p></body></html>`;
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
                .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
                .send(actualCss);
        }

        if (fullUrl.includes('//')) { return sendVercel404(); }

        const urlParts = fullUrl.split('?');
        let urlPath = urlParts[0]; 
        if (urlPath.endsWith('/') && urlPath.length > 1) { urlPath = urlPath.slice(0, -1); }

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

            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
            xml += `<url><loc>${protocol}://${currentDomain}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

            if (Array.isArray(siteData) && siteData.length > 0) {
                const currentSiteId = siteData[0].id;
                const pagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&select=url_path,category_slug&limit=50000`;
                const pagesResponse = await fetch(pagesUrl, {
                    method: 'GET',
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                });
                const pagesData = await pagesResponse.json();

                if (Array.isArray(pagesData) && pagesData.length > 0) {
                    const uniqueCategories = new Set();
                    pagesData.forEach(page => {
                        if (page.category_slug && page.category_slug.trim() !== '') {
                            uniqueCategories.add(page.category_slug.trim().toLowerCase());
                        }
                    });

                    uniqueCategories.forEach(catSlug => {
                        xml += `<url><loc>${protocol}://${currentDomain}/category/${catSlug}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
                    });

                    pagesData.forEach(page => {
                        const pagePath = page.url_path ? (page.url_path.startsWith('/') ? page.url_path : '/' + page.url_path) : '';
                        if (pagePath === '/' || pagePath === '') { return; }
                        xml += `<url><loc>${protocol}://${currentDomain}${pagePath}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
                    });
                }
            }
            xml += `</urlset>`;
            return res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600').send(xml);
        }

        const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id,site_title,site_icon,css_content,yandex_verification,metrika_id`;
        const siteResponse = await fetch(siteCheckUrl, {
            method: 'GET',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const siteData = await siteResponse.json();
        if (!Array.isArray(siteData) || siteData.length === 0) { return sendVercel404(); }

        const currentSiteId = siteData[0].id;

        if (urlPath.endsWith('.txt')) {
            const txtUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;
            const txtRes = await fetch(txtUrl, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const txtData = await txtRes.json();
            if (Array.isArray(txtData) && txtData.length > 0) {
                return res.status(200)
                    .setHeader('Content-Type', 'text/plain; charset=utf-8')
                    .send(txtData[0].html_content);
            }
            return sendVercel404();
        }

        const siteTitle = siteData[0].site_title;
        const siteIcon = siteData[0].site_icon || '🔧';
        const siteCss = siteData[0].css_content || '';
        const yandexVerification = siteData[0].yandex_verification ? `<meta name="yandex-verification" content="${siteData[0].yandex_verification}" />` : '';
        
        const metrikaId = siteData[0].metrika_id;
        const metrikaCode = metrikaId ? `<!-- Yandex.Metrika counter -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(${metrikaId}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${metrikaId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->` : '';

        if (urlPath === '/static/css/style.css') {
            return res.status(200)
                .setHeader('Content-Type', 'text/css; charset=utf-8')
                .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
                .send(siteCss);
        }

        if (urlPath.startsWith('/category/')) {
            let targetPath = urlPath;
            if (targetPath.endsWith('/')) { targetPath = targetPath.slice(0, -1); }

            let currentCategorySlug = '';
            const PAGE_SIZE = 20;
            let page = 1;

            if (targetPath.indexOf('/page/') !== -1) {
                const parts = targetPath.split('/page/');
                currentCategorySlug = (parts[0] || '').replace('/category/', '');
                page = parseInt(parts[1]) || 1;
            } else {
                currentCategorySlug = targetPath.replace('/category/', '');
            }

            if (!currentCategorySlug) { return sendVercel404(); }

            const categoryTitles = {
                'avtomobil': 'Автомобиль', 'avtoelektrik': 'Автоэлектрик', 'antifriz': 'Антифриз',
                'bamper': 'Бампер', 'generator': 'Генератор', 'dvigatel': 'Двигатель',
                'zamena': 'Замена', 'kolodki': 'Колодки', 'korobka': 'Коробка',
                'kuzov': 'Кузов', 'maslo': 'Масло', 'pokraska': 'Покраска',
                'raznoe': 'Разное', 'remen': 'Ремень', 'remont': 'Ремонт',
                'shod-razval': 'Сходразвал', 'turbina': 'Турбина', 'forsunki': 'Форсунки'
            };

            let russianCategoryTitle = categoryTitles[currentCategorySlug.toLowerCase()] || currentCategorySlug;

            const offset = (page - 1) * PAGE_SIZE;
            const categoryPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&category_slug=eq.${encodeURIComponent(currentCategorySlug)}&select=url_path,html_content&limit=${PAGE_SIZE}&offset=${offset}`;

            const catResponse = await fetch(categoryPagesUrl, {
                method: 'GET',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact' }
            });
            const catPages = await catResponse.json();

            if (!Array.isArray(catPages) || catPages.length === 0) { return sendVercel404(); }

            const contentRange = catResponse.headers.get('content-range') || '';
            const totalCount = contentRange.includes('/') ? parseInt(contentRange.split('/')[1]) : catPages.length;

            let categoryHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${yandexVerification}<title>${russianCategoryTitle} | ${siteTitle}</title><link rel="stylesheet" href="/static/css/style.css?v=dev">${metrikaCode}</head><body><div class="topbar"></div><header class="site-header"><div class="container header-inner"><a href="/" class="logo"><span class="logo-icon">${siteIcon}</span> ${siteTitle}</a></div></header><div class="breadcrumbs"><div class="container"><a href="/">Главная</a> <strong>/</strong> <strong>${russianCategoryTitle}</strong></div></div><main class="container" style="padding: 40px 0;"><div class="cat-hero"><span></span><h1>${russianCategoryTitle}</h1></div><div class="cat-list" style="margin-top: 30px; display: grid; gap: 16px;">`;

            catPages.forEach((pageItem, index) => {
                const html = pageItem.html_content || '';
                let title = '';
                const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                if (matchH1 && matchH1[1]) { title = String(matchH1[1]).replace(/<[^>]*>/g, '').trim(); }
                if (!title) { title = `Полезный материал №${offset + index + 1}`; }

                let description = '';
                const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                if (matchP && matchP[1]) {
                    description = String(matchP[1]).replace(/<[^>]*>/g, '').trim().substring(0, 300) + '...';
                }
                if (!description) { description = 'Практические советы и пошаговые инструкции.'; }

                const fixedPath = pageItem.url_path.startsWith('/') ? pageItem.url_path : '/' + pageItem.url_path;
                categoryHtml += `<article class="article-card"><div class="card-icon"></div><div class="card-body"><h2 style="margin:0 0 6px; font-size:20px; font-weight:700;"><a href="${fixedPath}">${title}</a></h2><p style="margin:0; color:var(--muted); font-size:14px; line-height:1.5;">${description}</p></div></article>`;
            });

            categoryHtml += '</div>';

            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
            
            if (totalPages > 1) {
                categoryHtml += '<div class="pagination-container" id="pagination">';
                
                if (page > 1) {
                    const prevPath = page === 2 ? `/category/${currentCategorySlug}` : `/category/${currentCategorySlug}/page/${page - 1}`;
                    categoryHtml += `<a href="${prevPath}">« Назад</a>`;
                }
                
                for (let i = 1; i <= totalPages; i++) {
                    if (i === page) {
                        categoryHtml += `<span class="current active">${i}</span>`;
                    } else {
                        const pagePath = i === 1 ? `/category/${currentCategorySlug}` : `/category/${currentCategorySlug}/page/${i}`;
                        categoryHtml += `<a href="${pagePath}">${i}</a>`;
                    }
                }
                
                if (page < totalPages) {
                    const nextPath = `/category/${currentCategorySlug}/page/${page + 1}`;
                    categoryHtml += `<a href="${nextPath}">Вперед »</a>`;
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

        if (htmlContent.includes('<div id="dynamic-popular-articles"></div>')) {
            try {
                const articlesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&url_path=neq.&select=url_path,html_content&limit=5&order=id.desc`;
                const articlesRes = await fetch(articlesUrl, {
                    method: 'GET',
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                });
                const latestArticles = await articlesRes.json();
                
                let dynamicHtml = '<div style="display: grid; gap: 16px;">';
                if (Array.isArray(latestArticles) && latestArticles.length > 0) {
                    latestArticles.forEach(art => {
                        const html = art.html_content || '';
                        let artTitle = 'Полезная статья';
                        const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                        if (matchH1 && matchH1[1]) { artTitle = matchH1[1].replace(/<[^>]*>/g, '').trim(); }

                        let artDesc = 'Читайте подробности в нашей новой инструкции...';
                        const matchP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                        if (matchP && matchP[1]) {
                            const rawDesc = matchP[1].replace(/<[^>]*>/g, '').trim();
                            if (rawDesc.length > 20) { artDesc = rawDesc.substring(0, 150) + '...'; }
                        }

                        const artPath = art.url_path.startsWith('/') ? art.url_path : '/' + art.url_path;
                        dynamicHtml += `<div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;"><a href="${artPath}" style="text-decoration: none; display: block;"><h3 style="margin: 0 0 8px; font-size: 16px; color: #1e293b; font-weight: 700;">${artTitle}</h3><p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">${artDesc}</p></a></div>`;
                    });
                }
                dynamicHtml += '</div>';
                htmlContent = htmlContent.replace('<div id="dynamic-popular-articles"></div>', dynamicHtml);
            } catch (err) {
                console.error("Ошибка загрузки популярных статей: ", err);
            }
        }

        htmlContent = htmlContent.replaceAll('[CURRENT YEAR]', new Date().getFullYear().toString());
        htmlContent = htmlContent.replaceAll('[SITE TITLE]', siteTitle);

        const jsScripts = `<script>
        document.addEventListener("DOMContentLoaded", function() {
            const menuBtn = document.querySelector('.menu-btn');
            const mainNav = document.querySelector('.main-nav');
            if (menuBtn && mainNav) {
                menuBtn.addEventListener('click', function() {
                    mainNav.classList.toggle('is-open');
                    menuBtn.setAttribute('aria-expanded', mainNav.classList.contains('is-open'));
                });
            }
            const dropdownToggle = document.querySelector('.dropdown-toggle');
            const navDropdown = document.querySelector('.nav-dropdown');
            if (dropdownToggle && navDropdown) {
                dropdownToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    navDropdown.classList.toggle('is-open');
                    dropdownToggle.setAttribute('aria-expanded', navDropdown.classList.contains('is-open'));
                });
            }

            const pollWrappers = document.querySelectorAll("div[style*='max-width:600px'][style*='border-radius:16px']");
            
            pollWrappers.forEach(wrapper => {
                const options = Array.from(wrapper.querySelectorAll("div[style*='cursor:pointer']"));
                if(options.length === 0) return;

                let voted = false;
                
                options.forEach((opt, index) => {
                    opt.addEventListener('click', function() {
                        if (voted) return; 
                        voted = true;

                        let percentages = options.map(() => Math.floor(Math.random() * 30) + 10);
                        percentages[index] += 40; 
                        
                        let sum = percentages.reduce((a, b) => a + b, 0);
                        percentages = percentages.map(p => Math.round((p / sum) * 100));
                        
                        let diff = 100 - percentages.reduce((a, b) => a + b, 0);
                        percentages[index] += diff;

                        options.forEach((o, i) => {
                            o.style.cursor = "default";
                            o.style.position = "relative";
                            o.style.overflow = "hidden";
                            o.style.zIndex = "1";

                            const circle = o.querySelector("span");
                            if (circle) {
                                circle.style.backgroundColor = i === index ? "var(--accent)" : "#cbd5e1";
                                circle.style.borderColor = i === index ? "var(--accent)" : "#cbd5e1";
                                if (i === index) {
                                    circle.innerHTML = "<svg viewBox='0 0 24 24' style='width:12px; height:12px; margin-top:1px; fill:none; stroke:white; stroke-width:3; stroke-linecap:round; stroke-linejoin:round;'><polyline points='20 6 9 17 4 12'></polyline></svg>";
                                    circle.style.display = "flex";
                                    circle.style.alignItems = "center";
                                    circle.style.justifyContent = "center";
                                }
                            }

                            const bar = document.createElement("div");
                            bar.style.position = "absolute";
                            bar.style.left = "0";
                            bar.style.top = "0";
                            bar.style.height = "100%";
                            bar.style.width = "0%"; 
                            bar.style.backgroundColor = i === index ? "rgba(249, 115, 22, 0.15)" : "rgba(226, 232, 240, 0.5)";
                            bar.style.zIndex = "-1";
                            bar.style.transition = "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
                            o.appendChild(bar);

                            const pct = document.createElement("span");
                            pct.style.marginLeft = "auto";
                            pct.style.fontWeight = "800";
                            pct.style.fontSize = "16px";
                            pct.style.color = i === index ? "var(--accent)" : "#64748b";
                            pct.style.opacity = "0";
                            pct.style.transition = "opacity 0.8s 0.3s"; 
                            pct.innerText = percentages[i] + "%";
                            o.appendChild(pct);

                            setTimeout(() => {
                                bar.style.width = percentages[i] + "%";
                                pct.style.opacity = "1";
                            }, 50);
                        });
                    });
                });
            });
        });
        </script>`;

        htmlContent = htmlContent + jsScripts;

        htmlContent = htmlContent.replace(/<meta name="yandex-verification"[^>]*>/gi, '');
        htmlContent = htmlContent.replace(/<!-- Yandex\.Metrika counter -->[\s\S]*?<!-- \/Yandex\.Metrika counter -->/gi, '');
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href="\/static\/css\/style\.css"[^>]*>/gi, '');

        const headAdditions = `\n<link rel="stylesheet" href="/static/css/style.css?v=dev">\n${yandexVerification}\n${metrikaCode}\n`;
        
        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${headAdditions}</head>`);
        } else {
            htmlContent = headAdditions + htmlContent;
        }
        
        return res.status(200)
            .setHeader('Content-Type', 'text/html; charset=utf-8')
            .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
            .send(htmlContent);

    } catch (err) {
        return res.status(500).send('Internal Error: ' + err.message);
    }
};
