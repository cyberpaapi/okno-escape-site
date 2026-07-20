(() => {
  const loader = document.querySelector('[data-page-loader]');
  if (!loader) return;

  const body = document.body;
  const progressText = loader.querySelector('[data-loader-percent]');
  const statusText = loader.querySelector('[data-loader-status]');
  const progressBar = loader.querySelector('[role="progressbar"]');
  const portrait = matchMedia('(max-width: 860px), (orientation: portrait)').matches;
  const source = portrait ? loader.dataset.mobileAssets : loader.dataset.desktopAssets;
  const assets = (source || '').split('|').map((item) => item.trim()).filter(Boolean);
  const cache = window.__oknoAssetCache || new Map();
  window.__oknoAssetCache = cache;
  const startedAt = performance.now();
  const isV1 = body.dataset.version === 'v1';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finished = false;
  let targetProgress = 0;
  let visualProgress = 0;
  let progressLabel = 'Reading the landscape';
  let progressFrame = 0;
  let lastFrameAt = startedAt;
  const progressWaiters = [];
  const constructionLabels = [
    [0.16, 'Surveying the site'],
    [0.38, 'Setting the foundation'],
    [0.62, 'Raising the modular shell'],
    [0.82, 'Installing the glass'],
    [1.01, 'Locking the roof in place']
  ];

  const paintProgress = (value, label) => {
    const bounded = Math.max(0, Math.min(1, value));
    document.documentElement.style.setProperty('--loader-progress', bounded.toFixed(4));
    const percent = Math.round(bounded * 100);
    if (progressText) progressText.textContent = `${String(percent).padStart(3, '0')}%`;
    if (statusText && label) {
      const constructionLabel = constructionLabels.find(([until]) => bounded < until)?.[1];
      statusText.textContent = isV1 && label !== 'Welcome home'
        ? constructionLabel || 'Commissioning the home'
        : label;
    }
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(percent));
  };

  const resolveProgressWaiters = () => {
    for (let index = progressWaiters.length - 1; index >= 0; index -= 1) {
      if (visualProgress >= progressWaiters[index].threshold) {
        progressWaiters.splice(index, 1)[0].resolve();
      }
    }
  };

  const animateProgress = (now) => {
    progressFrame = 0;
    const elapsed = Math.min(48, Math.max(0, now - lastFrameAt));
    lastFrameAt = now;
    const gap = targetProgress - visualProgress;

    if (reduceMotion || gap <= .0005) {
      visualProgress = targetProgress;
    } else {
      const easedStep = gap * (1 - Math.exp(-elapsed / 210));
      const minimumStep = elapsed * .00011;
      visualProgress = Math.min(targetProgress, visualProgress + Math.max(easedStep, minimumStep));
    }

    paintProgress(visualProgress, progressLabel);
    resolveProgressWaiters();

    if (visualProgress < targetProgress) {
      progressFrame = requestAnimationFrame(animateProgress);
    }
  };

  const setProgress = (value, label) => {
    const bounded = Math.max(0, Math.min(1, value));
    progressLabel = label || progressLabel;

    if (!isV1 || reduceMotion) {
      targetProgress = bounded;
      visualProgress = bounded;
      paintProgress(visualProgress, progressLabel);
      resolveProgressWaiters();
      return;
    }

    targetProgress = Math.max(targetProgress, bounded);
    if (!progressFrame) {
      lastFrameAt = performance.now();
      progressFrame = requestAnimationFrame(animateProgress);
    }
  };

  const waitForProgress = (threshold) => {
    if (visualProgress >= threshold) return Promise.resolve();
    return new Promise((resolve) => progressWaiters.push({ threshold, resolve }));
  };

  const fetchAsset = async (url, index) => {
    if (cache.has(url)) {
      setProgress((index + 1) / Math.max(1, assets.length), 'Composing the view');
      return;
    }
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body?.getReader();
    const chunks = [];
    let received = 0;
    const loadingLabel = /\.(mp4|webm)(?:$|\?)/i.test(url) ? 'Preparing the camera' : 'Drawing the first light';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        const within = total ? received / total : Math.min(.92, received / (6 * 1024 * 1024));
        setProgress((index + within) / assets.length, loadingLabel);
      }
    } else {
      chunks.push(new Uint8Array(await response.arrayBuffer()));
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') || '' });
    cache.set(url, { blob, objectUrl: URL.createObjectURL(blob) });
    window.dispatchEvent(new CustomEvent('okno:asset-ready', { detail: { url } }));
    setProgress((index + 1) / assets.length, 'Composing the view');
  };

  const finish = async () => {
    if (finished) return;
    finished = true;
    const remaining = Math.max(0, (isV1 ? 1050 : 900) - (performance.now() - startedAt));
    if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
    setProgress(1, isV1 ? 'Commissioning the home' : 'Welcome home');
    if (isV1 && !reduceMotion) await waitForProgress(.9995);
    visualProgress = 1;
    targetProgress = 1;
    progressLabel = 'Welcome home';
    paintProgress(1, progressLabel);
    loader.classList.add('is-built');
    await new Promise((resolve) => setTimeout(resolve, reduceMotion ? 80 : (isV1 ? 560 : 280)));
    loader.classList.add('is-complete');
    body.classList.remove('is-loading');
    body.classList.add('is-loaded');
    window.dispatchEvent(new CustomEvent('okno:page-ready'));
  };

  window.__oknoLoaderReady = (async () => {
    setProgress(0, 'Reading the landscape');
    for (let index = 0; index < assets.length; index += 1) {
      try {
        await fetchAsset(assets[index], index);
      } catch (error) {
        console.warn('Loader asset skipped', error);
        setProgress((index + 1) / Math.max(1, assets.length), 'Continuing with the poster');
      }
    }
    await finish();
  })();

  setTimeout(() => {
    if (!loader.classList.contains('is-complete')) finish();
  }, 30000);
})();
