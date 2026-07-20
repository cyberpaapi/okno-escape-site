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
  let finished = false;
  const constructionLabels = [
    [0.16, 'Surveying the site'],
    [0.38, 'Setting the foundation'],
    [0.62, 'Raising the modular shell'],
    [0.82, 'Installing the glass'],
    [1.01, 'Locking the roof in place']
  ];

  const setProgress = (value, label) => {
    const bounded = Math.max(0, Math.min(1, value));
    document.documentElement.style.setProperty('--loader-progress', bounded.toFixed(4));
    const percent = Math.round(bounded * 100);
    if (progressText) progressText.textContent = `${String(percent).padStart(3, '0')}%`;
    if (statusText && label) {
      const constructionLabel = constructionLabels.find(([until]) => bounded < until)?.[1];
      statusText.textContent = body.dataset.version === 'v1' && label !== 'Welcome home'
        ? constructionLabel || 'Commissioning the home'
        : label;
    }
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(percent));
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
    const remaining = Math.max(0, 900 - (performance.now() - startedAt));
    if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
    setProgress(1, 'Welcome home');
    await new Promise((resolve) => setTimeout(resolve, 280));
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
