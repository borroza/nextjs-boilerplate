export default async function handler(req, res) {
  try {
    const fullUrl = req.url || '';
    const urlPath = fullUrl.split('?')[0]; 

    // Забираем домен, с которого пришел пользователь (например, autoremontexpert.vercel.app)
    const currentDomain = req.headers.host;

    if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
      return res.status(404).send('Not found');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // ВАЖНО: Ищем страницу только для ТЕКУЩЕГО домена через связку с таблицей sites
    const targetUrl = `${supabaseUrl}/rest/v1/pages?url_path=eq.${encodeURIComponent(urlPath)}&sites.domain=eq.${encodeURIComponent(currentDomain)}&select=html_content,sites(domain)`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send('<h1>404 Страница не найдена</h1>');
    }

    // Отдаем HTML и кэшируем на CDN Vercel на 1 сутки (86400 секунд)
    // База данных будет отдыхать, Vercel сам все отдаст
    return res.status(200)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600')
              .send(data[0].html_content);

  } catch (err) {
    return res.status(500).send('Internal Error: ' + err.message);
  }
}
