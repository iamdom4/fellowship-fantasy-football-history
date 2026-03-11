/* =============================================
   nav.js — Shared navigation behaviour
   ============================================= */

(function () {
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  // ── Hamburger ──────────────────────────────
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // ── Dropdown toggles ───────────────────────
  // Desktop: CSS :hover + :focus-within handles show/hide.
  // Mobile:  JS toggles .open class to accordion-expand.
  document.querySelectorAll('.dropdown-toggle').forEach(el => {
    el.setAttribute('aria-expanded', 'false');

    el.addEventListener('click', function (e) {
      const dropdown = this.closest('.nav-dropdown');
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const isOpen = dropdown.classList.toggle('open');
        this.setAttribute('aria-expanded', String(isOpen));
      }
    });

    // Keep aria-expanded in sync on desktop focus/blur
    el.addEventListener('focus', function () {
      if (window.innerWidth > 768) {
        this.setAttribute('aria-expanded', 'true');
      }
    });
    el.addEventListener('blur', function () {
      if (window.innerWidth > 768) {
        const toggle = this;
        setTimeout(() => {
          const dropdown = toggle.closest('.nav-dropdown');
          if (dropdown && !dropdown.matches(':focus-within')) {
            toggle.setAttribute('aria-expanded', 'false');
          }
        }, 150);
      }
    });
  });

  // ── Escape key closes everything ───────────
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.nav-dropdown.open').forEach(dd => {
      dd.classList.remove('open');
      const toggle = dd.querySelector('.dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();
