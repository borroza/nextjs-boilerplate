document.addEventListener("DOMContentLoaded", function() {
    // 1. Плавная прокрутка по клику на оглавление
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

    // 2. Живой поиск по базе статей
    const searchInput = document.getElementById('globalSearchInput') || document.querySelector('input[type="search"]');
    const searchDropdown = document.getElementById('globalSearchDropdown') || document.querySelector('.search-dropdown');
    
    if (searchInput && searchDropdown) {
        let allArticles = [];
        
        searchInput.addEventListener('focus', async () => {
            if (allArticles.length === 0) {
                try {
                    const res = await fetch('/api/search-db');
                    allArticles = await res.json();
                } catch (e) { 
                    console.error("Ошибка загрузки базы поиска"); 
                }
            }
        }, { once: true });

        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            searchDropdown.innerHTML = '';
            
            if (query.length < 2) { 
                searchDropdown.style.display = 'none'; 
                return; 
            }
            
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
