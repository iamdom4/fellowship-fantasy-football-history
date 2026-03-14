/* =============================================
   nav.js — Collapsible sidebar navigation
   ============================================= */

(function () {
  const sidebar     = document.getElementById('sidebar');
  const overlay     = document.getElementById('sidebarOverlay');
  const collapseBtn = document.getElementById('sidebarCollapse');
  const openBtn     = document.getElementById('sidebarOpenBtn');
  const teamsToggle = document.getElementById('teamsToggle');
  const teamsList   = document.getElementById('teamsList');

  // ── Active page highlight ─────────────────────
  const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
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

  // Collapse btn toggles between collapsed rail and full sidebar on desktop
  collapseBtn.addEventListener('click', () => {
    if (isMobile()) return;
    if (document.body.classList.contains('sidebar-collapsed')) {
      expand();
    } else {
      collapse();
    }
  });

  // Open btn is only used on mobile
  openBtn.addEventListener('click', () => {
    if (isMobile()) {
      document.body.classList.add('sidebar-mobile-open');
    }
  });

  // ── Mobile overlay ────────────────────────────
  overlay.addEventListener('click', () => {
    document.body.classList.remove('sidebar-mobile-open');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('sidebar-mobile-open');
  });

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
