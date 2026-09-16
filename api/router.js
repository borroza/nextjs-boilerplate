module.exports = async function handler(req, res) {
     const fullUrl = req.url || '';

    const currentDomain = (req.headers.host || '').trim();

    // ===== ЕДИНЫЙ ФУТЕР СЕТИ: единственный источник, инжектится во все страницы =====
    // категории в шапке/подвале — только реально существующие у сайта (иначе 404 роботу)
    const categoryTitles = {
        'avtomobil': 'Автомобиль', 'avtoelektrik': 'Автоэлектрик', 'antifriz': 'Антифриз',
        'bamper': 'Бампер', 'generator': 'Генератор', 'dvigatel': 'Двигатель и ГРМ',
        'zamena': 'Замена', 'kolodki': 'Тормозная система', 'korobka': 'Трансмиссия и АКПП',
        'kuzov': 'Кузовной ремонт', 'maslo': 'Замена техжидкостей', 'pokraska': 'Покраска',
        'raznoe': 'Разное', 'remen': 'Ремень', 'remont': 'Ремонт',
        'shodrazval': 'Сходразвал', 'turbina': 'Турбина', 'forsunki': 'Форсунки',
        'podveska': 'Подвеска', 'tormoza': 'Тормоза', 'starter': 'Стартер',
        'akkumulyator': 'Аккумулятор', 'sceplenie': 'Сцепление', 'kondicioner': 'Кондиционер',
        'svechi': 'Свечи', 'filtry': 'Фильтры', 'stekla': 'Стёкла',
        'rulevoe': 'Рулевое', 'vyhlop': 'Выхлоп', 'ohlazhdenie': 'Охлаждение',
        'diagnostika': 'Диагностика', 'shiny': 'Шины', 'fary': 'Фары',
        'datchiki': 'Датчики', 'elektromobili': 'Электромобили', 'dokumenty': 'Документы',
        'gbo': 'ГБО', 'pritsepy': 'Прицепы', 'pechka': 'Печка',
        'salon': 'Салон', 'dizel': 'Дизель', 'privod': 'Привод'
    };
    const buildMenuLinks = (cats) => {
        if (!cats || cats.length === 0) { return ''; }
        return cats.slice(0, 6).map(c =>
            `<a href="/category/${c}/">${categoryTitles[c] || c}</a>`).join('');
    };

    // кэш категорий сайта на время жизни инстанса (10 минут)
    const siteCatsCache = global.__siteCatsCache || (global.__siteCatsCache = new Map());
    const getSiteCats = async (siteId) => {
        const cached = siteCatsCache.get(siteId);
        if (cached && (Date.now() - cached.ts) < 600000) { return cached.cats; }
        let cats = [];
        try {
            const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const sKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const r = await fetch(`${sUrl}/rest/v1/pages?site_id=eq.${siteId}&select=category_slug&limit=1000`, {
                headers: { apikey: sKey, Authorization: `Bearer ${sKey}` }
            });
            const data = await r.json();
            const set = new Set();
            if (Array.isArray(data)) {
                for (const row of data) {
                    const c = (row.category_slug || '').trim().toLowerCase();
                    if (c !== '') { set.add(c); }
                }
            }
            cats = Array.from(set);
        } catch (e) {}
        siteCatsCache.set(siteId, { ts: Date.now(), cats: cats });
        return cats;
    };

    const buildFooter = (siteTitle, siteIcon, menuLinks) => {
        const year = new Date().getFullYear();
        const descVars = [
            `<strong>${siteTitle}</strong> \u2014 справочник по устройству и обслуживанию автомобильных систем: физика процессов, регламентные операции, типовые дефекты узлов.`,
            `Ресурс <strong>${siteTitle}</strong> посвящён диагностике и ремонту техники: нормативные параметры, необходимый инструмент и порядок контроля результата работ.`,
            `<strong>${siteTitle}</strong> собирает инженерные материалы для автовладельцев: от принципов работы агрегатов до критериев оценки их состояния и износа.`,
            `На страницах <strong>${siteTitle}</strong> собраны материалы о регламентных операциях: периодичность обслуживания, допуски рабочих жидкостей и контрольные параметры узлов.`,
            `Проект <strong>${siteTitle}</strong> описывает автомобильные системы языком техники: причина неисправности, логика проверки и условие работоспособности узла.`
        ];
        let hash = 0;
        const seed = currentDomain || '';
        for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0; }
        const desc = descVars[Math.abs(hash) % descVars.length];
        return `<footer class="site-footer">
    <div class="container footer-grid">
        <div>
            <div class="footer-logo"><span class="logo-icon">${siteIcon}</span> ${siteTitle}</div>
            <p>${desc}</p>
        </div>
        <div>
            <h3>Разделы</h3>
            <nav>
                <a href="/about.html">О проекте</a>
                <a href="/contacts.html">Контакты</a>
                <a href="/privacy.html">Политика конфиденциальности</a>
                <a href="/sitemap.xml">Карта сайта XML</a>
            </nav>
        </div>
        <div>
            <h3>Узлы и агрегаты</h3>
            <nav>${menuLinks}</nav>
        </div>
    </div>
    <div class="copyright">
        <div class="container">
            <span>&copy; ${year} ${siteTitle}</span>
            <span>Все права защищены</span>
        </div>
    </div>
</footer>`;
    };
    // вырезает зашитый футер и шапочное меню (из шаблона генерации), ставит канонические
    const injectFooter = (html, siteTitle, siteIcon, menuLinks) => {
        let out = html.replace(/<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/i, '');
        out = out.replace(/<nav class="main-nav">[\s\S]*?<\/nav>/i, `<nav class="main-nav">${menuLinks}</nav>`);
        out = out.replace('</body>', buildFooter(siteTitle, siteIcon, menuLinks) + '</body>');
        return out;
    };

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

        // /api/search-db тоже обслуживаем здесь: ищем данные только своего сайта
        if (fullUrl.includes('search-db')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            try {
                const siteRes = await fetch(`${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id`, {
                    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
                });
                const siteArr = await siteRes.json();
                if (!Array.isArray(siteArr) || siteArr.length === 0) {
                    return res.status(200).send('[]');
                }
                const pagesRes = await fetch(`${supabaseUrl}/rest/v1/pages?site_id=eq.${siteArr[0].id}&page_type=eq.article&select=url_path,category_slug,html_content&limit=10000`, {
                    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
                });
                const pagesData = await pagesRes.json();
                if (!Array.isArray(pagesData) || pagesData.length === 0) { return res.status(200).send('[]'); }
                const searchDb = pagesData.map(page => {
                    let title = 'Без названия';
                    const html = page.html_content || '';
                    const matchH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                    if (matchH1 && matchH1[1]) { title = matchH1[1].replace(/<[^>]*>/g, '').trim(); }
                    return {
                        t: title,
                        u: page.url_path ? (page.url_path.startsWith('/') ? page.url_path.slice(1) : page.url_path) : '',
                        c: page.category_slug || ''
                    };
                });
                return res.status(200).send(JSON.stringify(searchDb));
            } catch (err) {
                return res.status(200).send('[]');
            }
        }

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
                        xml += `<url><loc>${protocol}://${currentDomain}/category/${catSlug}/</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
                    });

                    pagesData.forEach(page => {
                        const pagePath = page.url_path ? (page.url_path.startsWith('/') ? page.url_path : '/' + page.url_path) : '';
                        if (pagePath === '/' || pagePath === '') { return; }
                        xml += `<url><loc>${protocol}://${currentDomain}${pagePath}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
                    });
                }
            }
            xml += `</urlset>`;
            return res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').setHeader('Cache-Control', 'public, max-age=3600, s-maxage=600, stale-while-revalidate=3600').send(xml);
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

        if (urlPath === '/favicon.ico') {
            try {
                const favUrl = `${supabaseUrl}/storage/v1/object/public/sites-assets/site_id_${currentSiteId}/favicon-32.png`;
                const favRes = await fetch(favUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
                if (favRes.ok) {
                    const buf = Buffer.from(await favRes.arrayBuffer());
                    return res.status(200).setHeader('Content-Type', 'image/png').setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000').send(buf);
                }
            } catch (e) {}
            return sendVercel404();
        }

        const siteTitle = siteData[0].site_title || 'AutoGuide';
        const siteIcon = siteData[0].site_icon || '🛠️';
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

        const categoryTitles = {
            'avtomobil': 'Автомобиль', 'avtoelektrik': 'Автоэлектрик', 'antifriz': 'Антифриз',
            'bamper': 'Бампер', 'generator': 'Генератор', 'dvigatel': 'Двигатель',
            'zamena': 'Замена', 'kolodki': 'Колодки', 'korobka': 'Коробка',
            'kuzov': 'Кузов', 'maslo': 'Масло', 'pokraska': 'Покраска',
            'raznoe': 'Разное', 'remen': 'Ремень', 'remont': 'Ремонт',
            'shod-razval': 'Сходразвал', 'turbina': 'Турбина', 'forsunki': 'Форсунки',
            'podveska': 'Подвеска', 'tormoza': 'Тормоза', 'starter': 'Стартер',
            'akkumulyator': 'Аккумулятор', 'sceplenie': 'Сцепление', 'kondicioner': 'Кондиционер',
            'svechi': 'Свечи', 'filtry': 'Фильтры', 'stekla': 'Стёкла',
            'rulevoe': 'Рулевое', 'vyhlop': 'Выхлоп', 'ohlazhdenie': 'Охлаждение',
            'diagnostika': 'Диагностика', 'shiny': 'Шины', 'fary': 'Фары',
            'datchiki': 'Датчики', 'elektro': 'Электромобили', 'dokumenty': 'Документы',
            'gbo': 'ГБО', 'pritsepy': 'Прицепы', 'pechka': 'Печка',
            'salon': 'Салон', 'dizel': 'Дизель', 'privod': 'Привод'
        };

        // меню шапки/подвала: только категории, реально существующие у сайта
        const menuLinks = buildMenuLinks(await getSiteCats(currentSiteId));

        if (urlPath.startsWith('/category/')) {
            let targetPath = urlPath.replace(/\/+$/, '');

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

            let categoryHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/png" href="/favicon.ico">${yandexVerification}<link rel="canonical" href="${protocol}://${currentDomain}/category/${currentCategorySlug}${page > 1 ? '/page/' + page : ''}"><title>${russianCategoryTitle}${page > 1 ? ' — страница ' + page : ''} | ${siteTitle}</title><link rel="stylesheet" href="/static/css/style.css?v=dev">${metrikaCode}</head><body><div class="topbar"></div><header class="site-header"><div class="container header-inner"><a href="/" class="logo"><span class="logo-icon">${siteIcon}</span> ${siteTitle}</a><nav class="main-nav">${menuLinks}</nav></div></header><div class="breadcrumbs"><div class="container"><a href="/">Главная</a> <span>/</span> <strong>${russianCategoryTitle}</strong></div></div><main class="container" style="padding: 40px 0;"><div class="cat-hero"><h1>${russianCategoryTitle}</h1></div><div class="cat-list" style="margin-top: 30px; display: grid; gap: 16px;">`;

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
                categoryHtml += `<article class="article-card"><div class="card-body"><h2 style="margin:0 0 6px; font-size:18px; font-weight:700;"><a href="${fixedPath}">${title}</a></h2><p style="margin:0; color:var(--text-muted); font-size:14px; line-height:1.5;">${description}</p></div></article>`;
            });

            categoryHtml += '</div>';

            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
            if (totalPages > 1) {
                categoryHtml += '<div class="pagination-container" id="pagination" style="display:flex; gap:8px; margin-top:32px;">';
                if (page > 1) {
                    const prevPath = page === 2 ? `/category/${currentCategorySlug}/` : `/category/${currentCategorySlug}/page/${page - 1}`;
                    categoryHtml += `<a href="${prevPath}">« Назад</a>`;
                }
                for (let i = 1; i <= totalPages; i++) {
                    if (i === page) {
                        categoryHtml += `<span class="current active">${i}</span>`;
                    } else {
                        const pagePath = i === 1 ? `/category/${currentCategorySlug}/` : `/category/${currentCategorySlug}/page/${i}`;
                        categoryHtml += `<a href="${pagePath}">${i}</a>`;
                    }
                }
                if (page < totalPages) {
                    const nextPath = `/category/${currentCategorySlug}/page/${page + 1}`;
                    categoryHtml += `<a href="${nextPath}">Вперед »</a>`;
                }
                categoryHtml += '</div>';
            }

            categoryHtml += '</main>' + buildFooter(siteTitle, siteIcon, menuLinks) + '<script src="/script.js"></script></body></html>';
            return res.status(200)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=3600, stale-while-revalidate=86400')
                .send(categoryHtml);
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

        if (!htmlContent.includes('class="table-wrap"')) {
            htmlContent = htmlContent.replace(/<table([^>]*?)>/gi, '<div class="table-wrap"><table$1>').replace(/<\/table>/gi, '</table></div>');
        }

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
                const title = h1Match && h1Match[1] ? h1Match[1].replace(/<[^>]*>/g, '').trim() : 'Читать инструкцию';

                if (index < 5) {
                    sidebarLinksHtml += `<li><a href="${p.url_path}">${title}</a></li>`;
                }
                readAlsoCardsHtml += `<div class="article-card"><div class="card-body"><small style="color: var(--accent); font-weight: 700; text-transform: uppercase; font-size: 11px;">${currentCategory || ''}</small><h4 style="margin: 6px 0 0; font-size: 15px;"><a href="${p.url_path}" style="color: var(--text-bright); text-decoration: none;">${title}</a></h4></div></div>`;
            });
        } else {
            sidebarLinksHtml = '<li>Похожих инструкций пока нет</li>';
            readAlsoCardsHtml = '<p style="color:var(--text-muted); font-size:14px;">В этой категории пока нет других публикаций.</p>';
        }

        htmlContent = htmlContent.replace(/<ul id="dynamicRelatedList">([\s\S]*?)<\/ul>/i, `<ul id="dynamicRelatedList">${sidebarLinksHtml}</ul>`);
        htmlContent = htmlContent.replace(/<div class="list-grid" id="dynamicGridReadAlso">([\s\S]*?)<\/div>/i, `<div class="list-grid" id="dynamicGridReadAlso">${readAlsoCardsHtml}</div>`);

        htmlContent = htmlContent.replaceAll('[CURRENT YEAR]', '2026');
        htmlContent = htmlContent.replaceAll('[SITE_TITLE]', siteTitle);
        htmlContent = htmlContent.replaceAll('[SITE TITLE]', siteTitle);
        htmlContent = htmlContent.replaceAll('[SITE_ICON]', siteIcon);
        htmlContent = htmlContent.replaceAll('[MENU_LINKS]', menuLinks);

        htmlContent = htmlContent.replace(/<meta name="yandex-verification"[^>]*>/gi, '');
        htmlContent = htmlContent.replace(/<!-- Yandex\.Metrika counter -->[\s\S]*?<!-- \/Yandex\.Metrika counter -->/gi, '');
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href="\/static\/css\/style\.css"[^>]*>/gi, '');

        const headAdditions = `\n<link rel="icon" type="image/png" href="/favicon.ico">\n<link rel="stylesheet" href="/static/css/style.css?v=dev">\n${yandexVerification}\n${metrikaCode}\n`;
        
        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${headAdditions}</head>`);
        } else {
            htmlContent = headAdditions + htmlContent;
        }

        if (!htmlContent.includes('/script.js') && htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace('</body>', '<script src="/script.js"></script></body>');
        }
        
        // главная несёт метрику/верификацию — обновляется быстро;
        // статьи неизменны — длинный кэш держит hit-rate на миллионах URL
        const htmlCacheControl = urlPath === '/'
            ? 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
            : 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

        // ===== КОНТРОЛЬ РОБОТОВ: bot_at в очередь + глобальный счётчик по движкам =====
        const ua = (req.headers['user-agent'] || '');
        let botEng = /Yandex/i.test(ua) ? 'yandex'
                   : /bing/i.test(ua) ? 'bing'
                   : /Seznam/i.test(ua) ? 'seznam'
                   : /Yeti|Naver/i.test(ua) ? 'naver'
                   : /yep/i.test(ua) ? 'yep'
                   : (/bot|crawl|spider|slurp/i.test(ua) ? 'other' : null);
        if (botEng !== null) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/rpc/bot_hit`, {
                    method: 'POST',
                    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_eng: botEng })
                });
            } catch (e) {}
            try {
                await fetch(`${supabaseUrl}/rest/v1/rpc/bot_site_hit`, {
                    method: 'POST',
                    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_site: currentSiteId, p_eng: botEng })
                });
            } catch (e) {}
            if (urlPath.endsWith('.html')) {
                try {
                    await fetch(`${supabaseUrl}/rest/v1/indexnow_queue?site_id=eq.${currentSiteId}&url_path=eq.${encodeURIComponent(urlPath)}&bot_at=is.null`, {
                        method: 'PATCH',
                        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                        body: JSON.stringify({ bot_at: new Date().toISOString() })
                    });
                } catch (e) {}
            }
        }

        return res.status(200)
            .setHeader('Content-Type', 'text/html; charset=utf-8')
            .setHeader('Cache-Control', htmlCacheControl)
            .send(injectFooter(htmlContent, siteTitle, siteIcon, menuLinks));

    } catch (err) {
        return res.status(500).send('Internal Error: ' + err.message);
    }
};
