// ============================================================
// Work Detail Page — work-detail.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initNavScroll();
  loadWorkDetail();
  initFullscreen();
});

// --- State ---
let currentWork = null;
let allMedia = [];   // Array of { type: 'image'|'video', src: string, thumb: string }
let currentMediaIndex = 0;
let fullscreenIndex = 0;
let workDocs = [];         // Array of { title, url, embed }
let currentDocIndex = 0;
let docObserver = null;    // Defers the iframe load until the section is scrolled to

window.addEventListener('languageChanged', () => {
  renderDetail();
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

// --- Document Embed Helpers ---
// Google's share URLs are not embeddable as-is; each product has its own
// preview/embed form. Anything we don't recognise is passed through untouched
// (a direct .pdf link, for instance, renders in the iframe on its own).
function getDocEmbedUrl(url) {
  if (!url) return '';
  const u = url.trim();

  // Published-to-web links: docs.google.com/<kind>/d/e/<token>/pub|pubhtml
  let m = u.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (m) {
    const [, kind, id] = m;
    if (kind === 'presentation') return `https://docs.google.com/presentation/d/e/${id}/embed?start=false&loop=false`;
    if (kind === 'spreadsheets') return `https://docs.google.com/spreadsheets/d/e/${id}/pubhtml?widget=true&headers=false`;
    return `https://docs.google.com/document/d/e/${id}/pub?embedded=true`;
  }

  // Normal share links: docs.google.com/<kind>/d/<id>/edit?usp=sharing
  m = u.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    const [, kind, id] = m;
    if (kind === 'presentation') return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
    if (kind === 'spreadsheets') return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    return `https://docs.google.com/document/d/${id}/preview`;
  }

  // Drive files (PDF and friends), including links already rewritten to uc?id=
  m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

  return u;
}

function getDocIcon(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('/presentation/')) return '📊';
  if (u.includes('/spreadsheets/')) return '📈';
  if (u.includes('drive.google.com') || u.endsWith('.pdf')) return '📕';
  return '📄';
}

// --- Load Work Detail ---
async function loadWorkDetail() {
  const params = new URLSearchParams(window.location.search);
  const workId = params.get('id');

  if (!workId) {
    showError();
    return;
  }

  try {
    const res = await fetch(`/api/works/${workId}`);
    if (!res.ok) {
      showError();
      return;
    }

    currentWork = await res.json();
    document.getElementById('detailLoading').style.display = 'none';
    document.getElementById('detailContainer').style.display = '';
    renderDetail();
  } catch (err) {
    console.error('Failed to load work detail:', err);
    showError();
  }
}

function showError() {
  document.getElementById('detailLoading').style.display = 'none';
  document.getElementById('detailError').style.display = 'block';
}

// --- Render Detail ---
function renderDetail() {
  const work = currentWork;
  if (!work) return;

  const lang = getCurrentLang();
  const title = work[`title_${lang}`] || work.title;
  const description = work[`description_${lang}`] || work.description;

  // Update page title
  document.title = `${title} — Amonphan Jamratsri ✨`;

  // Breadcrumb
  document.getElementById('breadcrumbTitle').textContent = title;

  // Build media array
  allMedia = [];

  // Main image first
  if (work.image_url) {
    allMedia.push({ type: 'image', src: work.image_url, thumb: work.image_url });
  }

  // Videos
  const videosToProcess = work.videos && work.videos.length > 0 ? [...work.videos] : [];
  if (work.video_url && !videosToProcess.includes(work.video_url)) {
    videosToProcess.unshift(work.video_url);
  }

  videosToProcess.forEach(vUrl => {
    const videoId = getYouTubeId(vUrl);
    if (videoId) {
      allMedia.push({
        type: 'video',
        src: `https://www.youtube.com/embed/${videoId}?rel=0`,
        thumb: getYouTubeThumbnail(vUrl),
        videoUrl: vUrl
      });
    }
  });

  // Additional images
  if (work.images && work.images.length > 0) {
    work.images.forEach(img => {
      allMedia.push({ type: 'image', src: img, thumb: img });
    });
  }

  // If no media at all, use a placeholder
  if (allMedia.length === 0) {
    allMedia.push({
      type: 'image',
      src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'><rect width='400' height='225' fill='%23f0f0f0'/><text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='40'>🖼</text></svg>",
      thumb: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'><rect width='400' height='225' fill='%23f0f0f0'/><text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='40'>🖼</text></svg>"
    });
  }

  // Render gallery
  renderGallery();

  // Info panel — cover
  const infoCoverImg = document.getElementById('infoCoverImg');
  infoCoverImg.src = work.image_url || getYouTubeThumbnail(work.video_url) || '';
  infoCoverImg.alt = title;

  // Title
  document.getElementById('detailTitle').textContent = title;

  // Short description in info panel
  const descEl = document.getElementById('detailDesc');
  descEl.textContent = description || '';

  // Date
  const date = new Date(work.created_at);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('detailDate').textContent = dateStr;

  // Video link
  if (work.video_url) {
    document.getElementById('videoRow').style.display = '';
    const videoLink = document.getElementById('detailVideoLink');
    videoLink.href = work.video_url;
  }

  // Image count
  const imgCount = allMedia.filter(m => m.type === 'image').length;
  const vidCount = allMedia.filter(m => m.type === 'video').length;
  let countText = `${imgCount} images`;
  if (vidCount > 0) countText += ` + ${vidCount} videos`;
  document.getElementById('detailImgCount').textContent = countText;

  // Tags
  const tagsContainer = document.getElementById('detailTags');
  const tags = work.tags.split(',').map(t => t.trim()).filter(Boolean);
  tagsContainer.innerHTML = tags.map(tag =>
    `<a href="/works?tag=${encodeURIComponent(tag)}" class="detail-tag">${tag}</a>`
  ).join('');

  // Full description below
  if (description && description.length > 100) {
    document.getElementById('detailFullDesc').style.display = '';
    document.getElementById('fullDescContent').textContent = description;
  } else {
    document.getElementById('detailFullDesc').style.display = 'none';
  }

  // Documents at the very bottom
  renderDocuments();
}

