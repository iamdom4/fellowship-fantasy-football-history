/* =============================================
   nav.js — Collapsible sidebar navigation
   ============================================= */

(function () {
  const sidebar       = document.getElementById('sidebar');
  const overlay       = document.getElementById('sidebarOverlay');
  const collapseBtn   = document.getElementById('sidebarCollapse');
  const openBtn       = document.getElementById('sidebarOpenBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const teamsToggle   = document.getElementById('teamsToggle');
  const teamsList     = document.getElementById('teamsList');

  // ── Active page highlight ─────────────────────
  const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
  });

  // ── Auto-populate data-label for collapsed tooltips ──
  document.querySelectorAll('.sidebar-nav .sidebar-item').forEach(item => {
    if (!item.dataset.label) {
      const span = item.querySelector(':scope > span');
      if (span) item.dataset.label = span.textContent.trim();
    }
  });
  // Teams toggle tooltip
  const teamsToggleTip = document.getElementById('teamsToggle');
  if (teamsToggleTip && !teamsToggleTip.dataset.label) {
    teamsToggleTip.dataset.label = 'Teams';
  }
  // Team items: use title attribute as tooltip label
  document.querySelectorAll('.sidebar-team-item').forEach(item => {
    if (!item.dataset.label && item.title) item.dataset.label = item.title;
  });

  // ── Helpers ───────────────────────────────────
  const isMobile = () => window.innerWidth <= 900;

  function store(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // ── Sidebar collapse (desktop) ────────────────
  function collapse() {
    document.body.classList.add('sidebar-collapsed');
    store('sidebarCollapsed', '1');
  }
  function expand() {
    document.body.classList.remove('sidebar-collapsed');
    store('sidebarCollapsed', '0');
  }

  // Apply saved state on desktop without animation flash
  if (!isMobile() && recall('sidebarCollapsed') === '1') {
    document.body.classList.add('sidebar-collapsed');
  }

  // Collapse btn: closes sidebar on mobile, toggles rail on desktop
  collapseBtn.addEventListener('click', () => {
    if (isMobile()) {
      document.body.classList.remove('sidebar-mobile-open');
      return;
    }
    if (document.body.classList.contains('sidebar-collapsed')) {
      expand();
    } else {
      collapse();
    }
  });

  // Mobile top bar hamburger
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      document.body.classList.add('sidebar-mobile-open');
    });
  }

  // Legacy floating open btn (desktop only, if present)
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!isMobile()) expand();
    });
  }

  // ── Mobile overlay ────────────────────────────
  overlay.addEventListener('click', () => {
    document.body.classList.remove('sidebar-mobile-open');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('sidebar-mobile-open');
  });

  // ── Dynamic team list from LEAGUE_DATA ────────
  if (typeof LEAGUE_DATA !== 'undefined' && teamsList) {
    const allSeasons = Object.entries(LEAGUE_DATA)
      .filter(([, s]) => !s.error)
      .sort(([a], [b]) => Number(a) - Number(b));

    if (allSeasons.length) {
      const normalize = name => ({ 'Alyssa Gilliam': 'Alyssa Mirto', 'Tomas McGrath': 'Thomas McGrath' }[name] || name);

      // Build latest team name per owner (last season they appeared wins)
      const ownerLatest = {};
      for (const [yr, season] of allSeasons) {
        for (const t of season.teams || []) {
          const owner = normalize(t.owner);
          if (!ownerLatest[owner] || Number(yr) >= ownerLatest[owner].year) {
            ownerLatest[owner] = { year: Number(yr), teamName: (t.team_name || '').trim(), owner };
          }
        }
      }

      const [, latestSeason] = allSeasons[allSeasons.length - 1];
      const latestOwners = new Set((latestSeason.teams || []).map(t => normalize(t.owner)));
      const currentShort = new URLSearchParams(location.search).get('owner') || '';
      const isTeamPage   = location.pathname.includes('team.html');

      const sorted = Object.values(ownerLatest).sort((a, b) => {
        const aAlumni = !latestOwners.has(a.owner);
        const bAlumni = !latestOwners.has(b.owner);
        if (aAlumni !== bAlumni) return aAlumni ? 1 : -1;
        return a.owner.localeCompare(b.owner);
      });

      teamsList.innerHTML = sorted.map(({ owner, teamName }) => {
        const isAlumni = !latestOwners.has(owner);
        const logo = (typeof TEAM_LOGOS !== 'undefined') ? TEAM_LOGOS[owner] : null;
        const shortKey = typeof Utils !== 'undefined' ? Utils.shortOwner(owner) : owner.split(' ')[0];
        const href = `team.html?owner=${encodeURIComponent(shortKey)}`;
        const isActive = isTeamPage && currentShort === shortKey;
        const shortName = owner.split(' ')[0];
        const logoEl = logo
          ? `<img class="sidebar-team-logo" src="${logo}" alt="" loading="lazy"/>`
          : `<span class="sidebar-avatar">${owner.charAt(0)}</span>`;
        return `<a title="${teamName}" href="${href}"
            class="sidebar-item sidebar-team-item${isAlumni ? ' sidebar-alumni' : ''}${isActive ? ' active' : ''}"
            data-label="${shortName}">
          ${logoEl}<span>${teamName}</span>${isAlumni ? '<span class="sidebar-alumni-tag">Alumni</span>' : ''}
        </a>`;
      }).join('');
    }
  }

  // ── Teams accordion ───────────────────────────
  // sessionStorage: persists within the tab session, resets on refresh
  function sessionGet(key) { try { return sessionStorage.getItem(key); } catch(e) { return null; } }
  function sessionSet(key, val) { try { sessionStorage.setItem(key, val); } catch(e) {} }

  if (sessionGet('teamsOpen') === '1') {
    teamsList.classList.remove('teams-closed');
    teamsToggle.setAttribute('aria-expanded', 'true');
    teamsToggle.querySelector('.teams-chevron').style.transform = '';
  } else {
    teamsList.classList.add('teams-closed');
    teamsToggle.setAttribute('aria-expanded', 'false');
    teamsToggle.querySelector('.teams-chevron').style.transform = 'rotate(-90deg)';
  }

  teamsToggle.addEventListener('click', () => {
    const closing = !teamsList.classList.contains('teams-closed');
    teamsList.classList.toggle('teams-closed', closing);
    teamsToggle.setAttribute('aria-expanded', String(!closing));
    teamsToggle.querySelector('.teams-chevron').style.transform = closing ? 'rotate(-90deg)' : '';
    sessionSet('teamsOpen', closing ? '0' : '1');
  });
})();
