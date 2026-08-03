// api/search-db.js
export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const currentDomain = req.headers.host || '';

    // Ищем ID сайта
    const siteCheckUrl = `${supabaseUrl}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&select=id`;
    const siteResponse = await fetch(siteCheckUrl, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const siteData = await siteResponse.json();
    if (!Array.isArray(siteData) || siteData.length === 0) return res.status(404).json([]);

    const currentSiteId = siteData[0].id;

    // Вытягиваем только url_path и html_content БЕЗ лишних полей
    const allPagesUrl = `${supabaseUrl}/rest/v1/pages?site_id=eq.${currentSiteId}&select=url_path,html_content&limit=1000`;
    const allPagesResponse = await fetch(allPagesUrl, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const allPagesData = await allPagesResponse.json();

    let searchDatabase = [];
    if (Array.isArray(allPagesData)) {
      allPagesData.forEach(p => {
        if (p.url_path.includes('.') || p.url_path.endsWith('.html')) {
          let title = p.url_path;
          if (p.html_content && p.html_content.includes('<h1')) {
            const matchH1 = p.html_content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            if (matchH1 && matchH1[1]) { title = matchH1[1].replace(/<[^>]*>/g, '').trim(); }
          }
          searchDatabase.push({ name: title, path: p.url_path });
        }
      });
    }

    // Кэшируем саму базу поиска в CDN Vercel на 1 сутки!
    return res.status(200)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
      .json(searchDatabase);

  } catch (err) {
    return res.status(500).json([]);
  }
}