// --- Documents ---
function renderDocuments() {
  const section = document.getElementById('detailDocs');
  const tabsEl = document.getElementById('docTabs');
  if (!section || !tabsEl) return;

  workDocs = (currentWork?.documents || [])
    .filter(d => d && d.url)
    .map(d => ({ title: d.title || '', url: d.url, embed: getDocEmbedUrl(d.url) }));

  if (workDocs.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // Tabs only make sense once there is something to switch between
  tabsEl.innerHTML = '';
  if (workDocs.length > 1) {
    workDocs.forEach((doc, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'doc-tab' + (i === currentDocIndex ? ' active' : '');
      const fallback = `${window.getI18n ? getI18n('doc_untitled') : 'Document'} ${i + 1}`;
      btn.textContent = `${getDocIcon(doc.url)} ${doc.title || fallback}`;
      btn.addEventListener('click', () => selectDocument(i));
      tabsEl.appendChild(btn);
    });
  }

  if (currentDocIndex >= workDocs.length) currentDocIndex = 0;
  selectDocument(currentDocIndex);
}

function selectDocument(index) {
  const doc = workDocs[index];
  if (!doc) return;
  currentDocIndex = index;

  const viewer = document.getElementById('docViewer');
  const frame = document.getElementById('docFrame');
  const openLink = document.getElementById('docOpenLink');

  openLink.href = doc.url;

  document.querySelectorAll('.doc-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // A language switch re-runs renderDetail(); don't reload an identical iframe.
  if (frame.dataset.loadedSrc === doc.embed) return;

  viewer.classList.remove('loaded');
  frame.onload = () => viewer.classList.add('loaded');

  // The first document waits for the section to come into view; switching tabs
  // afterwards loads immediately since the reader is already looking at it.
  if (frame.dataset.armed === '1') {
    frame.dataset.loadedSrc = doc.embed;
    frame.src = doc.embed;
  } else {
    frame.dataset.pending = doc.embed;
    armDocLazyLoad();
  }
}

function armDocLazyLoad() {
  const section = document.getElementById('detailDocs');
  const frame = document.getElementById('docFrame');
  if (!section || !frame || docObserver) return;

  const load = () => {
    frame.dataset.armed = '1';
    if (frame.dataset.pending) {
      frame.dataset.loadedSrc = frame.dataset.pending;
      frame.src = frame.dataset.pending;
    }
  };

  if (!('IntersectionObserver' in window)) {
    load();
    return;
  }

  docObserver = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      load();
      docObserver.disconnect();
      docObserver = null;
    }
  }, { rootMargin: '400px' });

  docObserver.observe(section);
}

// --- Gallery ---
function renderGallery() {
  renderThumbnails();
  selectMedia(0);
  initThumbNav();
}

function renderThumbnails() {
  const container = document.getElementById('galleryThumbs');
  container.innerHTML = '';

  allMedia.forEach((media, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb';
    if (index === 0) thumb.classList.add('active');

    const img = document.createElement('img');
    img.src = media.thumb;
    img.alt = `Media ${index + 1}`;
    img.loading = 'lazy';
    thumb.appendChild(img);

    if (media.type === 'video') {
      const badge = document.createElement('div');
      badge.className = 'thumb-play-badge';
      badge.textContent = '▶';
      thumb.appendChild(badge);
    }

    thumb.addEventListener('click', () => selectMedia(index));
    container.appendChild(thumb);
  });
}

