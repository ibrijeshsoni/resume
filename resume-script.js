/**
 * resume-script.js
 *
 * Features:
 *  1. TAB SWITCHING  — nav clicks show one section at a time
 *  2. EXPORT PDF     — temporarily reveals ALL tabs, captures live layout,
 *                      then restores the previously active tab
 *  3. THEME SWITCHER — 6 colour themes, persisted in localStorage
 *  4. DARK / LIGHT   — mode toggle, persisted in localStorage
 *  5. BACK TO TOP    — appears after scrolling 300 px
 */

(function () {
  'use strict';

  /* ── Constants ────────────────────────────────────── */
  const ROOT = document.documentElement;
  const THEMES = ['navy', 'forest', 'crimson', 'slate', 'amber', 'violet'];
  const TAB_IDS = ['experience', 'projects', 'skills'];
  const LS_THEME = 'resume_theme';
  const LS_MODE = 'resume_mode';
  const LS_TAB = 'resume_tab';

  /* ── Track active tab ─────────────────────────────── */
  let activeTab = localStorage.getItem(LS_TAB) || 'experience';

  /* ── Apply theme & mode before first paint ─────────── */
  const savedTheme = localStorage.getItem(LS_THEME) || 'navy';
  const savedMode = localStorage.getItem(LS_MODE) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  applyTheme(savedTheme);
  applyMode(savedMode);

  /* ── DOM ready ──────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    syncSwatches(savedTheme);
    syncModeButton(savedMode);

    /* ── 1. TAB SWITCHING ───────────────────────────── */
    const navLinks = document.querySelectorAll('.page-nav a[data-tab]');

    /* Initialise tabs — show saved/default, hide others */
    activateTab(activeTab, false); // false = no animation on load

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault(); // prevent anchor scroll jump
        const tab = link.getAttribute('data-tab');
        if (tab === activeTab) return; // already active
        activateTab(tab, true);
        localStorage.setItem(LS_TAB, tab);
      });
    });

    /* ── 2. THEME SWATCHES ──────────────────────────── */
    document.querySelectorAll('.swatch').forEach(function (el) {
      el.addEventListener('click', function () {
        const theme = el.getAttribute('data-theme');
        applyTheme(theme);
        syncSwatches(theme);
        localStorage.setItem(LS_THEME, theme);
      });
    });

    /* ── 3. MODE TOGGLE ─────────────────────────────── */
    const modeBtn = document.getElementById('mode-toggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        const next = ROOT.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
        applyMode(next);
        syncModeButton(next);
        localStorage.setItem(LS_MODE, next);
      });
    }

    /* ── 4. EXPORT BUTTON ───────────────────────────── */
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', exportPDF);

    /* ── 5. BACK TO TOP ─────────────────────────────── */
    const scrollEl = document.querySelector('.side_Right') || window;
    const topBtn = document.getElementById('back-to-top');

    scrollEl.addEventListener('scroll', function () {
      if (!topBtn) return;
      const top = scrollEl === window ? window.scrollY : scrollEl.scrollTop;
      topBtn.classList.toggle('visible', top > 300);
    }, { passive: true });

    if (topBtn) {
      topBtn.addEventListener('click', function () {
        (scrollEl === window ? window : scrollEl)
          .scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });

  /* ============================================================
     TAB LOGIC
  ============================================================ */

  /**
   * activateTab(tabId, animate)
   * Shows the panel matching tabId, hides all others,
   * and marks the matching nav link as active.
   */
  function activateTab(tabId, animate) {
    if (!TAB_IDS.includes(tabId)) tabId = 'experience';
    activeTab = tabId;

    TAB_IDS.forEach(function (id) {
      const panel = document.getElementById(id);
      if (!panel) return;

      if (id === tabId) {
        panel.classList.remove('tab-hidden');
        if (animate) {
          /* Re-trigger animation by toggling the class */
          panel.classList.remove('tab-visible');
          void panel.offsetWidth; // force reflow
          panel.classList.add('tab-visible');
        } else {
          panel.classList.add('tab-visible');
        }
      } else {
        panel.classList.remove('tab-visible');
        panel.classList.add('tab-hidden');
      }
    });

    /* Update nav link active states */
    document.querySelectorAll('.page-nav a[data-tab]').forEach(function (link) {
      link.classList.toggle('nav-active', link.getAttribute('data-tab') === tabId);
    });
  }

  /* ============================================================
     EXPORT PDF
     1. Remember which tab is active
     2. Temporarily show ALL tab panels (CSS handles this via
        body.pdf-export-mode  overriding  .tab-hidden)
     3. Add pdf-export-mode → hides toolbar / nav / back-to-top
     4. Wait for browser repaint (double rAF)
     5. html2pdf captures #resume-main (the live .shadowBox)
     6. Remove pdf-export-mode → restore previous tab
  ============================================================ */
  window.exportPDF = function () {
    const resumeEl = document.getElementById('resume-main');
    const exportBtn = document.getElementById('btn-export');

    /* Fallback: browser print */
    if (typeof html2pdf === 'undefined' || !resumeEl) {
      const t = document.title;
      document.title = 'Brijesh_Soni_Resume';
      window.print();
      document.title = t;
      return;
    }

    /* Lock button */
    if (exportBtn) {
      exportBtn.classList.add('exporting');
      exportBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating…';
    }

    const tabToRestore = activeTab; // remember before we show all

    /* Step 1: apply export mode
       CSS rule:  body.pdf-export-mode .areaBox.tab-hidden { display: block !important }
       so all panels become visible without touching their classes */
    document.body.classList.add('pdf-export-mode');

    /* Step 2: wait two frames for repaint */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {

        const opt = {
          margin: 0,
          filename: 'Brijesh_Soni_Resume.pdf',
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            logging: false,
            letterRendering: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(resumeEl).save()
          .then(restoreAfterExport)
          .catch(function (err) {
            console.error('PDF export failed:', err);
            restoreAfterExport();
          });

        function restoreAfterExport() {
          /* Remove export mode — hidden tab panels are hidden again via CSS */
          document.body.classList.remove('pdf-export-mode');

          /* Re-activate the previously active tab (re-applies tab-hidden to others) */
          activateTab(tabToRestore, false);

          /* Restore button */
          if (exportBtn) {
            exportBtn.classList.remove('exporting');
            exportBtn.innerHTML = '<i class="fa fa-file-pdf-o"></i> Export to PDF';
          }
        }

      });
    });
  };

  /* ============================================================
     HELPERS
  ============================================================ */

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'navy';
    ROOT.setAttribute('data-theme', theme);
  }

  function applyMode(mode) {
    ROOT.setAttribute('data-mode', mode === 'dark' ? 'dark' : 'light');
  }

  function syncSwatches(active) {
    document.querySelectorAll('.swatch').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-theme') === active);
    });
  }

  function syncModeButton(mode) {
    const btn = document.getElementById('mode-toggle');
    if (!btn) return;
    const icon = btn.querySelector('.icon');
    const lbl = btn.querySelector('.label');
    if (mode === 'dark') {
      if (icon) icon.textContent = '☀️';
      if (lbl) lbl.textContent = 'Light Mode';
    } else {
      if (icon) icon.textContent = '🌙';
      if (lbl) lbl.textContent = 'Dark Mode';
    }
  }


  // Disable Right Click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

})();
