// ============================================================
// Profile Page — index.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initSparkles();
  initNavScroll();
  loadHomeProjects();
});

// --- Home Projects (works marked with the purple star in Admin) ---
const HOME_PROJECT_LIMIT = 6;
let homeProjects = [];

// Card titles come from the API, so they need re-rendering on a language switch
window.addEventListener('languageChanged', () => {
  const list = document.getElementById('projectsList');
  if (list && homeProjects.length) renderHomeProjects(homeProjects, list);
});

async function loadHomeProjects() {
  const section = document.getElementById('projects');
  const list = document.getElementById('projectsList');
  if (!section || !list) return;

  try {
    const res = await fetch('/api/works?home=1');
    if (!res.ok) throw new Error('Request failed');
    const works = await res.json();
    if (!Array.isArray(works) || works.length === 0) return;

    homeProjects = works.slice(0, HOME_PROJECT_LIMIT);
    renderHomeProjects(homeProjects, list);
    section.style.display = '';
    // The section starts hidden, so the reveal observer never saw it.
    section.classList.add('visible');
  } catch (err) {
    console.error('Failed to load home projects:', err);
  }
}

function renderHomeProjects(works, list) {
  const lang = typeof getCurrentLang === 'function' ? getCurrentLang() : 'th';

  list.innerHTML = works.map((work, i) => {
    const title = work[`title_${lang}`] || work.title || '';
    const thumb = work.image_url || getYouTubeThumbnail(work.video_url);
    const tagsHtml = (work.tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => `<span class="project-tag">✦ ${escapeHtml(t)}</span>`)
      .join('');

    const media = thumb
      ? `<img src="${thumb}" alt="${escapeHtml(title)}" loading="lazy">`
      : '<span class="project-media-empty">🖼</span>';

    return `
      <a class="project-card glass-card" href="/work-detail?id=${work.id}" style="animation-delay:${i * 0.1}s">
        <div class="project-media">${media}</div>
        <div class="project-info">
          <h3 class="project-title">${escapeHtml(title)}</h3>
          <div class="project-tags">${tagsHtml}</div>
        </div>
      </a>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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

// --- Navigation Toggle ---
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    // Close on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }
}

// --- Scroll Reveal ---
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 150);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => observer.observe(el));
}

// --- Nav Scroll Effect ---
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// --- Sparkle Effect ---
function initSparkles() {
  const container = document.getElementById('sparkleContainer');
  if (!container) return;

  const colors = ['#c5a3ff', '#ffabd8', '#a8edca', '#ffb8a8', '#a8d8ff', '#ffe9a0'];

  function createSparkle() {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.animationDuration = (3 + Math.random() * 4) + 's';
    sparkle.style.animationDelay = Math.random() * 3 + 's';

    const color = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.background = color;
    sparkle.style.setProperty('color', color);

    container.appendChild(sparkle);

    // Remove and recreate
    setTimeout(() => {
      sparkle.remove();
      createSparkle();
    }, (6 + Math.random() * 4) * 1000);
  }

  // Create initial sparkles
  for (let i = 0; i < 15; i++) {
    setTimeout(() => createSparkle(), i * 300);
  }
}
