// ============================================================
// Works Page — works.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initNavScroll();
  readUrlTag();
  showLoading();
  loadTags();
  loadWorks();
});

let allWorks = [];
let activeTag = 'all';
let isLoading = true;

const SKELETON_COUNT = 6;

// Handle language change
window.addEventListener('languageChanged', () => {
  renderWorks();
});

// --- Navigation ---
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }
}

function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// --- Check URL tag param ---
function readUrlTag() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');
  if (tag) activeTag = tag;
}

// --- Loading State ---
// Fill the grid with skeleton cards so the page never looks empty
// while /api/works is still in flight.
function showLoading() {
  isLoading = true;

  const grid = document.getElementById('worksGrid');
  const emptyState = document.getElementById('emptyState');
  const label = document.getElementById('worksLoading');

  if (emptyState) emptyState.style.display = 'none';
  if (label) label.style.display = '';
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: SKELETON_COUNT }, (_, i) => `
    <div class="skeleton-card" style="--sk-delay:${(i * 0.12).toFixed(2)}s" aria-hidden="true">
      <div class="sk-media sk-shimmer"></div>
      <div class="sk-body">
        <div class="sk-line sk-line-title sk-shimmer"></div>
        <div class="sk-line sk-shimmer"></div>
        <div class="sk-line sk-line-short sk-shimmer"></div>
        <div class="sk-tags">
          <span class="sk-tag sk-shimmer"></span>
          <span class="sk-tag sk-shimmer"></span>
        </div>
      </div>
    </div>`).join('');
}

function hideLoading() {
  isLoading = false;

  const grid = document.getElementById('worksGrid');
  const label = document.getElementById('worksLoading');

  if (label) label.style.display = 'none';
  if (grid) grid.setAttribute('aria-busy', 'false');
}

// --- YouTube Helpers ---
function getYouTubeId(url) {
  if (!url) return null;
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

// --- Load Tags ---
let tagMeta = []; // Store tag metadata for use in rendering

async function loadTags() {
  try {
    const res = await fetch('/api/tags');
    const tags = await res.json();
    tagMeta = tags; // Store for use in renderWorks
    const container = document.getElementById('tagFilters');
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-btn' + (tag.is_highlighted ? ' tag-btn-highlighted' : '');
      btn.dataset.tag = tag.name;
      btn.textContent = tag.is_highlighted ? `⭐ ${tag.name}` : tag.name;
      btn.addEventListener('click', () => filterByTag(tag.name));
      container.appendChild(btn);
    });
    syncTagButtons(); // reflect ?tag= coming from the URL
  } catch (err) {
    console.error('Failed to load tags:', err);
  }
}

function syncTagButtons() {
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === activeTag);
  });
}

// --- Filter By Tag ---
function filterByTag(tag) {
  activeTag = tag;
  syncTagButtons();
  renderWorks();
}

// --- Load Works ---
async function loadWorks() {
  const emptyState = document.getElementById('emptyState');

  try {
    const res = await fetch('/api/works');
    allWorks = await res.json();
    hideLoading();
    renderWorks();
  } catch (err) {
    hideLoading();
    console.error('Failed to load works:', err);
    const grid = document.getElementById('worksGrid');
    if (grid) grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  }
}

// --- Render Works ---
function renderWorks() {
  const grid = document.getElementById('worksGrid');
  const emptyState = document.getElementById('emptyState');

  // Still fetching — keep the skeletons on screen instead of
  // flashing the "no works found" state.
  if (isLoading) {
    showLoading();
    return;
  }

  const filtered = activeTag === 'all'
    ? allWorks
    : allWorks.filter(w => w.tags.split(',').map(t => t.trim()).includes(activeTag));

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = '';

  filtered.forEach((work, i) => {
    const card = document.createElement('div');
    card.className = 'work-card';
    card.style.animationDelay = `${i * 0.08}s`;

    const lang = getCurrentLang();
    const title = work[`title_${lang}`] || work.title;
    const desc = work[`description_${lang}`] || work.description;

    const tags = work.tags.split(',').map(t => t.trim());
    const tagsHtml = tags.map(t => {
      const meta = tagMeta.find(m => m.name === t);
      const isHighlighted = meta && meta.is_highlighted;
      const cls = isHighlighted ? 'card-tag card-tag-highlighted' : 'card-tag';
      return `<span class="${cls}">${isHighlighted ? '⭐ ' : ''}${t}</span>`;
    }).join('');

    const thumbSrc = work.image_url || getYouTubeThumbnail(work.video_url);
    const videoBadge = work.video_url ? '<span class="video-badge">▶ Video</span>' : '';

    // Image count badge
    const totalImages = 1 + (work.images ? work.images.length : 0);
    const imgCountBadge = totalImages > 1
      ? `<span class="img-count-badge">🖼 ${totalImages}</span>`
      : '';

    // Star badge
    const starBadge = work.is_starred ? `<div class="star-badge" title="Featured Work">⭐</div>` : '';

    const recBadge = work.is_starred ? '<span class="recommended-badge">⭐ Featured</span>' : '';

    // Shimmer stays on the media box until the thumbnail decodes;
    // no thumbnail at all goes straight to the placeholder state.
    const mediaState = thumbSrc ? 'media-loading' : 'media-error';
    const thumbHtml = thumbSrc
      ? `<img src="${thumbSrc}" alt="${title}" loading="lazy">`
      : '';

    card.innerHTML = `
      <div class="card-media ${mediaState}">
        ${thumbHtml}
        ${videoBadge}
        ${imgCountBadge}
        ${starBadge}
      </div>
      <div class="card-body">
        <h3 class="card-title">${title} ${recBadge}</h3>
        <p class="card-desc">${desc || ''}</p>
        <div class="card-tags">${tagsHtml}</div>
      </div>
    `;

    trackThumbLoad(card.querySelector('.card-media img'));

    // Navigate to detail page instead of lightbox
    card.addEventListener('click', () => {
      window.location.href = `/work-detail?id=${work.id}`;
    });

    grid.appendChild(card);
  });
}

// --- Per-thumbnail loading state ---
function trackThumbLoad(img) {
  if (!img) return;
  const media = img.parentElement;

  const done = () => media.classList.remove('media-loading');
  const failed = () => {
    media.classList.remove('media-loading');
    media.classList.add('media-error');
  };

  // A cached image can already be complete before the listeners attach.
  if (img.complete) {
    if (img.naturalWidth) done();
    else failed();
    return;
  }

  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', failed, { once: true });
}

// --- "All" tag click ---
document.querySelector('.tag-btn[data-tag="all"]')?.addEventListener('click', () => filterByTag('all'));
