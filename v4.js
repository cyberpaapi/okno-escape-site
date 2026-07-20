(async () => {
  if (window.__oknoLoaderReady) await window.__oknoLoaderReady;
  const root = document.documentElement;
  const body = document.body;
  const nav = document.getElementById('v3-site-nav');
  const progressBar = document.getElementById('v3-progress-bar');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animeEngine = window.anime;
  let previousScroll = window.scrollY;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const updatePageChrome = () => {
    const scrollable = Math.max(1, root.scrollHeight - innerHeight);
    progressBar.style.transform = `scaleX(${clamp(window.scrollY / scrollable)})`;
    const movingDown = window.scrollY > previousScroll;
    nav.classList.toggle('is-hidden', movingDown && window.scrollY > 180);
    previousScroll = window.scrollY;
  };

  const setupForm = () => {
    const form = document.getElementById('v3-contact-form');
    if (!form) return;
    const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const names = ['name', 'email', 'place'];
      let firstInvalid = null;

      names.forEach((name) => {
        const field = form.elements[name];
        const error = document.getElementById(`v3-${name}-error`);
        const value = field.value.trim();
        const invalid = !value || (name === 'email' && !validEmail(value));
        field.setAttribute('aria-invalid', String(invalid));
        error.textContent = invalid ? (name === 'email' ? 'Enter a valid email address.' : 'This field helps us place your Okno.') : '';
        if (invalid && !firstInvalid) firstInvalid = field;
      });

      const status = form.querySelector('.form-status');
      if (firstInvalid) {
        status.textContent = 'Please complete the highlighted fields.';
        firstInvalid.focus();
        return;
      }

      status.textContent = 'Coordinates received. Your next view starts here.';
      form.reset();
      names.forEach((name) => form.elements[name].removeAttribute('aria-invalid'));
    });
  };

  setupForm();
  updatePageChrome();
  window.addEventListener('scroll', updatePageChrome, { passive: true });

  if (!animeEngine || reducedMotion) {
    body.classList.add(reducedMotion ? 'reduced-motion' : 'anime-unavailable');
    document.querySelectorAll('.reveal-3d').forEach((element) => element.classList.add('is-visible'));

    const fallbackCards = [...document.querySelectorAll('.orbit-card')];
    const fallbackPrevious = document.getElementById('orbit-prev');
    const fallbackNext = document.getElementById('orbit-next');
    const fallbackCurrent = document.getElementById('orbit-current');
    const fallbackStatus = document.getElementById('orbit-status');
    const fallbackTime = document.getElementById('portal-time');
    const fallbackTitle = document.getElementById('portal-title');
    const fallbackPoster = document.querySelector('#portal-screen > img');
    let fallbackIndex = 3;

    const selectFallbackScene = (nextIndex, focusCard = false) => {
      fallbackIndex = (nextIndex + fallbackCards.length) % fallbackCards.length;
      const card = fallbackCards[fallbackIndex];
      fallbackCards.forEach((item, index) => {
        const active = index === fallbackIndex;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      fallbackCurrent.textContent = String(fallbackIndex + 1).padStart(2, '0');
      fallbackStatus.textContent = card.dataset.title;
      fallbackTime.textContent = card.dataset.time;
      fallbackTitle.textContent = card.dataset.title;
      fallbackPoster.src = card.querySelector('img').src;
      if (focusCard) card.focus({ preventScroll: true });
    };

    fallbackCards.forEach((card, index) => {
      card.addEventListener('click', () => selectFallbackScene(index));
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        selectFallbackScene(fallbackIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
      });
    });
    fallbackPrevious?.addEventListener('click', () => selectFallbackScene(fallbackIndex - 1));
    fallbackNext?.addEventListener('click', () => selectFallbackScene(fallbackIndex + 1));
    return;
  }

  body.classList.add('anime-ready');
  const { animate, createAnimatable, stagger, remove } = animeEngine;

  animate('.v3-intro-item', {
    opacity: { from: 0 },
    y: { from: 34 },
    duration: 1050,
    delay: stagger(95),
    ease: 'out(4)'
  });

  const stage = document.getElementById('spatial-stage');
  const hero = document.getElementById('space');
  const rig = document.getElementById('spatial-rig');
  const depthStack = document.getElementById('depth-stack');
  const copyPlane = document.querySelector('.copy-plane');
  const depthReadout = document.getElementById('depth-readout');
  const heroVideo = document.getElementById('v3-hero-video');
  const videoPlane = document.querySelector('.video-plane');

  const rigMotion = createAnimatable(rig, {
    rotateX: { duration: 420, ease: 'out(4)' },
    rotateY: { duration: 420, ease: 'out(4)' }
  });
  const depthMotion = createAnimatable(depthStack, {
    translateZ: { duration: 150, ease: 'out(3)' },
    scale: { duration: 150, ease: 'out(3)' },
    rotateX: { duration: 150, ease: 'out(3)' }
  });
  const copyMotion = createAnimatable(copyPlane, {
    translateY: { duration: 150, ease: 'out(3)' },
    opacity: { duration: 150, ease: 'out(3)' }
  });

  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  stage.addEventListener('pointermove', (event) => {
    const bounds = stage.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      rigMotion.rotateY(pointerX * 4.8);
      rigMotion.rotateX(pointerY * -3.2);
      pointerFrame = 0;
    });
  });
  stage.addEventListener('pointerleave', () => {
    rigMotion.rotateX(0, 600, 'out(4)');
    rigMotion.rotateY(0, 600, 'out(4)');
  });

  const heroVideoState = { target: 0, current: 0, duration: 0, ready: false, objectUrl: null };
  const loadHeroVideo = async () => {
    try {
      const cached = window.__oknoAssetCache?.get(heroVideo.dataset.src);
      if (cached?.objectUrl) {
        heroVideoState.objectUrl = cached.objectUrl;
      } else {
        const response = await fetch(heroVideo.dataset.src);
        if (!response.ok) throw new Error(`Video unavailable: ${response.status}`);
        const blob = await response.blob();
        heroVideoState.objectUrl = URL.createObjectURL(blob);
        window.__oknoAssetCache?.set(heroVideo.dataset.src, { blob, objectUrl: heroVideoState.objectUrl });
      }
      heroVideo.src = heroVideoState.objectUrl;
      heroVideo.load();
    } catch (error) {
      videoPlane.classList.add('poster-only');
    }
  };
  heroVideo.addEventListener('loadedmetadata', () => {
    heroVideoState.duration = heroVideo.duration || 10;
    heroVideoState.ready = true;
    videoPlane.classList.add('is-ready');
  });
  heroVideo.addEventListener('error', () => videoPlane.classList.add('poster-only'));
  loadHeroVideo();

  let heroProgress = 0;
  const updateHeroProgress = () => {
    const distance = Math.max(1, hero.offsetHeight - innerHeight);
    heroProgress = clamp((window.scrollY - hero.offsetTop) / distance);
    depthMotion.translateZ(-150 * heroProgress);
    depthMotion.scale(1 - heroProgress * .065);
    depthMotion.rotateX(heroProgress * 2.6);
    copyMotion.translateY(-78 * heroProgress);
    copyMotion.opacity(clamp(1 - heroProgress * 1.35));
    depthReadout.textContent = String(Math.round(heroProgress * 280)).padStart(3, '0');
    if (heroVideoState.ready) heroVideoState.target = Math.min(heroVideoState.duration - .02, heroProgress * heroVideoState.duration);
  };
  window.addEventListener('scroll', updateHeroProgress, { passive: true });
  window.addEventListener('resize', updateHeroProgress);
  updateHeroProgress();

  const seekLoop = () => {
    if (heroVideoState.ready && !heroVideo.seeking) {
      const difference = heroVideoState.target - heroVideoState.current;
      heroVideoState.current += difference * (Math.abs(difference) > 1.5 ? .3 : .11);
      if (Math.abs(heroVideo.currentTime - heroVideoState.current) > .004) heroVideo.currentTime = heroVideoState.current;
    }
    requestAnimationFrame(seekLoop);
  };
  requestAnimationFrame(seekLoop);

  const reveals = [...document.querySelectorAll('.reveal-3d')];
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.classList.contains('is-visible')) return;
      const element = entry.target;
      animate(element, {
        opacity: 1,
        y: 0,
        duration: 850,
        ease: 'out(4)',
        onComplete: () => element.classList.add('is-visible')
      });
      revealObserver.unobserve(element);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  reveals.forEach((element) => revealObserver.observe(element));

  const ring = document.getElementById('orbit-ring');
  const orbitSection = document.getElementById('orbit');
  const cards = [...document.querySelectorAll('.orbit-card')];
  const previousButton = document.getElementById('orbit-prev');
  const nextButton = document.getElementById('orbit-next');
  const orbitCurrent = document.getElementById('orbit-current');
  const orbitStatus = document.getElementById('orbit-status');
  const portal = document.getElementById('portal-screen');
  const portalVideo = document.getElementById('portal-video');
  const portalTime = document.getElementById('portal-time');
  const portalTitle = document.getElementById('portal-title');
  const angleStep = 360 / cards.length;
  let activeIndex = 3;

  const positionOrbitCards = () => {
    const radius = innerWidth <= 1180 ? 360 : 430;
    cards.forEach((card, index) => {
      card.style.transform = `rotateY(${index * angleStep}deg) translateZ(${radius}px)`;
    });
    ring.style.transform = `rotateY(${-activeIndex * angleStep}deg)`;
  };

  const playPortal = (source) => {
    portal.classList.remove('is-playing');
    portalVideo.pause();
    portalVideo.src = source;
    portalVideo.load();
    portalVideo.addEventListener('canplay', () => {
      portalVideo.play().then(() => portal.classList.add('is-playing')).catch(() => portal.classList.remove('is-playing'));
    }, { once: true });
  };

  const selectScene = (nextIndex, focusCard = false) => {
    activeIndex = (nextIndex + cards.length) % cards.length;
    const card = cards[activeIndex];
    cards.forEach((item, index) => {
      const active = index === activeIndex;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
      item.tabIndex = active ? 0 : -1;
    });

    remove(ring);
    animate(ring, { rotateY: -activeIndex * angleStep, duration: 900, ease: 'out(5)' });
    animate(portal, { scale: { from: .985 }, opacity: { from: .72 }, duration: 650, ease: 'out(4)' });

    portalTime.textContent = card.dataset.time;
    portalTitle.textContent = card.dataset.title;
    orbitCurrent.textContent = String(activeIndex + 1).padStart(2, '0');
    orbitStatus.textContent = card.dataset.title;
    playPortal(card.dataset.video);
    if (focusCard) card.focus({ preventScroll: true });

    if (innerWidth <= 900) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  cards.forEach((card, index) => {
    card.addEventListener('click', () => selectScene(index));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectScene(activeIndex - 1, true);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectScene(activeIndex + 1, true);
      }
    });
  });
  previousButton.addEventListener('click', () => selectScene(activeIndex - 1));
  nextButton.addEventListener('click', () => selectScene(activeIndex + 1));
  window.addEventListener('resize', positionOrbitCards);
  positionOrbitCards();
  portalVideo.play().then(() => portal.classList.add('is-playing')).catch(() => {});

  const updateOrbitFromScroll = () => {
    const start = orbitSection.offsetTop;
    const distance = Math.max(1, orbitSection.offsetHeight - innerHeight);
    if (window.scrollY + innerHeight < start || window.scrollY > start + orbitSection.offsetHeight) return;
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
    const nextIndex = Math.min(cards.length - 1, Math.floor(progress * cards.length));
    if (nextIndex !== activeIndex) selectScene(nextIndex);
  };
  window.addEventListener('scroll', updateOrbitFromScroll, { passive: true });
  window.addEventListener('resize', updateOrbitFromScroll);
  updateOrbitFromScroll();

  const modelWrap = document.getElementById('model-wrap');
  const modelRig = document.getElementById('model-rig');
  const modelMotion = createAnimatable(modelRig, {
    rotateX: { duration: 500, ease: 'out(4)' },
    rotateY: { duration: 500, ease: 'out(4)' },
    translateY: { duration: 500, ease: 'out(4)' }
  });
  modelWrap.addEventListener('pointermove', (event) => {
    const bounds = modelWrap.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    modelMotion.rotateY(x * 7);
    modelMotion.rotateX(y * -5);
    modelMotion.translateY(y * 7);
  });
  modelWrap.addEventListener('pointerleave', () => {
    modelMotion.rotateX(0, 650, 'out(4)');
    modelMotion.rotateY(0, 650, 'out(4)');
    modelMotion.translateY(0, 650, 'out(4)');
  });

  window.addEventListener('beforeunload', () => {
    if (heroVideoState.objectUrl) URL.revokeObjectURL(heroVideoState.objectUrl);
  });
})();
