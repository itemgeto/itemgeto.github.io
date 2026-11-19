/* ItemGeto · items page
 * data/products.json 하나만 고치면 목록이 바뀝니다.
 * 구조: { brand, updatedAt, disclosure, categories[], products[], channels[] }
 */
(function () {
  'use strict';

  var DATA_URL = 'data/products.json';
  var FALLBACK_CATEGORY_LABEL = '전체';

  var state = {
    data: null,
    products: [],
    category: 'all',
    query: '',
    categoryLabels: {}
  };

  var el = {
    search: document.getElementById('search'),
    clear: document.getElementById('search-clear'),
    chips: document.getElementById('category-chips'),
    list: document.getElementById('product-list'),
    empty: document.getElementById('empty'),
    error: document.getElementById('error'),
    count: document.getElementById('result-count'),
    channels: document.getElementById('channels'),
    footerNote: document.getElementById('footer-note'),
    disclosure: document.querySelector('.disclosure p'),
    brandName: document.querySelector('.brand-name'),
    brandTagline: document.querySelector('.brand-tagline')
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

  function filterProducts() {
    return state.products.filter(function (product) {
      if (state.category !== 'all' && product.category !== state.category) return false;
      return matchesQuery(product, state.query);
    });
  }

  /* ---------- rendering ---------- */

  function buildCard(product) {
    var card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-id', product.id);

    var top = document.createElement('div');
    top.className = 'card-top';

    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = product.id;
    top.appendChild(badge);

    var categoryLabel = state.categoryLabels[product.category];
    if (categoryLabel) {
      var catTag = document.createElement('span');
      catTag.className = 'cat-tag';
      catTag.textContent = categoryLabel;
      top.appendChild(catTag);
    }
    card.appendChild(top);

    var title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = product.name;
    card.appendChild(title);

    if (product.model) {
      var model = document.createElement('p');
      model.className = 'card-model';
      model.textContent = product.model;
      card.appendChild(model);
    }

    if (product.spec) {
      var spec = document.createElement('p');
      spec.className = 'card-spec';
      spec.textContent = product.spec;
      card.appendChild(spec);
    }

    var priceRow = document.createElement('div');
    priceRow.className = 'card-price';

    var price = document.createElement('span');
    price.className = 'price-value';
    price.textContent = formatPrice(product.price);
    priceRow.appendChild(price);

    if (product.priceNote) {
      var note = document.createElement('span');
      note.className = 'price-note';
      note.textContent = product.priceNote;
      priceRow.appendChild(note);
    }
    card.appendChild(priceRow);

    if (product.platform) {
      var platform = document.createElement('span');
      platform.className = 'platform';
      platform.setAttribute('data-platform', product.platformKey || '');
      platform.textContent = product.platform;
      card.appendChild(platform);
    }

    var actions = document.createElement('div');
    actions.className = 'card-actions';

    var cta = document.createElement('a');
    cta.className = 'cta';
    cta.href = product.url;
    cta.target = '_blank';
    cta.rel = 'sponsored nofollow noopener';
    cta.setAttribute('aria-label', product.name + ' 가격 확인 (새 창)');
    cta.appendChild(document.createTextNode(product.ctaLabel || '가격 확인하기'));

    var arrow = document.createElement('span');
    arrow.className = 'cta-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    cta.appendChild(arrow);

    actions.appendChild(cta);
    card.appendChild(actions);

    return card;
  }

  function render() {
    var results = filterProducts();
    var frag = document.createDocumentFragment();
    results.forEach(function (product) {
      frag.appendChild(buildCard(product));
    });

    el.list.textContent = '';
    el.list.appendChild(frag);

    var hasResults = results.length > 0;
    el.list.hidden = !hasResults;
    el.empty.hidden = hasResults || !state.data;

    if (!state.data) {
      el.count.textContent = '';
      return;
    }

    var total = state.products.length;
    if (!state.query && state.category === 'all') {
      el.count.innerHTML = '전체 <strong>' + total + '</strong>개 상품';
    } else {
      el.count.innerHTML = '검색 결과 <strong>' + results.length + '</strong>개' +
        (results.length !== total ? ' / 전체 ' + total + '개' : '');
    }
  }

  function renderChips() {
    var categories = (state.data && state.data.categories) || [];
    el.chips.textContent = '';

    categories.forEach(function (category) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = category.label;
      chip.setAttribute('aria-pressed', String(category.id === state.category));
      chip.addEventListener('click', function () {
        state.category = category.id;
        Array.prototype.forEach.call(
          el.chips.querySelectorAll('.chip'),
          function (node) {
            node.setAttribute('aria-pressed', String(node === chip));
          }
        );
        render();
      });
      el.chips.appendChild(chip);
    });
  }

  function renderChannels() {
    var channels = (state.data && state.data.channels) || [];
    el.channels.textContent = '';

    channels.forEach(function (channel) {
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

      el.channels.appendChild(link);
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
    if (brand.tagline) el.brandTagline.textContent = brand.tagline;
    if (data.disclosure) el.disclosure.textContent = data.disclosure;

    var parts = [];
    if (data.updatedAt) parts.push('가격 확인 기준일 ' + data.updatedAt);
    parts.push('표기 가격·재고는 판매처 사정에 따라 변동될 수 있습니다.');
    parts.push('링크는 제휴 링크이며, 구매 시 아이템게토가 일정액의 수수료를 받습니다.');
    el.footerNote.textContent = parts.join(' · ');
  }

  /* ---------- events ---------- */

  function syncClearButton() {
    el.clear.hidden = el.search.value.length === 0;
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

  /* ---------- boot ---------- */

  function boot() {
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
        state.category = data.categories && data.categories[0] ? data.categories[0].id : 'all';

        applyBrand();
        renderChips();
        renderChannels();
        render();
      })
      .catch(function (error) {
        if (window.console && console.error) console.error('products.json load failed:', error);
        el.error.hidden = false;
        el.list.hidden = true;
        el.empty.hidden = true;
        el.count.textContent = '';
        el.footerNote.textContent = '가격은 판매처 사정에 따라 변동될 수 있습니다.';
      });
  }

  boot();
})();
