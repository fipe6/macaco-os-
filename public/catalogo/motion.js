/* Makako Fit motion. React Bits AnimatedContent and SpotlightCard adaptations.
 * Copyright (c) 2026 David Haz. See vendor/react-bits-LICENSE.txt.
 * GSAP / ScrollTrigger are locally hosted; see vendor/THIRD-PARTY.txt.
 */
(() => {
  'use strict';
  const gsap = window.gsap;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let cardsContext;
  let pageContext;
  let spotlightFrame = 0;
  let activeSpotlight;

  if (gsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  const animated = () => gsap && !reduced.matches;

  // AnimatedContent: one entrance per element, using ScrollTrigger and GSAP.
  // Content stays visible before JS and if either optional library is unavailable.
  function reveal(elements, distance = 28) {
    elements.forEach(element => {
      gsap.from(element, {
        y: distance, opacity: .18, duration: .72, ease: 'power3.out',
        immediateRender: false, clearProps: 'transform,opacity',
        ...(window.ScrollTrigger ? {scrollTrigger: {
          trigger: element, start: 'top 90%', once: true
        }} : {})
      });
    });
  }

  function clearProducts() {
    cardsContext?.revert();
    cardsContext = undefined;
    clearSpotlight();
  }

  function products() {
    clearProducts();
    if (!animated()) return;
    cardsContext = gsap.context(() => reveal(document.querySelectorAll('.product-card'), 24));
    window.ScrollTrigger?.refresh();
  }

  function page() {
    pageContext?.revert();
    if (!animated()) return;
    pageContext = gsap.context(() => {
      gsap.from('.hero-copy > *', {
        y: 18, opacity: .35, stagger: .07, duration: .65,
        ease: 'power3.out', clearProps: 'transform,opacity'
      });
      reveal(document.querySelectorAll('.section-heading, .category-grid button, .catalog-toolbar, .filter-row, #result-count, .steps article, .how details, .manifesto .eyebrow, .manifesto h2, .manifesto>a'));
    });
  }

  function dialog(element) {
    if (!animated()) return;
    gsap.killTweensOf(element);
    gsap.fromTo(element, {y: 16, opacity: .5}, {
      y: 0, opacity: 1, duration: .24, ease: 'power2.out', clearProps: 'transform,opacity'
    });
  }

  function added(button) {
    if (!animated()) return;
    gsap.fromTo('#cart-count', {scale: 1.3}, {
      scale: 1, duration: .4, ease: 'back.out(2)', overwrite: true, clearProps: 'transform'
    });
    if (button) gsap.fromTo(button, {scale: .95}, {
      scale: 1, duration: .25, ease: 'power2.out', overwrite: true, clearProps: 'transform'
    });
  }

  // SpotlightCard: pointer-relative radial fill and masked edge, adapted to DOM
  // event delegation so filtering does not leave handlers on removed cards.
  function clearSpotlight() {
    cancelAnimationFrame(spotlightFrame);
    spotlightFrame = 0;
    activeSpotlight?.classList.remove('spotlight-active');
    activeSpotlight = undefined;
  }
  document.addEventListener('pointermove', event => {
    if (reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const target = event.target.closest('.product-media, .category-grid button');
    if (target !== activeSpotlight) {
      clearSpotlight();
      activeSpotlight = target;
      activeSpotlight?.classList.add('spotlight-active');
    }
    if (!target) return;
    cancelAnimationFrame(spotlightFrame);
    const {clientX, clientY} = event;
    spotlightFrame = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--spot-x', `${clientX - rect.left}px`);
      target.style.setProperty('--spot-y', `${clientY - rect.top}px`);
      spotlightFrame = 0;
    });
  }, {passive: true});
  document.addEventListener('pointerout', event => {if (!event.relatedTarget) clearSpotlight();});
  window.addEventListener('scroll', clearSpotlight, {passive: true});
  window.addEventListener('blur', clearSpotlight);
  finePointer.addEventListener('change', clearSpotlight);
  reduced.addEventListener('change', () => {
    clearSpotlight();
    if (reduced.matches && gsap) {
      gsap.killTweensOf('dialog, #cart-count, [data-add]');
      gsap.set('dialog, #cart-count, [data-add]', {clearProps: 'transform,opacity'});
    }
    page();
    products();
  });
  document.addEventListener('focusin', event => {
    // A keyboard user should never have to wait for a reveal to reach a control.
    const card = event.target.closest('.product-card');
    if (card && gsap) {
      gsap.killTweensOf(card);
      gsap.set(card, {clearProps: 'transform,opacity'});
    }
  });
  window.MakakoMotion = {clearProducts, products, dialog, added};
  // A single passive, frame-limited page progress update for the long catalog.
  let progressFrame = 0;
  function updateProgress() {
    progressFrame = 0;
    const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / distance));
    document.documentElement.style.setProperty('--page-progress', progress.toFixed(4));
  }
  function queueProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', queueProgress, {passive: true});
  window.addEventListener('resize', queueProgress, {passive: true});
  queueProgress();
  page();
})();
