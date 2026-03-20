/* =============================================
   blog.js — Blog page (Beehiiv RSS via rss2json)
   ============================================= */

(function () {
  const FEED_URL = 'https://rss.beehiiv.com/feeds/FoRgH2KsTV.xml';
  const API_URL  = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_URL);
  const container = document.getElementById('blogFeed');

  // ── Helpers ───────────────────────────────────

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function readTime(content) {
    const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  function authorColor(name) {
    const colors = ['#c9a227', '#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // ── Render states ─────────────────────────────

  function showSpinner() {
    container.innerHTML = '<div class="blog-spinner" role="status" aria-label="Loading posts"><span></span><span></span><span></span></div>';
  }

  function showError(msg) {
    container.innerHTML = `<div class="error-banner" role="alert"><p>${msg}</p></div>`;
  }

  function extractFirstImg(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const img = tmp.querySelector('img[src]');
    return img ? img.src : null;
  }

  function renderPosts(items, defaultThumb, archiveUrl) {
    if (!items || items.length === 0) {
      showError('No posts found. Check back soon.');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'blog-grid';

    items.forEach(item => {
      const date    = formatDate(item.pubDate);
      const mins    = readTime(item.content);
      const title   = item.title || 'Untitled';
      const tagline = stripHtml(item.description).trim();
      const author  = item.author || '';
      const link    = item.link || '#';
      const color   = authorColor(author);
      const initial = (author || '?')[0].toUpperCase();
      const thumb   = item.thumbnail
                   || (item.enclosure && (item.enclosure.link || item.enclosure.url))
                   || extractFirstImg(item.content)
                   || defaultThumb;

      const card = document.createElement('a');
      card.className = 'blog-card';
      card.href = link;

      card.innerHTML = `
        <div class="blog-thumb">
          ${thumb ? `<img src="${thumb}" alt="" loading="lazy" />` : ''}
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <span class="blog-card-date">${date}${mins ? ` &bull; ${mins} min read` : ''}</span>
          </div>
          <div class="blog-card-title">${title}</div>
          ${tagline ? `<div class="blog-card-tagline">${tagline}</div>` : ''}
          ${author ? `
          <div class="blog-card-author">
            <span class="blog-author-avatar" style="background:${color}">${initial}</span>
            <span class="blog-author-name">${author}</span>
          </div>` : ''}
        </div>`;

      grid.appendChild(card);
    });

    const cta = document.createElement('div');
    cta.className = 'blog-archive-wrap';
    cta.innerHTML = `
      <div class="blog-archive-copy">
        <span class="blog-archive-label">Newsletter Archive</span>
        <div class="blog-archive-heading">Want to read more?</div>
        <div class="blog-archive-sub">Browse every issue from the full Fellowship archive.</div>
      </div>
      <a href="${archiveUrl}" class="blog-archive-btn">
        Previous newsletters
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>`;

    container.innerHTML = '';
    container.appendChild(grid);
    container.appendChild(cta);
  }

  // ── Fetch ─────────────────────────────────────

  showSpinner();

  fetch(API_URL)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.status !== 'ok') throw new Error('Feed error');
      const defaultThumb  = 'The Fellowship 2 (Ring).svg';
      const archiveUrl    = data.feed && data.feed.link  ? data.feed.link  : '#';
      renderPosts(data.items.slice(0, 9), defaultThumb, archiveUrl);
    })
    .catch(() => {
      showError('Could not load posts right now. Please try again later.');
    });
})();
