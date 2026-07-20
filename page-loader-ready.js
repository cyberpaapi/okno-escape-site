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
  const loaderState = {
    variant: portrait ? 'mobile' : 'desktop',
    assets: [...assets],
    total: assets.length,
    downloaded: 0,
    prepared: 0,
    complete: false,
    activeAsset: null,
    retry: 0
  };
  window.__oknoLoaderState = loaderState;
  Object.assign(loader.dataset, {
    loaderVariant: loaderState.variant,
    loaderTotal: String(loaderState.total),
    loaderDownloaded: '0',
    loaderPrepared: '0',
    loaderComplete: 'false'
  });
  const startedAt = performance.now();
  const isV1 = body.dataset.version === 'v1';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finished = false;
  let readyAt = 0;
  let targetProgress = 0;
  let visualProgress = 0;
  let progressLabel = 'Opening the horizon';
  let progressFrame = 0;
  const progressWaiters = [];
  const assetProgress = assets.map(() => 0);
  const introDuration = 6500;
  const cruiseDuration = 4000;
  const completionDuration = 1200;
  const constructionLabels = [
    [0.16, 'Surveying the site'],
    [0.38, 'Setting the foundation'],
    [0.62, 'Raising the modular shell'],
    [0.82, 'Installing the glass'],
    [1.01, 'Locking the roof in place']
  ];
  const journeyLabels = [
    [.34, 'Opening the horizon'],
    [.77, 'Drawing in the light'],
    [.94, 'Bringing the landscape closer'],
    [1.01, 'Opening the view']
  ];

  const paintProgress = (value, label) => {
    const bounded = Math.max(0, Math.min(1, value));
    document.documentElement.style.setProperty('--loader-progress', bounded.toFixed(4));
    const percent = Math.round(bounded * 100);
    if (progressText) progressText.textContent = `${String(percent).padStart(3, '0')}%`;
    if (statusText && label) {
      const constructionLabel = constructionLabels.find(([until]) => bounded < until)?.[1];
      const journeyLabel = journeyLabels.find(([until]) => bounded < until)?.[1];
      statusText.textContent = label === 'Welcome home'
        ? label
        : isV1
          ? constructionLabel || 'Commissioning the home'
          : journeyLabel || 'Opening the view';
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

  const smoothstep = (value) => value * value * (3 - (2 * value));

  const pacingCeiling = (now) => {
    const elapsed = Math.max(0, now - startedAt);
    if (elapsed < introDuration) {
      const phase = elapsed / introDuration;
      return .77 * (1 - Math.pow(1 - phase, 1.55));
    }
    if (elapsed < introDuration + cruiseDuration) {
      const phase = (elapsed - introDuration) / cruiseDuration;
      return .77 + (.17 * smoothstep(phase));
    }
    if (!finished || !readyAt) return .94;
    const completionStart = Math.max(readyAt, startedAt + introDuration + cruiseDuration);
    const phase = Math.max(0, Math.min(1, (now - completionStart) / completionDuration));
    return .94 + (.06 * smoothstep(phase));
  };

  const animateProgress = (now) => {
    progressFrame = 0;
    const pacedTarget = Math.min(targetProgress, pacingCeiling(now));
    visualProgress = Math.max(visualProgress, pacedTarget);

    paintProgress(visualProgress, progressLabel);
    resolveProgressWaiters();

    if (visualProgress < targetProgress) {
      progressFrame = requestAnimationFrame(animateProgress);
    }
  };

  const setProgress = (value, label) => {
    const bounded = Math.max(0, Math.min(1, value));
    progressLabel = label || progressLabel;

    if (reduceMotion) {
      targetProgress = Math.max(targetProgress, bounded);
      visualProgress = targetProgress;
      paintProgress(visualProgress, progressLabel);
      resolveProgressWaiters();
      return;
    }

    targetProgress = Math.max(targetProgress, bounded);
    if (!progressFrame) {
      progressFrame = requestAnimationFrame(animateProgress);
    }
  };

  const waitForProgress = (threshold) => {
    if (visualProgress >= threshold) return Promise.resolve();
    return new Promise((resolve) => progressWaiters.push({ threshold, resolve }));
  };

  const setAssetProgress = (index, value, label) => {
    assetProgress[index] = Math.max(assetProgress[index], Math.max(0, Math.min(1, value)));
    const aggregate = assetProgress.reduce((sum, item) => sum + item, 0) / Math.max(1, assets.length);
    setProgress(aggregate * .94, label);
  };

  const fetchAsset = async (url, index) => {
    if (cache.has(url)) {
      setAssetProgress(index, 1, 'Bringing the landscape closer');
      return;
    }
    loaderState.activeAsset = url;
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body?.getReader();
    const chunks = [];
    let received = 0;
    const loadingLabel = 'Bringing the landscape closer';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        const within = total ? received / total : Math.min(.92, received / (6 * 1024 * 1024));
        setAssetProgress(index, within, loadingLabel);
      }
    } else {
      chunks.push(new Uint8Array(await response.arrayBuffer()));
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') || '' });
    cache.set(url, { blob, objectUrl: URL.createObjectURL(blob), ready: false });
    window.dispatchEvent(new CustomEvent('okno:asset-ready', { detail: { url } }));
    setAssetProgress(index, 1, 'Setting the horizon');
  };

  const fetchAssetUntilReady = async (url, index) => {
    let attempt = 0;
    while (!cache.has(url)) {
      attempt += 1;
      loaderState.retry = attempt - 1;
      try {
        await fetchAsset(url, index);
      } catch (error) {
        console.warn(`Loader retry ${attempt} for ${url}`, error);
        progressLabel = 'Waiting for clear skies';
        paintProgress(visualProgress, progressLabel);
        await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 700 * (2 ** Math.min(attempt - 1, 4)))));
      }
    }
    setAssetProgress(index, 1, 'Setting the horizon');
    loaderState.retry = 0;
    loaderState.downloaded += 1;
    loader.dataset.loaderDownloaded = String(loaderState.downloaded);
  };

  const prepareVideo = (url, index) => {
    const entry = cache.get(url);
    if (!entry?.objectUrl) return Promise.reject(new Error(`${url}: cached video unavailable`));
    if (entry.ready) return Promise.resolve();

    const pageVideo = [...document.querySelectorAll('video[data-src]')]
      .find((video) => video.dataset.src === url);
    const video = pageVideo || document.createElement('video');
    const temporary = !pageVideo;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onError);
      };
      const onReady = () => {
        if (settled || video.readyState < 2) return;
        settled = true;
        cleanup();
        entry.ready = true;
        entry.duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (temporary) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`${url}: video decode failed`));
      };

      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('error', onError);
      video.src = entry.objectUrl;
      video.load();
      if (video.readyState >= 2) onReady();
      progressLabel = 'Bringing the view into focus';
      paintProgress(visualProgress, progressLabel);
    });
  };

  const prepareVideoUntilReady = async (url, index) => {
    let attempt = 0;
    while (!cache.get(url)?.ready) {
      attempt += 1;
      try {
        await prepareVideo(url, index);
      } catch (error) {
        console.warn(`Video preparation retry ${attempt} for ${url}`, error);
        const entry = cache.get(url);
        if (entry) entry.ready = false;
        progressLabel = 'Waiting for clear skies';
        paintProgress(visualProgress, progressLabel);
        await new Promise((resolve) => setTimeout(resolve, Math.min(5000, 500 * attempt)));
      }
    }
    loaderState.prepared += 1;
    loader.dataset.loaderPrepared = String(loaderState.prepared);
    setProgress(.94 + ((index + 1) / Math.max(1, assets.length)) * .06, 'Opening the view');
  };

  const finish = async () => {
    if (finished) return;
    finished = true;
    readyAt = performance.now();
    setProgress(1, isV1 ? 'Commissioning the home' : 'Opening the view');
    if (!reduceMotion) await waitForProgress(.9995);
    visualProgress = 1;
    targetProgress = 1;
    progressLabel = 'Welcome home';
    paintProgress(1, progressLabel);
    loader.classList.add('is-built');
    await new Promise((resolve) => setTimeout(resolve, reduceMotion ? 80 : (isV1 ? 560 : 280)));
    loader.classList.add('is-complete');
    body.classList.remove('is-loading');
    body.classList.add('is-loaded');
    loaderState.complete = true;
    loader.dataset.loaderComplete = 'true';
    loaderState.activeAsset = null;
    window.dispatchEvent(new CustomEvent('okno:page-ready'));
  };

  window.__oknoLoaderReady = (async () => {
    setProgress(.94, 'Opening the horizon');
    for (let index = 0; index < assets.length; index += 1) {
      await fetchAssetUntilReady(assets[index], index);
    }
    for (let index = 0; index < assets.length; index += 1) {
      await prepareVideoUntilReady(assets[index], index);
    }
    await finish();
  })();
})();
