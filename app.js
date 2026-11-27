/* 게토픽(Geto Pick) · items page
 * data/products.json 하나만 고치면 목록이 바뀝니다.
 * 구조: { brand, updatedAt, disclosure, categories[], products[], channels[] }
 *   products[].image    → 카드 메인 이미지 (assets/products/{id}.jpg)
 *   products[].category → all/appliance/kitchen/furniture/living
 *   products[].popular  → true 인 상품은 '인기 꿀템' 섹션에 노출 (GA4 클릭 순위로 교체)
 */
(function () {
  'use strict';

  var DATA_URL = 'data/products.json';
  var WISH_KEY = 'getopick:wishlist';
  var FALLBACK_CATEGORY_LABEL = '전체';

  var state = {
    data: null,
    products: [],
    category: 'all',
    query: '',
    sort: 'new',            // new | price
    view: 'home',           // home | wish
    wishlist: [],
    categoryLabels: {}
  };

  var el = {
    search: document.getElementById('search'),
    clear: document.getElementById('search-clear'),
    nav: document.getElementById('category-nav'),
    popularSection: document.getElementById('popular-section'),
    popularGrid: document.getElementById('popular-grid'),
    list: document.getElementById('product-list'),
    listTitle: document.getElementById('list-title'),
    sortBtn: document.getElementById('sort-btn'),
    empty: document.getElementById('empty'),
    error: document.getElementById('error'),
    count: document.getElementById('result-count'),
    channels: document.getElementById('channels'),
    sheetChannels: document.getElementById('sheet-channels'),
    sheet: document.getElementById('sns-sheet'),
    footerNote: document.getElementById('footer-note'),
    disclosure: document.getElementById('disclosure'),
    brandName: document.querySelector('.brand-name'),
    brandTagline: document.querySelector('.brand-tagline'),
    wishCount: document.getElementById('wish-count'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('.tab'))
  };

  var CATEGORY_ICONS = {
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.2"/></svg>',
    appliance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="3" width="13" height="18" rx="2.6"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="8.6" y1="7" x2="8.6" y2="10"/><line x1="8.6" y1="14" x2="8.6" y2="16"/></svg>',
    kitchen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 10.5h13v5.2a4.3 4.3 0 0 1-4.3 4.3h-4.4a4.3 4.3 0 0 1-4.3-4.3z"/><path d="M8.8 10.5V8.2a3.2 3.2 0 0 1 6.4 0v2.3"/><line x1="2.6" y1="13.4" x2="5.5" y2="13.4"/><line x1="18.5" y1="13.4" x2="21.4" y2="13.4"/></svg>',
    furniture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.6V9a2.8 2.8 0 0 1 2.8-2.8h8.4A2.8 2.8 0 0 1 19 9v2.6"/><path d="M3.4 12.4a2.1 2.1 0 0 1 4.2 0v2.2h8.8v-2.2a2.1 2.1 0 0 1 4.2 0v4.5a1.9 1.9 0 0 1-1.9 1.9H5.3a1.9 1.9 0 0 1-1.9-1.9z"/></svg>',
    living: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 8.6h5.6V19a2 2 0 0 1-2 2h-1.6a2 2 0 0 1-2-2z"/><path d="M10.6 8.6V5.4h2.8v3.2"/><line x1="13.4" y1="6.2" x2="19" y2="6.2"/><line x1="16.2" y1="3.4" x2="16.2" y2="4.6"/><line x1="18.4" y1="3.6" x2="18.4" y2="4.8"/></svg>'
  };

  /* ---------- helpers ---------- */

  function normalize(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/[\s\-_/.,()\[\]·:]/g, '');
  }

  function formatPrice(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '';
    return value.toLocaleString('ko-KR') + '원';
  }

  function searchableText(product) {
    return normalize([
      product.id,
      product.name,
      product.model,
      product.spec,
      product.platform,
      (product.keywords || []).join(' ')
    ].join(' '));
  }

  function matchesQuery(product, query) {
    var q = normalize(query);
    if (!q) return true;

    // 숫자만 입력: 001, 또는 1 / 01 처럼 번호의 일부
    if (/^\d+$/.test(q) && q.length <= 3) {
      var padded = q.padStart(3, '0');
      var id = String(product.id || '');
      if (id === padded || id.endsWith(q)) return true;
    }

    return searchableText(product).indexOf(q) !== -1;
  }

  function loadWishlist() {
    try {
      var raw = window.localStorage.getItem(WISH_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (error) {
      return [];
    }
  }

  function saveWishlist() {
    try {
      window.localStorage.setItem(WISH_KEY, JSON.stringify(state.wishlist));
    } catch (error) { /* 저장이 막힌 브라우저는 무시 */ }
  }

  function isWished(id) {
    return state.wishlist.indexOf(id) !== -1;
  }

  function toggleWish(id) {
    var index = state.wishlist.indexOf(id);
    if (index === -1) state.wishlist.push(id);
    else state.wishlist.splice(index, 1);
    saveWishlist();
    syncWishButtons(id);
    syncWishCount();
    if (state.view === 'wish') render();
  }

  function syncWishButtons(id) {
    var wished = isWished(id);
    Array.prototype.forEach.call(
      document.querySelectorAll('.wish[data-wish-id="' + id + '"]'),
      function (button) {
        button.setAttribute('aria-pressed', String(wished));
      }
    );
  }

  function syncWishCount() {
    var total = state.wishlist.length;
    el.wishCount.textContent = String(total);
    el.wishCount.hidden = total === 0;
  }

  /* ---------- analytics (GA4) ---------- */

  // 상품 카드의 '가격 확인하기' 클릭을 GA4 이벤트로 보낸다.
  // gtag가 없으면(스크립트 차단·미설치) 조용히 넘어간다.
  function trackProductClick(product) {
    if (typeof window.gtag !== 'function') return;
    var params = {
      product_id: product.id,
      product_title: product.name,
      merchant: product.platform || '',
      item_category: state.categoryLabels[product.category] || product.category || '',
      link_url: product.url || '',
      transport_type: 'beacon'
    };
    if (typeof product.price === 'number') {
      params.value = product.price;
      params.currency = 'KRW';
    }
    window.gtag('event', 'product_click', params);
  }

  /* ---------- filtering ---------- */

  function sortProducts(list) {
    var sorted = list.slice();
    if (state.sort === 'price') {
      sorted.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else {
      sorted.sort(function (a, b) { return String(b.id).localeCompare(String(a.id)); });
    }
    return sorted;
  }

  function filterProducts() {
    return sortProducts(state.products.filter(function (product) {
      if (state.view === 'wish' && !isWished(product.id)) return false;
      if (state.category !== 'all' && product.category !== state.category) return false;
      return matchesQuery(product, state.query);
    }));
  }

  /* ---------- rendering ---------- */

  function heartIcon() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 20.4c-4.9-3.2-8-6.3-8-9.8A4.6 4.6 0 0 1 12 7.8a4.6 4.6 0 0 1 8 2.8c0 3.5-3.1 6.6-8 9.8z');
    svg.appendChild(path);
    return svg;
  }

  function buildCard(product, options) {
    options = options || {};
    var card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-id', product.id);

    var thumb = document.createElement('div');
    thumb.className = 'thumb';

    var img = document.createElement('img');
    img.src = product.image || ('assets/products/' + product.id + '.jpg');
    img.alt = product.name;
    img.width = 800;
    img.height = 800;
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.appendChild(img);

    if (options.popular) {
      var popBadge = document.createElement('span');
      popBadge.className = 'pop-badge';
      popBadge.textContent = '인기';
      thumb.appendChild(popBadge);
    }

    var wish = document.createElement('button');
    wish.type = 'button';
    wish.className = 'wish';
    wish.setAttribute('data-wish-id', product.id);
    wish.setAttribute('aria-pressed', String(isWished(product.id)));
    wish.setAttribute('aria-label', product.name + ' 찜하기');
    wish.appendChild(heartIcon());
    wish.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggleWish(product.id);
    });
    thumb.appendChild(wish);

    card.appendChild(thumb);

    var label = document.createElement('p');
    label.className = 'card-label';
    label.textContent = 'NO. ' + product.id + ' · ' +
      (product.catLabel || state.categoryLabels[product.category] || '');
    card.appendChild(label);

    var title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = product.name;
    card.appendChild(title);

    var priceRow = document.createElement('p');
    priceRow.className = 'card-price';

    var price = document.createElement('span');
    price.className = 'price-value';
    price.textContent = formatPrice(product.price) || '가격 확인';
    priceRow.appendChild(price);

    if (typeof product.listPrice === 'number' && product.listPrice > product.price) {
      var listPrice = document.createElement('span');
      listPrice.className = 'price-list';
      listPrice.textContent = formatPrice(product.listPrice);
      priceRow.appendChild(listPrice);
    }
    card.appendChild(priceRow);

    var cta = document.createElement('a');
    cta.className = 'cta';
    cta.href = product.url;
    cta.target = '_blank';
    cta.rel = 'sponsored nofollow noopener';
    cta.setAttribute('aria-label', product.name + ' 가격 확인 (새 창)');
    cta.textContent = product.ctaLabel || '가격 확인하기';
    cta.addEventListener('click', function () {
      trackProductClick(product);
    });
    card.appendChild(cta);

    return card;
  }

  function renderPopular() {
    var shouldShow = state.view === 'home' && state.category === 'all' && !state.query;
    var list = shouldShow ? sortProducts(state.products.filter(function (product) {
      return product.popular === true;
    })) : [];

    if (!list.length) {
      el.popularSection.hidden = true;
      el.popularGrid.textContent = '';
      return;
    }

    var frag = document.createDocumentFragment();
    list.forEach(function (product) {
      frag.appendChild(buildCard(product, { popular: true }));
    });
    el.popularGrid.textContent = '';
    el.popularGrid.appendChild(frag);
    el.popularSection.hidden = false;
  }

  function render() {
    renderPopular();

    var results = filterProducts();
    var frag = document.createDocumentFragment();
    results.forEach(function (product) {
      frag.appendChild(buildCard(product));
    });

    el.list.textContent = '';
    el.list.appendChild(frag);

    var hasResults = results.length > 0;
    el.list.hidden = !hasResults;

    if (!state.data) {
      el.empty.hidden = true;
      el.count.textContent = '';
      return;
    }

    el.listTitle.textContent = state.view === 'wish' ? '찜한 상품' : '새롭게 발견한 꿀템';
    el.sortBtn.hidden = state.view === 'wish' && !hasResults;

    if (state.view === 'wish' && !state.wishlist.length) {
      el.empty.hidden = false;
      el.empty.querySelector('.empty-title').textContent = '찜한 상품이 없어요';
      el.empty.querySelector('.empty-sub').textContent = '카드 오른쪽 위 하트를 누르면 여기에 모아 볼 수 있어요.';
    } else {
      el.empty.hidden = hasResults;
      el.empty.querySelector('.empty-title').textContent = '찾는 상품이 없어요';
      el.empty.querySelector('.empty-sub').textContent = '번호(001)나 상품명, 모델명으로 다시 검색해 보세요.';
    }

    var total = state.products.length;
    if (state.view === 'wish') {
      el.count.innerHTML = '찜한 상품 <strong>' + results.length + '</strong>개';
    } else if (!state.query && state.category === 'all') {
      el.count.innerHTML = '전체 <strong>' + total + '</strong>개 상품';
    } else {
      el.count.innerHTML = '검색 결과 <strong>' + results.length + '</strong>개' +
        (results.length !== total ? ' / 전체 ' + total + '개' : '');
    }
  }

  function buildCategoryNav() {
    var categories = (state.data && state.data.categories) || [];
    el.nav.textContent = '';

    categories.forEach(function (category) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cat';
      button.setAttribute('data-category', category.id);
      button.setAttribute('aria-pressed', String(category.id === state.category));

      var icon = document.createElement('span');
      icon.className = 'cat-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = CATEGORY_ICONS[category.id] || CATEGORY_ICONS.all;
      button.appendChild(icon);

      var label = document.createElement('span');
      label.className = 'cat-label';
      label.textContent = category.label;
      button.appendChild(label);

      button.addEventListener('click', function () {
        state.category = category.id;
        Array.prototype.forEach.call(el.nav.querySelectorAll('.cat'), function (node) {
          node.setAttribute('aria-pressed', String(node === button));
        });
        if (state.view === 'wish') setView('home', { silent: true });
        render();
      });

      el.nav.appendChild(button);
    });
  }

  function renderChannels() {
    var channels = (state.data && state.data.channels) || [];
    el.channels.textContent = '';
    if (el.sheetChannels) el.sheetChannels.textContent = '';

    channels.forEach(function (channel) {
      [el.channels, el.sheetChannels].forEach(function (host) {
        if (!host) return;
        var link = document.createElement('a');
        link.className = 'channel';
        link.href = channel.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = channel.label;

        var arrow = document.createElement('span');
        arrow.className = 'channel-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        link.appendChild(arrow);

        host.appendChild(link);
      });
    });
  }

  function applyBrand() {
    var data = state.data || {};
    var brand = data.brand || {};

    if (brand.name && brand.nameEn) {
      el.brandName.textContent = brand.name;
      var en = document.createElement('span');
      en.textContent = brand.nameEn;
      el.brandName.appendChild(en);
    }
    // 헤더 한 줄 소개는 12자 안팎으로 짧게 유지한다
    el.brandTagline.textContent = '2030 신혼부부 가성비 꿀템';
    if (data.disclosure) el.disclosure.textContent = data.disclosure;

    var parts = [];
    if (data.pricePolicy) parts.push(data.pricePolicy);
    if (data.updatedAt) parts.push('가격 확인 기준일 ' + data.updatedAt);
    parts.push('표기 가격·재고는 판매처 사정에 따라 변동될 수 있습니다.');
    parts.push('링크는 제휴 링크이며, 구매 시 게토픽이 일정액의 수수료를 받습니다.');
    el.footerNote.textContent = parts.join(' · ');
  }

  /* ---------- events ---------- */

  function syncClearButton() {
    el.clear.hidden = el.search.value.length === 0;
  }

  function setView(view, options) {
    options = options || {};
    state.view = view;
    if (!options.silent) {
      Array.prototype.forEach.call(el.tabs, function (tab) {
        var active = tab.getAttribute('data-tab') === view;
        tab.classList.toggle('is-active', active);
        if (active) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      });
    }
    if (view === 'home') {
      state.category = 'all';
      state.query = '';
      el.search.value = '';
      syncClearButton();
      Array.prototype.forEach.call(el.nav.querySelectorAll('.cat'), function (node) {
        node.setAttribute('aria-pressed', String(node.getAttribute('data-category') === 'all'));
      });
    }
    render();
  }

  el.search.addEventListener('input', function () {
    state.query = el.search.value;
    syncClearButton();
    render();
  });

  el.search.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      el.search.value = '';
      state.query = '';
      syncClearButton();
      render();
    }
  });

  el.clear.addEventListener('click', function () {
    el.search.value = '';
    state.query = '';
    syncClearButton();
    el.search.focus();
    render();
  });

  el.sortBtn.addEventListener('click', function () {
    state.sort = state.sort === 'new' ? 'price' : 'new';
    el.sortBtn.textContent = state.sort === 'new' ? '최신 등록순' : '낮은 가격순';
    render();
  });

  el.tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      if (target === 'search') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        el.search.focus();
        return;
      }
      if (target === 'sns') {
        el.sheet.hidden = false;
        return;
      }
      setView(target === 'wish' ? 'wish' : 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-close-sheet]'), function (node) {
    node.addEventListener('click', function () { el.sheet.hidden = true; });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !el.sheet.hidden) el.sheet.hidden = true;
  });

  /* ---------- boot ---------- */

  function boot() {
    state.wishlist = loadWishlist();
    syncWishCount();

    fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        state.data = data;
        state.products = Array.isArray(data.products) ? data.products : [];
        (data.categories || []).forEach(function (category) {
          state.categoryLabels[category.id] = category.label;
        });
        if (!state.categoryLabels.all) state.categoryLabels.all = FALLBACK_CATEGORY_LABEL;
        state.category = 'all';

        applyBrand();
        buildCategoryNav();
        renderChannels();
        render();
      })
      .catch(function (error) {
        if (window.console && console.error) console.error('products.json load failed:', error);
        el.error.hidden = false;
        el.list.hidden = true;
        el.empty.hidden = true;
        el.popularSection.hidden = true;
        el.count.textContent = '';
        el.footerNote.textContent = '가격은 판매처 사정에 따라 변동될 수 있습니다.';
      });
  }

  boot();
})();
