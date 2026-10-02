# КиаГид — деплой (kia-gid.vercel.app)

## 1. Supabase (новый проект — не старый!)
1. Создай проект в Supabase (любое имя, например `kia-gid-db`).
2. SQL Editor → вставь и выполни `schema.sql` из этой папки.
3. Запомни: Project URL + **anon** key (Settings → API).

## 2. Залить карту сайта и статьи
Из папки `C:\Users\Asus\Desktop\vercel_new_v3`:
```
python load_pages_to_supabase.py <PROJECT_URL> <SERVICE_KEY> pilot
```
- `pilot` — заливает только 5 пилотных статей + все хабы (каркас). Без `pilot` — заливает все опубликованные статьи (когда сгенерируем весь массив).
- SERVICE_KEY — service_role (нужен для записи); anon используется в сайте на чтение.

## 3. Деплой на Vercel
```
cd kia-gid-site
npm install
vercel login            (аккаунт borroza для dev)
vercel link             (привязать к проекту nextjs-boilerplate)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL        # https://kia-gid.vercel.app
vercel env add NEXT_PUBLIC_YM_ID           # id счётчика Метрики (можно позже)
vercel --prod
```
Домен kia-gid.vercel.app уже привязан к проекту — после деплоя сайт откроется на нём.

## 4. Проверка после деплоя
- `https://kia-gid.vercel.app/` — главная с хабами
- `https://kia-gid.vercel.app/rio-3/tormoznye-diski/` — пилотная статья
- `https://kia-gid.vercel.app/rio/` — хаб модели
- `https://kia-gid.vercel.app/sitemap.xml` — только published-URL
- выборочно 20 URL из sitemap → все 200, без 308 (canonical на слеш-вариант внутри Next — проверить заголовки)

## 5. После проверки — Вебмастер и Метрика
см. «КОНВЕЙЕР-KIA-GID-ОТ-А-ДО-Я.md», этапы 9–10: добавить хост в Вебмастер, подтвердить,
привязать счётчик, отправить sitemap, НЕ отправлять в IndexNow до полного залива.
