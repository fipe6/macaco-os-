/* ScrollCraft-inspired scroll-to-frame canvas engine.
 * Adapted for Makako Fit from https://github.com/singhharsh1708/scrollcraft
 * Copyright (c) ScrollCraft contributors, MIT license in vendor/scrollcraft-LICENSE.txt.
 */
(() => {
  'use strict';
  const section = document.querySelector('#experiencia');
  const canvas = document.querySelector('#showcase-canvas');
  if (!section || !canvas) return;
  const context = canvas.getContext('2d', {alpha:false});
  if (!context) return;
  const stage = section.querySelector('.showcase-stage');
  const caption = document.querySelector('#showcase-caption');
  const progressFill = document.querySelector('#showcase-progress-fill');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const slides = [
    {src:'assets/musclewhey.webp',label:'MuscleWhey · proteína para acompañar tu entrenamiento.'},
    {src:'assets/creatina-ultimate-makako.webp',label:'Creatina Ultimate · fuerza y rendimiento en tu rutina.'},
    {src:'assets/mutant-makako.webp',label:'Mutant Whey · proteína para tu recuperación.'}
  ];
  const frames = slides.map(() => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => requestAnimationFrame(render), {once:true});
    return image;
  });
  function loadFrames() {
    frames.forEach((image, index) => {
      if (!image.src && (!reduced.matches || index === 0)) image.src = slides[index].src;
    });
  }
  let pending = false;
  let lastIndex = -1;

  function draw(image, alpha) {
    if (!image.complete || !image.naturalWidth || alpha <= 0) return;
    // Generated poster prices sit in the lower edge; keep the visual evergreen
    // when the owner changes the live price in the catalog.
    const sourceHeight = image.naturalHeight * .82;
    const sourceWidth = Math.min(image.naturalWidth, sourceHeight * canvas.width / canvas.height);
    const sourceX = (image.naturalWidth-sourceWidth)/2;
    context.globalAlpha = alpha;
    context.drawImage(image, sourceX, 0, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  }
  function render() {
    pending = false;
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const progress = reduced.matches ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
    const position = progress * (slides.length-1);
    const from = Math.min(slides.length-1, Math.floor(position));
    const mix = position-from;
    context.globalAlpha = 1;
    context.fillStyle = '#101010';
    context.fillRect(0,0,canvas.width,canvas.height);
    draw(frames[from], 1);
    if (mix > 0) draw(frames[Math.min(from+1,frames.length-1)], mix);
    context.globalAlpha = 1;
    const nearest = Math.round(position);
    if (nearest !== lastIndex) {
      lastIndex = nearest;
      caption.textContent = slides[nearest].label;
    }
    progressFill.style.width = `${Math.max(5,progress*100)}%`;
    stage.style.setProperty('--turn', `${reduced.matches ? 0 : (progress-.5)*-12}deg`);
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(render);
    }
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  reduced.addEventListener('change', () => {loadFrames();schedule();});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {loadFrames();observer.disconnect();}
    }, {rootMargin:'180px'});
    observer.observe(section);
  } else loadFrames();
  schedule();
})();
