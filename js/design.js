/* =============================================
   design.js — Shared design constants
   Single source of truth for all chart rendering,
   SVG parameters, and visual tokens.

   Load this after icons.js and before any page script.
   ============================================= */

const DESIGN = (() => {

  // ── Team colors ──────────────────────────────────────────────────
  // Canonical 14-color palette used by every PR chart on the site.
  // Previously duplicated as PR_HOME_COLORS (home.js) and CHART_COLORS
  // (powerRankings.js) — now one source of truth.
  const chartColors = [
    '#c9a227','#e07b7b','#7baee0','#7bcca0','#b39ddb',
    '#e0a87b','#7bcfcb','#e07bb5','#d4c97a','#7bd4e0',
    '#e09a7b','#a3c97b','#9db3cc','#c4a07b',
  ];

  // ── SVG chart rendering parameters ───────────────────────────────
  // Used by renderHomePRChart (home.js) and renderChart (powerRankings.js).
  // page-specific overrides (e.g. M.right for inline labels) stay local.
  const chart = {
    // Default margins — home chart (no inline labels)
    margin:        { top: 28, right: 24, bottom: 48, left: 54 },

    // Minimum SVG width before horizontal scroll activates
    minWidth:      500,

    // Per-unit spacing in the chart coordinate system
    weekSpacing:   44,    // px per week column  (home chart)
    rankSpacing:   40,    // px per rank row     (home chart)
    minInnerW:     320,
    minInnerH:     320,

    // Lines and dots
    lineWidth:      2.5,
    lineWidthFaded: 1.5,
    dotRadius:      5,
    dotStrokeWidth: 2.5,

    // SVG text
    rankLabelSize:  15,   // rank axis (Y) labels
    weekLabelSize:  14,   // week axis (X) labels
    nameLabelSize:  15,   // inline team name labels (powerRankings.html only)
    nameLabelWeight:700,
    fontFamily:    'Barlow Condensed, sans-serif',
    fontWeight:     600,
  };

  // ── Color tokens ─────────────────────────────────────────────────
  // SVG attributes cannot use CSS custom properties (fill="var(--bg-primary)"
  // does not work in all contexts). Mirror the CSS :root values here.
  const colors = {
    bgPrimary:     '#070b12',            // --bg-primary
    bgCard:        '#0d1421',            // --bg-card
    border:        '#161f2e',            // --border
    borderGold:    'rgba(201,162,39,0.28)',  // --border-gold
    accentGold:    '#c9a227',            // --accent-gold
    textSecondary: '#8b9aad',            // --text-secondary
    textMuted:     '#667788',            // --text-muted
    gridLine:      'rgba(255,255,255,0.05)',
    gridLineFaint: 'rgba(255,255,255,0.04)',
  };

  // ── Tooltip ───────────────────────────────────────────────────────
  // Shared inline CSS string for all chart hover tooltips.
  const tooltipStyle = [
    'position:fixed',
    'background:#0d1421',
    'border:1px solid rgba(201,162,39,0.35)',
    'border-radius:6px',
    'padding:7px 12px',
    'font-size:0.8rem',
    'color:#e2e8f0',
    'pointer-events:none',
    'opacity:0',
    'transition:opacity 0.12s',
    'z-index:200',
    'font-family:Barlow,sans-serif',
    'white-space:nowrap',
  ].join(';') + ';';

  return { chartColors, chart, colors, tooltipStyle };

})();
