(async () => {
  if (window.__oknoLoaderReady) await window.__oknoLoaderReady;
  const root = document.documentElement;
  const chapters = [...document.querySelectorAll('.film-chapter')];
  const dots = [...document.querySelectorAll('.chapter-dot')];
  const nav = document.getElementById('site-nav');
  const progressBar = document.getElementById('progress-bar');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis;
  let directSeeking = false;
  let lastScroll = window.scrollY;
  let lastTickAt = performance.now();

  const setActiveDot = (activeIndex) => {
    dots.forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
  };

  const updateGlobalProgress = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const value = Math.min(1, Math.max(0, window.scrollY / max));
    progressBar.style.transform = `scaleX(${value})`;
    const movingDown = window.scrollY > lastScroll;
    nav.classList.toggle('is-hidden', movingDown && window.scrollY > 180);
    lastScroll = window.scrollY;
  };

  const enableStaticMode = () => {
    root.classList.add('static-mode');
    directSeeking = true;
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
    document.querySelectorAll('[data-enter], .reveal-on-scroll').forEach((el) => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
    });
    document.querySelectorAll('video').forEach((video) => video.remove());
    window.addEventListener('scroll', updateGlobalProgress, { passive: true });
    updateGlobalProgress();
  };

  const setupForms = () => {
    const isEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
    document.getElementById('film-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = form.elements.email.value.trim();
      const status = form.querySelector('.form-status');
      if (!isEmail(email)) {
        status.textContent = 'Enter a valid email to receive the field guide.';
        form.elements.email.focus();
        return;
      }
      status.textContent = 'You’re on the path. We’ll be in touch.';
      form.reset();
    });

    document.getElementById('contact-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = ['name', 'email', 'place'];
      let firstInvalid = null;
      fields.forEach((name) => {
        const input = form.elements[name];
        const error = document.getElementById(`${name}-error`);
        const empty = !input.value.trim();
        const invalid = empty || (name === 'email' && !isEmail(input.value.trim()));
        input.setAttribute('aria-invalid', String(invalid));
        error.textContent = invalid ? (name === 'email' ? 'Enter a valid email address.' : 'This field helps us understand your escape.') : '';
        if (invalid && !firstInvalid) firstInvalid = input;
      });
      const status = form.querySelector('.form-status');
      if (firstInvalid) {
        status.textContent = 'Please complete the highlighted fields.';
        firstInvalid.focus();
        return;
      }
      status.textContent = 'Thank you. Your quieter chapter has begun.';
      form.reset();
      fields.forEach((name) => form.elements[name].removeAttribute('aria-invalid'));
    });
  };

  setupForms();

  const scrollGalleryControllers = [...document.querySelectorAll('[data-scroll-gallery]')].map((gallery) => {
    const portal = gallery.querySelector('[data-gallery-portal]');
    const poster = gallery.querySelector('[data-gallery-poster]');
    const video = gallery.querySelector('[data-gallery-video]');
    const railWindow = gallery.querySelector('.gallery-rail-window');
    const rail = gallery.querySelector('[data-gallery-rail]');
    const cards = [...gallery.querySelectorAll('.gallery-card')];
    const current = gallery.querySelector('[data-gallery-current]');
    const title = gallery.querySelector('[data-gallery-title]');
    let activeIndex = -1;

    const positionRail = () => {
      const card = cards[activeIndex < 0 ? 0 : activeIndex];
      if (!card || !railWindow.clientWidth) return;
      const railStyles = getComputedStyle(rail);
      const gap = parseFloat(railStyles.columnGap || railStyles.gap) || 0;
      const cardWidth = card.getBoundingClientRect().width;
      const sidePadding = parseFloat(railStyles.paddingLeft) || 0;
      const shift = (railWindow.clientWidth - cardWidth) / 2 - sidePadding - Math.max(0, activeIndex) * (cardWidth + gap);
      rail.style.setProperty('--gallery-shift', `${shift}px`);
    };

    const playSelection = (card) => {
      if (!video?.isConnected) return;
      const source = card.dataset.video;
      if (video.dataset.activeSource === source) return;
      portal.classList.remove('is-playing');
      video.pause();
      video.dataset.activeSource = source;
      video.src = source;
      video.load();
      video.oncanplay = () => {
        video.play().then(() => portal.classList.add('is-playing')).catch(() => portal.classList.remove('is-playing'));
      };
    };

    const select = (nextIndex, focusCard = false) => {
      const normalized = Math.min(cards.length - 1, Math.max(0, nextIndex));
      if (normalized === activeIndex) return;
      activeIndex = normalized;
      const card = cards[activeIndex];
      cards.forEach((item, index) => {
        const active = index === activeIndex;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      current.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      title.textContent = card.dataset.title;
      poster.src = card.dataset.poster;
      poster.alt = card.querySelector('img').alt;
      playSelection(card);
      requestAnimationFrame(positionRail);
      if (focusCard) card.focus({ preventScroll: true });
    };

    cards.forEach((card, index) => {
      card.addEventListener('click', () => select(index, true));
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        select(activeIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
      });
    });
    window.addEventListener('resize', positionRail);
    select(0);
    return { gallery, cards, select, positionRail };
  });

  dots.forEach((dot, index) => dot.addEventListener('click', () => chapters[index].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })));

  if (reducedMotion || !window.gsap || !window.ScrollTrigger) {
    enableStaticMode();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('[data-split]').forEach((heading) => {
    const words = heading.textContent.trim().split(/\s+/);
    heading.innerHTML = words.map((word) => `<span class="word">${word}</span>`).join(' ');
  });

  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const videoStates = new Map();
  const loadQueue = [];
  let loading = false;

  const drainQueue = async () => {
    if (loading) return;
    loading = true;
    while (loadQueue.length) {
      const chapter = loadQueue.shift();
      const video = chapter.querySelector('video');
      const state = videoStates.get(video);
      if (!state || state.loading || state.ready) continue;
      state.loading = true;
      try {
        const cached = window.__oknoAssetCache?.get(video.dataset.src);
        if (cached?.objectUrl) {
          state.objectUrl = cached.objectUrl;
        } else {
          const response = await fetch(video.dataset.src);
          if (!response.ok) throw new Error(`Video unavailable: ${response.status}`);
          const blob = await response.blob();
          state.objectUrl = URL.createObjectURL(blob);
          window.__oknoAssetCache?.set(video.dataset.src, { blob, objectUrl: state.objectUrl });
        }
        video.src = state.objectUrl;
        video.load();
      } catch (error) {
        state.loading = false;
        chapter.classList.add('poster-only');
      }
    }
    loading = false;
  };

  const enqueueVideo = (chapter) => {
    const video = chapter.querySelector('video');
    const state = videoStates.get(video);
    if (!state || state.loading || state.ready || loadQueue.includes(chapter)) return;
    loadQueue.push(chapter);
    drainQueue();
  };

  chapters.forEach((chapter, index) => {
    const video = chapter.querySelector('video');
    const state = { target: 0, current: 0, duration: 0, ready: false, loading: false, objectUrl: null };
    videoStates.set(video, state);
    video.addEventListener('loadedmetadata', () => {
      state.duration = video.duration || 10;
      state.ready = true;
      chapter.classList.add('video-ready');
      const trigger = ScrollTrigger.getById(`chapter-${index}`);
      if (trigger) {
        state.target = trigger.progress * state.duration;
        state.current = state.target;
        video.currentTime = state.target;
      }
    });
    video.addEventListener('error', () => chapter.classList.add('poster-only'));
  });

  const preloader = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) enqueueVideo(entry.target); });
  }, { rootMargin: '150% 0px 150% 0px' });
  chapters.forEach((chapter) => preloader.observe(chapter));
  enqueueVideo(chapters[0]);

  chapters.forEach((chapter, index) => {
    const frame = chapter.querySelector('.film-frame');
    const video = chapter.querySelector('video');
    const state = videoStates.get(video);
    const stages = [...chapter.querySelectorAll('[data-enter]')];

    ScrollTrigger.create({
      id: `chapter-${index}`,
      trigger: chapter,
      pin: frame,
      pinSpacing: true,
      start: 'top top',
      end: '+=320%',
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => setActiveDot(index),
      onEnterBack: () => setActiveDot(index),
      onUpdate: (self) => {
        if (state.ready) {
          state.target = Math.min(state.duration - 0.02, Math.max(0, self.progress * state.duration));
          if (directSeeking && !video.seeking && Math.abs(video.currentTime - state.target) > 0.004) video.currentTime = state.target;
        }
        if (index === chapters.length - 1) {
          const form = chapter.querySelector('.film-form');
          form.classList.toggle('is-live', self.progress >= .28 && self.progress <= .98);
        }
      }
    });

    const overlayTimeline = gsap.timeline({
      scrollTrigger: { trigger: chapter, start: 'top top', end: '+=320%', scrub: true }
    });

    stages.forEach((stage) => {
      const enter = Number(stage.dataset.enter || 0);
      const exit = Number(stage.dataset.exit || 1);
      const words = stage.matches('[data-split]') ? [...stage.querySelectorAll('.word')] : [stage];
      if (enter === 0) {
        gsap.set(words, { autoAlpha: 1, yPercent: 0 });
        gsap.fromTo(words, { autoAlpha: 0, yPercent: 35 }, { autoAlpha: 1, yPercent: 0, duration: .9, stagger: .045, delay: .18, ease: 'power3.out', immediateRender: false });
      } else {
        overlayTimeline.fromTo(words,
          { autoAlpha: 0, yPercent: 42 },
          { autoAlpha: 1, yPercent: 0, stagger: .035, ease: 'none', immediateRender: false, duration: Math.min(.12, Math.max(.06, exit - enter)) },
          enter
        );
      }
      if (exit < .98) {
        overlayTimeline.to(words, { autoAlpha: 0, yPercent: -18, ease: 'none', duration: .07 }, Math.max(enter + .08, exit - .07));
      }
    });
  });

  scrollGalleryControllers.forEach((controller, index) => {
    ScrollTrigger.create({
      id: `scroll-gallery-${index}`,
      trigger: controller.gallery,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => controller.select(0),
      onUpdate: (self) => controller.select(Math.min(controller.cards.length - 1, Math.floor(self.progress * controller.cards.length)))
    });
  });

  document.querySelectorAll('.reveal-on-scroll').forEach((element) => {
    gsap.fromTo(element, { autoAlpha: 0, y: 32 }, {
      autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', immediateRender: false,
      scrollTrigger: { trigger: element, start: 'top 84%', once: true }
    });
  });

  gsap.ticker.add(() => {
    lastTickAt = performance.now();
    videoStates.forEach((state, video) => {
      if (!state.ready || video.seeking) return;
      const diff = state.target - state.current;
      state.current += diff * (Math.abs(diff) > 1.5 ? 0.3 : 0.11);
      if (Math.abs(video.currentTime - state.current) > 0.004) video.currentTime = state.current;
    });
  });

  window.addEventListener('scroll', updateGlobalProgress, { passive: true });
  ScrollTrigger.addEventListener('refresh', updateGlobalProgress);
  updateGlobalProgress();

  const watchdog = window.setInterval(() => {
    if (document.hidden) return;
    if (performance.now() - lastTickAt > 800) {
      directSeeking = true;
      lenis?.destroy();
      lenis = null;
      document.querySelectorAll('[data-enter], .reveal-on-scroll').forEach((el) => gsap.set(el, { autoAlpha: 1, clearProps: 'transform' }));
      window.addEventListener('scroll', ScrollTrigger.update, { passive: true });
      window.clearInterval(watchdog);
    }
  }, 400);

  window.addEventListener('beforeunload', () => {
    videoStates.forEach((state) => { if (state.objectUrl) URL.revokeObjectURL(state.objectUrl); });
  });
})();
