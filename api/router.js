import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ИСПРАВЛЕНО: Безопасно получаем чистый путь без GET-параметров
  const fullUrl = req.url || '';
  const urlPath = fullUrl.split('?')[0];

  // Пропускаем фавиконки и системный мусор
  if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
    return res.status(404).send('Not found');
  }

  try {
    // Ищем точное совпадение пути в Supabase
    const { data, error } = await supabase
      .from('pages')
      .select('html_content')
      .eq('url_path', urlPath)
      .single();

    if (error || !data) {
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send('<h1>404 Страница не найдена</h1><p>Этого URL еще нет в базе Supabase.</p>');
    }

    // Отдаем чистый HTML вашей статьи из ZennoPoster
    return res.status(200)
       .setHeader('Content-Type', 'text/html; charset=utf-8')
       .setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
       .send(data.html_content);

  } catch (err) {
    return res.status(500).send('Internal Server Error: ' + err.message);
  }
}
