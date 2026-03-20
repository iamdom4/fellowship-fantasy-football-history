/* =============================================
   icons.js — SVG icon library (Lucide-style)
   All icons: 24×24 viewBox, stroke-based
   Usage: Icons.trophy({ size: 20, cls: 'my-class' })
   ============================================= */

const Icons = (() => {
  function i(paths, { size = 20, cls = '' } = {}) {
    return `<svg class="icon${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  return {
    trophy:    o => i('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>', o),
    ring:      o => i('<path d="M8 6h8l-1.5-3h-5L8 6z"/><path d="M8 6 6 9l6 9 6-9-2-3"/><line x1="6" y1="9" x2="18" y2="9"/><line x1="10" y1="6" x2="9" y2="9"/><line x1="14" y1="6" x2="15" y2="9"/><line x1="12" y1="9" x2="12" y2="18"/>', o),
    crown:     o => i('<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M2 20h20"/>', o),
    flame:     o => i('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>', o),
    skull:     o => i('<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/>', o),
    zap:       o => i('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', o),
    target:    o => i('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', o),
    calendar:  o => i('<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>', o),
    trendUp:   o => i('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>', o),
    trendDown: o => i('<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>', o),
    award:     o => i('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>', o),
    swords:    o => i('<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><polyline points="21 21 18 18 14 22"/><polyline points="14 4 4 14 6 16"/>', o),
    barChart:  o => i('<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>', o),
    star:      o => i('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', o),
    snowflake: o => i('<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>', o),
    alert:     o => i('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>', o),
    shield:    o => i('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', o),
    medal:     o => i('<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>', o),
    football:  o => i('<ellipse cx="12" cy="12" rx="10" ry="5.5"/><line x1="12" x2="12" y1="6.5" y2="17.5"/><line x1="8.5" x2="15.5" y1="9.5" y2="9.5"/><line x1="7.5" x2="16.5" y1="12" y2="12"/><line x1="8.5" x2="15.5" y1="14.5" y2="14.5"/>', o),
    users:     o => i('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', o),
    hash:         o => i('<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>', o),
    aragornCrown: o => i('<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M2 20h20"/>', o),
    clover:   o => i('<path d="M12 10c0-2.21-1.79-4-4-4a4 4 0 0 0 0 8c.34 0 .67-.04.98-.12A4 4 0 1 0 12 10z"/><path d="M12 10c0-2.21 1.79-4 4-4a4 4 0 0 1 0 8 3.98 3.98 0 0 1-.98-.12A4 4 0 1 1 12 10z"/><line x1="12" x2="12" y1="10" y2="22"/>', o),
    duck:     o => i('<path d="M10 2a4 4 0 0 0-4 4v2H4a2 2 0 0 0-2 2v1c0 1.1.9 2 2 2h1v1a6 6 0 0 0 12 0v-4a4 4 0 0 0-4-4h-1V6a4 4 0 0 0-2-4z"/><circle cx="14" cy="8" r="1" fill="currentColor" stroke="none"/>', o),
  };
})();
