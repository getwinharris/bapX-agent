// bapX Onboarding Tour — 5-step walkthrough for first-time visitors
// Exports: startTour() — call from dashboard.js after dashboard init
// Auto-starts on DOMContentLoaded if localStorage flag 'bapx_tour_completed' is not set
//
// Steps:
//   1. Welcome — highlights sidebar, explains 3-column layout
//   2. Chat input — highlights the message input area
//   3. Sidebar nav — highlights nav items (Skills, Settings, etc.)
//   4. Right panel — highlights Flow/Browser/Terminal tabs
//   5. Start building — final step with dismiss button

(function () {
  'use strict';

  // ── Tour steps definition ──
  const STEPS = [
    {
      selector: '#sidebar',
      title: 'Welcome to bapX!',
      body: 'bapX uses a powerful <strong>3-column layout</strong>. The <strong>sidebar</strong> on the left lets you navigate between views. The <strong>center</strong> is where you chat with your agent. The <strong>right panel</strong> shows activity, browser, and terminal.',
      placement: 'right',
      interactive: false,
    },
    {
      selector: '.chat-input-area',
      title: 'Chat with your agent',
      body: 'Type your messages here and press <strong>Enter</strong> to send. Use <strong>Shift+Enter</strong> for multi-line. Start a message with <code>/</code> for slash commands like <code>/model</code> or <code>/skills</code>.',
      placement: 'top',
      interactive: false,
    },
    {
      selector: '#sidebar-nav',
      title: 'Switch views',
      body: 'Use these navigation items to explore different parts of bapX. <strong>Chat</strong> for conversations, <strong>Skills</strong> to install capabilities, <strong>Settings</strong> to configure providers and your account, and more.',
      placement: 'right',
      interactive: false,
    },
    {
      selector: '.rp-tabs',
      title: 'Right Panel',
      body: 'The right panel gives you <strong>three tools</strong>: <strong>Flow</strong> shows your agent\'s activity stream, <strong>Browser</strong> lets you navigate the web, and <strong>Terminal</strong> provides a sandbox command line.',
      placement: 'left',
      interactive: false,
    },
    {
      selector: null, // no highlight — centered final step
      title: 'You\'re all set!',
      body: '✨ Start building with bapX. Chat with your AI agent, install skills, connect providers, and deploy projects — all from one place.',
      placement: 'center',
      interactive: false,
    },
  ];

  const TOUR_KEY = 'bapx_tour_completed';

  // ── State ──
  let currentStep = 0;
  let overlayEl = null;
  let tooltipEl = null;
  let highlightEl = null;
  let isActive = false;

  // ── DOM helpers ──
  function qs(sel, parent) {
    return (parent || document).querySelector(sel);
  }

  function createEl(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function removeEl(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── Position calculation ──
  function getElementRect(selector) {
    if (!selector) return null;
    const el = qs(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return rect;
  }

  function calculatePosition(stepIndex, targetRect) {
    const step = STEPS[stepIndex];
    if (!step) return { top: 0, left: 0, placement: 'bottom' };

    // Step 5: center on screen
    if (step.placement === 'center' || !targetRect) {
      return { top: 0, left: 0, placement: 'center' };
    }

    const tooltipW = Math.min(360, window.innerWidth - 32);
    const gap = 14; // gap between highlight and tooltip
    let top, left, placement;

    switch (step.placement) {
      case 'right':
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - 80;
        placement = 'right';
        break;
      case 'left':
        left = targetRect.left - tooltipW - gap;
        top = targetRect.top + targetRect.height / 2 - 80;
        placement = 'left';
        break;
      case 'top':
        top = targetRect.top - 160;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        placement = 'bottom'; // arrow points down (tooltip above)
        break;
      case 'bottom':
      default:
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        placement = 'top';
        break;
    }

    // Clamp to viewport
    if (left < 12) left = 12;
    if (left + tooltipW > window.innerWidth - 12) {
      left = window.innerWidth - tooltipW - 12;
    }
    if (top < 12) top = 12;
    if (top + 220 > window.innerHeight - 12) {
      top = window.innerHeight - 220 - 12;
    }

    return { top, left, placement };
  }

  function addHighlightStyles() {
    if (!document.getElementById('tour-styles')) {
      const style = document.createElement('style');
      style.id = 'tour-styles';
      // Ensure highlighted element is above the overlay visually
      style.textContent = `
        .tour-overlay-open .sidebar,
        .tour-overlay-open .chat-input-area,
        .tour-overlay-open .rp-tabs,
        .tour-overlay-open #sidebar-nav {
          position: relative;
          z-index: 10001 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ── Render step ──
  function renderStep(stepIndex) {
    // Clean up previous
    removeEl(tooltipEl);
    removeEl(highlightEl);
    tooltipEl = null;
    highlightEl = null;

    const step = STEPS[stepIndex];
    if (!step) {
      destroyTour();
      return;
    }

    // Remove any old step classes
    if (overlayEl) {
      overlayEl.className = 'tour-overlay';
      overlayEl.classList.add('tour-step-' + (stepIndex + 1));
    }

    // Get target rect
    const targetRect = getElementRect(step.selector);

    // Create highlight overlay around target
    if (targetRect && step.placement !== 'center') {
      highlightEl = createEl('div', 'tour-highlight');
      highlightEl.style.top = targetRect.top + 'px';
      highlightEl.style.left = targetRect.left + 'px';
      highlightEl.style.width = targetRect.width + 'px';
      highlightEl.style.height = targetRect.height + 'px';
      if (step.interactive) {
        highlightEl.classList.add('interactive');
      }
      document.body.appendChild(highlightEl);
      // Animate in next frame
      requestAnimationFrame(function () {
        highlightEl.style.opacity = '1';
      });
    }

    // Position & create tooltip
    const pos = calculatePosition(stepIndex, targetRect);

    // Build progress dots
    let dotsHtml = '';
    for (let i = 0; i < STEPS.length; i++) {
      let cls = 'tour-progress-dot';
      if (i === stepIndex) cls += ' active';
      else if (i < stepIndex) cls += ' done';
      dotsHtml += '<span class="' + cls + '"></span>';
    }

    const isLast = stepIndex === STEPS.length - 1;
    const stepNum = stepIndex + 1;

    tooltipEl = createEl('div', 'tour-tooltip');
    tooltipEl.className = 'tour-tooltip tour-step-' + stepNum;
    tooltipEl.setAttribute('data-placement', pos.placement);
    tooltipEl.style.top = pos.top + 'px';
    tooltipEl.style.left = pos.left + 'px';

    if (pos.placement === 'center') {
      // Center on screen
      tooltipEl.style.position = 'fixed';
      tooltipEl.style.top = '50%';
      tooltipEl.style.left = '50%';
      tooltipEl.style.transform = 'translate(-50%, -50%)';
      tooltipEl.style.maxWidth = '400px';
    }

    tooltipEl.innerHTML =
      '<div class="tour-tooltip-header">' +
        '<span class="tour-step-badge">' + stepNum + '</span>' +
        '<h3>' + step.title + '</h3>' +
      '</div>' +
      '<div class="tour-tooltip-body">' + step.body + '</div>' +
      '<div class="tour-tooltip-footer">' +
        '<button class="tour-btn tour-btn-ghost tour-skip-btn">Skip tour</button>' +
        '<div class="tour-progress">' + dotsHtml + '</div>' +
        '<button class="tour-btn tour-btn-primary tour-next-btn">' +
          (isLast ? 'Get started' : 'Next →') +
        '</button>' +
      '</div>';

    document.body.appendChild(tooltipEl);

    // ── Event handlers ──
    const nextBtn = qs('.tour-next-btn', tooltipEl);
    const skipBtn = qs('.tour-skip-btn', tooltipEl);

    nextBtn.addEventListener('click', function () {
      if (isLast) {
        completeTour();
      } else {
        goToStep(stepIndex + 1);
      }
    });

    skipBtn.addEventListener('click', function () {
      completeTour();
    });

    // Keyboard: Enter/Space to advance, Escape to skip
    // (handler attached once on overlay)
  }

  // ── Navigation ──
  function goToStep(index) {
    if (index < 0 || index >= STEPS.length) {
      completeTour();
      return;
    }
    currentStep = index;
    renderStep(index);
  }

  function completeTour() {
    try {
      localStorage.setItem(TOUR_KEY, 'true');
    } catch (e) { /* localStorage might be unavailable */ }
    destroyTour();
  }

  function destroyTour() {
    isActive = false;
    removeEl(tooltipEl);
    removeEl(highlightEl);
    removeEl(overlayEl);
    tooltipEl = null;
    highlightEl = null;
    overlayEl = null;
    document.body.classList.remove('tour-overlay-open');
    // Remove keyboard handler
    document.removeEventListener('keydown', handleKeydown);
    // Remove styles
    const styleEl = document.getElementById('tour-styles');
    if (styleEl) styleEl.remove();
  }

  // ── Keyboard handler ──
  function handleKeydown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') {
      completeTour();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const isLast = currentStep === STEPS.length - 1;
      if (isLast) {
        completeTour();
      } else {
        goToStep(currentStep + 1);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentStep > 0) goToStep(currentStep - 1);
    }
  }

  // ── Handle resize/scroll — reposition current step ──
  let repositionTimeout = null;
  function handleReposition() {
    if (!isActive) return;
    clearTimeout(repositionTimeout);
    repositionTimeout = setTimeout(function () {
      renderStep(currentStep);
    }, 100);
  }

  // ── Public API ──
  window.startTour = function startTour() {
    if (isActive) return;
    // Check if already completed
    try {
      if (localStorage.getItem(TOUR_KEY) === 'true') return;
    } catch (e) { /* proceed anyway */ }

    isActive = true;
    currentStep = 0;

    // Create overlay
    overlayEl = createEl('div', 'tour-overlay tour-step-1');
    document.body.appendChild(overlayEl);

    // Add body class
    document.body.classList.add('tour-overlay-open');

    // Add highlight styles
    addHighlightStyles();

    // Render first step
    renderStep(0);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);

    // Reposition on resize / scroll
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
  };

  // ── Auto-start on DOMContentLoaded (won't fire if dashboard init hasn't happened yet) ──
  // We use a small delay to let dashboard.js finish rendering
  document.addEventListener('DOMContentLoaded', function () {
    // Check if we should start — defer slightly so dashboard can install event handlers
    setTimeout(function () {
      try {
        if (localStorage.getItem(TOUR_KEY) !== 'true') {
          // Don't auto-start if user isn't on the dashboard page
          if (qs('#page-dashboard') && !qs('#page-dashboard.hidden')) {
            window.startTour();
          } else {
            // Wait for dashboard to show — watch for it
            const observer = new MutationObserver(function () {
              if (qs('#page-dashboard') && !qs('#page-dashboard.hidden')) {
                observer.disconnect();
                window.startTour();
              }
            });
            observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
          }
        }
      } catch (e) { /* ignore */ }
    }, 500);
  });

  // ── Reset tour (for testing/debug) ──
  window.resetTour = function resetTour() {
    try {
      localStorage.removeItem(TOUR_KEY);
    } catch (e) { /* ignore */ }
    destroyTour();
  };

})();
