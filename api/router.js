import { createClient } from '@supabase/supabase-js';

// Инициализируем базу данных ключами из настроек Vercel
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Получаем чистый путь страницы (например, /avtomobil/r/re/remont-generatora-cd20.html)
  const urlPath = req.url.split('?')[0];

  // Пропускаем фавиконки и статические файлы, если они есть
  if (urlPath.includes('.') && !urlPath.endsWith('.html')) {
    return res.status(404).send('Not found');
  }

  try {
    // Делаем точечный запрос в Supabase по url_path
    const { data, error } = await supabase
      .from('pages')
      .select('html_content')
      .eq('url_path', urlPath)
      .single();

    if (error || !data) {
      // Если страница не найдена в базе, отдаем 404 ошибку
      return res.status(404)
                .setHeader('Content-Type', 'text/html; charset=utf-8')
                .send('<h1>404 Страница не найдена</h1><p>Этого URL еще нет в базе Supabase.</p>');
    }

    // Если нашли — отдаем ваш готовый HTML-код статьи, который загрузил ZennoPoster!
    res.status(200)
       .setHeader('Content-Type', 'text/html; charset=utf-8')
       .setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate') // Кэш на 1 минуту, чтобы сайт летал
       .send(data.html_content);

  } catch (err) {
    return res.status(500).send('Internal Server Error: ' + err.message);
  }
}
