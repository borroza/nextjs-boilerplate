document.addEventListener("DOMContentLoaded", function() {
    // 1. Мобильное меню (бургер)
    const menuBtn = document.getElementById('menuBtn') || document.querySelector('.menu-btn');
    const mainNav = document.getElementById('mainNav') || document.querySelector('.main-nav');
    if (menuBtn && mainNav) {
        menuBtn.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            const isExpanded = mainNav.classList.contains('active');
            menuBtn.setAttribute('aria-expanded', isExpanded);
        });
    }

    // 2. Интерактивный опрос
    const pollBlocks = document.querySelectorAll('.poll-widget');
    pollBlocks.forEach(poll => {
        const buttons = poll.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                buttons.forEach((b, idx) => {
                    b.disabled = true;
                    b.classList.add('voted');
                    const pct = idx === 0 ? 54 : (idx === 1 ? 28 : (idx === 2 ? 12 : 6));
                    b.innerHTML = b.innerText + ' <span class="poll-percent">' + pct + '%</span>';
                });
            }, { once: true });
        });
    });

    // 3. Интерактивный чек-лист
    const checkBlocks = document.querySelectorAll('.checklist-block');
    checkBlocks.forEach(block => {
        const boxes = block.querySelectorAll('input[type="checkbox"]');
        const countDisplay = block.querySelector('.check-count');
        boxes.forEach(box => {
            box.addEventListener('change', () => {
                const checked = block.querySelectorAll('input[type="checkbox"]:checked').length;
                if (countDisplay) countDisplay.textContent = checked;
            });
        });
    });

    // 4. Плавная прокрутка оглавления
    const contentLinks = document.querySelectorAll('.article-toc nav a[href^="#"], details ol li a[href^="#"]');
    contentLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.history.pushState(null, null, '#' + targetId);
            }
        });
    });

    // 5. Поиск по сайту (чистый DOM без inline-стилей)
    const searchInput = document.getElementById('globalSearchInput') || document.querySelector('input[type="search"]');
    const searchDropdown = document.getElementById('globalSearchDropdown') || document.querySelector('.search-dropdown');

    if (searchInput && searchDropdown) {
        let allArticles = [];

        searchInput.addEventListener('focus', async () => {
            if (allArticles.length === 0) {
                try {
                    const res = await fetch('/api/search-db');
                    allArticles = await res.json();
                } catch (e) {}
            }
        }, { once: true });

        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            searchDropdown.innerHTML = '';

            if (query.length < 2) {
                searchDropdown.style.display = 'none';
                return;
            }

            const filtered = allArticles.filter(art => 
                (art.t || '').toLowerCase().includes(query) || 
                (art.c || '').toLowerCase().includes(query)
            ).slice(0, 5);

            if (filtered.length > 0) {
                filtered.forEach(art => {
                    const item = document.createElement('a');
                    item.href = '/' + (art.u ? (art.u.startsWith('/') ? art.u.slice(1) : art.u) : '');
                    item.className = 'search-item';
                    item.innerHTML = '<span class="search-item-title">📄 ' + art.t + '</span>' + 
                                     (art.c ? '<small class="search-item-cat">' + art.c + '</small>' : '');
                    searchDropdown.appendChild(item);
                });
                searchDropdown.style.display = 'block';
            } else {
                searchDropdown.innerHTML = '<div class="search-empty">Ничего не найдено</div>';
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
