export default async function handler(req, res) {
  try {
    const fullUrl = req.url || '';
    const urlPath = fullUrl.split('?')[0]; 

    // Пропускаем запросы к системным файлам
    if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
      return res.status(404).send('Not found');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Делаем чистый HTTP-запрос к REST API Supabase без библиотек
    const targetUrl = `${supabaseUrl}/rest/v1/pages?url_path=eq.${encodeURIComponent(urlPath)}&select=html_content`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase API responded with status ${response.status}`);
    }

    const data = await response.json();

    // Если база вернула пустой массив [] — значит такого пути нет
    if (!data || data.length === 0) {
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send(`<h1>404 Страница не найдена</h1><p>Путь <b>${urlPath}</b> не найден в таблице pages в Supabase.</p>`);
    }

    // Успех! Отдаем HTML контент статьи из ZennoPoster
    return res.status(200)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
              .send(data[0].html_content);

  } catch (err) {
    return res.status(500)
              .setHeader('Content-Type', 'text/html; charset=utf-8')
              .send('<h1>Ошибка сервера (500)</h1><p>Детали: ' + err.message + '</p>');
  }
}
