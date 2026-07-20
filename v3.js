(async () => {
  if (window.__oknoLoaderReady) await window.__oknoLoaderReady;
  const world = document.getElementById('world');
  if (!world || typeof window.mountScrollWorld !== 'function') return;

  window.mountScrollWorld(world, {
    hint: 'scroll to move through home',
    nav: false,
    atmosphere: true,
    diveScroll: 1.8,
    connScroll: .2,
    crossfade: .08,
    sections: [
      {
        id: 'arrival',
        label: 'The House',
        still: 'assets/v3/landscape-01.webp',
        stillMobile: 'assets/v3/portrait-01.webp',
        clip: 'assets/v3/vid/landscape-01.mp4',
        clipMobile: 'assets/v3/vid/portrait-01.mp4',
        accent: '#0e9d68',
        scroll: 2.1,
        linger: .36,
        eyebrow: 'Already home',
        title: 'The house is the horizon.',
        body: 'Start with the Okno itself—white timber, clear glass, and a living green world gathered around it.',
        tags: ['Vibrant daylight', 'Centered by design']
      },
      {
        id: 'threshold',
        label: 'The Threshold',
        still: 'assets/v3/landscape-02.webp',
        stillMobile: 'assets/v3/portrait-02.webp',
        clip: 'assets/v3/vid/landscape-02.mp4',
        clipMobile: 'assets/v3/vid/portrait-02.mp4',
        accent: '#d99b1e',
        scroll: 1.7,
        linger: .28,
        eyebrow: 'Light becomes material',
        title: 'Made of light and timber.',
        body: 'Cross the threshold and the landscape stays with you—in leaf shadows, warm grain, and luminous glass.',
        tags: ['Warm timber', 'Quiet geometry']
      },
      {
        id: 'view',
        label: 'The View',
        still: 'assets/v3/landscape-03.webp',
        stillMobile: 'assets/v3/portrait-03.webp',
        clip: 'assets/v3/vid/landscape-03.mp4',
        clipMobile: 'assets/v3/vid/portrait-03.mp4',
        accent: '#168fe8',
        scroll: 1.9,
        linger: .42,
        eyebrow: 'Inside, looking out',
        title: 'Every room borrows the view.',
        body: 'The camera flows from living space to deck while blue water and saturated mountains remain part of the architecture.',
        tags: ['Crystal water', 'Open panorama']
      },
      {
        id: 'aurora',
        label: 'Night Light',
        still: 'assets/v3/landscape-04.webp',
        stillMobile: 'assets/v3/portrait-04.webp',
        clip: 'assets/v3/vid/landscape-04.mp4',
        clipMobile: 'assets/v3/vid/portrait-04.mp4',
        accent: '#8e5cf5',
        scroll: 2.15,
        linger: .48,
        eyebrow: 'The long light',
        title: 'Night gathers around home.',
        body: 'Golden hour becomes luminous blue and aurora—yet the Okno stays centered, warm, and unmistakably alive.',
        tags: ['Aurora sky', 'Warm after dark'],
        cta: {
          primary: { label: 'Find your place', href: '#enquire' },
          secondary: { label: 'Return to V1', href: 'index.html' }
        }
      }
    ],
    connectors: [null, null, null],
    connectorsMobile: [null, null, null]
  });
})();