function selectMedia(index) {
  if (index < 0 || index >= allMedia.length) return;
  
  const animClass = index > currentMediaIndex ? 'slide-left' : 'slide-right';
  currentMediaIndex = index;

  const media = allMedia[index];
  const mainImg = document.getElementById('galleryMainImg');
  const mainVideo = document.getElementById('galleryMainVideo');

  if (media.type === 'video') {
    mainImg.style.display = 'none';
    mainVideo.style.display = '';
    mainVideo.src = media.src;
  } else {
    mainVideo.style.display = 'none';
    mainVideo.src = '';
    mainImg.style.display = '';
    mainImg.src = media.src;
    mainImg.alt = currentWork?.title || '';
    
    // Trigger animation
    mainImg.classList.remove('slide-left', 'slide-right');
    void mainImg.offsetWidth; // trigger reflow
    mainImg.classList.add(animClass);
  }

  // Update active thumb
  document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === index);
  });

  // Scroll active thumb into view
  const activeThumb = document.querySelectorAll('.gallery-thumb')[index];
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function initThumbNav() {
  const container = document.getElementById('galleryThumbs');
  const prevBtn = document.getElementById('thumbPrev');
  const nextBtn = document.getElementById('thumbNext');
  const mainPrevBtn = document.getElementById('mainPrev');
  const mainNextBtn = document.getElementById('mainNext');

  // Main Image Navigation
  if (mainPrevBtn) {
    mainPrevBtn.addEventListener('click', () => {
      let nextIndex = currentMediaIndex - 1;
      if (nextIndex < 0) nextIndex = allMedia.length - 1; // loop around
      selectMedia(nextIndex);
    });
  }
  if (mainNextBtn) {
    mainNextBtn.addEventListener('click', () => {
      let nextIndex = currentMediaIndex + 1;
      if (nextIndex >= allMedia.length) nextIndex = 0; // loop around
      selectMedia(nextIndex);
    });
  }

  // Thumbnail Strip Scrolling & Image Navigation
  prevBtn.addEventListener('click', () => {
    container.scrollBy({ left: -240, behavior: 'smooth' });
    let nextIndex = currentMediaIndex - 1;
    if (nextIndex < 0) nextIndex = allMedia.length - 1;
    selectMedia(nextIndex);
  });

  nextBtn.addEventListener('click', () => {
    container.scrollBy({ left: 240, behavior: 'smooth' });
    let nextIndex = currentMediaIndex + 1;
    if (nextIndex >= allMedia.length) nextIndex = 0;
    selectMedia(nextIndex);
  });

  // Keyboard navigation for gallery
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('fullscreenOverlay');
    if (overlay.classList.contains('active')) return; // fullscreen handles its own keys

    if (e.key === 'ArrowLeft') {
      selectMedia(currentMediaIndex - 1);
    } else if (e.key === 'ArrowRight') {
      selectMedia(currentMediaIndex + 1);
    }
  });

  // Fullscreen button
  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (allMedia[currentMediaIndex]?.type === 'image') {
      openFullscreen(currentMediaIndex);
    }
  });

  // Click main image to go fullscreen
  document.getElementById('galleryMainImg').addEventListener('click', () => {
    openFullscreen(currentMediaIndex);
  });
}

// --- Fullscreen Lightbox ---
function initFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  const closeBtn = document.getElementById('fullscreenClose');
  const prevBtn = document.getElementById('fullscreenPrev');
  const nextBtn = document.getElementById('fullscreenNext');

  closeBtn.addEventListener('click', closeFullscreen);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFullscreen();
  });

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateFullscreen(-1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateFullscreen(1);
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeFullscreen();
    if (e.key === 'ArrowLeft') navigateFullscreen(-1);
    if (e.key === 'ArrowRight') navigateFullscreen(1);
  });
}

function openFullscreen(startIndex) {
  // Only images in fullscreen
  const imageIndices = allMedia
    .map((m, i) => m.type === 'image' ? i : -1)
    .filter(i => i >= 0);

  if (imageIndices.length === 0) return;

  // Find closest image index
  let fsIdx = imageIndices.indexOf(startIndex);
  if (fsIdx === -1) fsIdx = 0;
  fullscreenIndex = fsIdx;

  updateFullscreenImage(imageIndices);

  const overlay = document.getElementById('fullscreenOverlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateFullscreen(direction) {
  const imageIndices = allMedia
    .map((m, i) => m.type === 'image' ? i : -1)
    .filter(i => i >= 0);

  if (imageIndices.length === 0) return;

  fullscreenIndex += direction;
  if (fullscreenIndex < 0) fullscreenIndex = imageIndices.length - 1;
  if (fullscreenIndex >= imageIndices.length) fullscreenIndex = 0;

  updateFullscreenImage(imageIndices);
}

function updateFullscreenImage(imageIndices) {
  const mediaIdx = imageIndices[fullscreenIndex];
  const media = allMedia[mediaIdx];
  const img = document.getElementById('fullscreenImg');
  img.src = media.src;
  img.alt = currentWork?.title || '';

  const counter = document.getElementById('fullscreenCounter');
  counter.textContent = `${fullscreenIndex + 1} / ${imageIndices.length}`;

  // Also select in main gallery
  selectMedia(mediaIdx);
}
