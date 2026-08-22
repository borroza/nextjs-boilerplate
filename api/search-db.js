module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).send('[]');
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/pages?select=url_path,category_slug,html_content&limit=10000`, {
            headers: { 
                'apikey': supabaseKey, 
                'Authorization': `Bearer ${supabaseKey}` 
            }
        });
        
        if (!response.ok) {
            return res.status(200).send('[]');
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

                let description = '';
                const matchP = html.match(/<p[^>]*class=["']?lead["']?[^>]*>([\s\S]*?)<\/p>/i) || html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
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

            return res.status(200).send(JSON.stringify(searchDb));
        }

        return res.status(200).send('[]');
    } catch (err) {
        return res.status(200).send('[]');
    }
};
