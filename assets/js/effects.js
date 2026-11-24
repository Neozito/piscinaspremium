(() => {
  'use strict';

  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const loader = document.getElementById('water-loader');

  if (loader && !motion.matches) {
    root.classList.add('water-loading');

    function finishLoading() {
      clearTimeout(deadline);
      if (loader.classList.contains('draining')) return;
      loader.classList.add('draining');
      setTimeout(() => {
        root.classList.remove('water-loading');
        loader.hidden = true;
      }, 900);
    }

    const deadline = setTimeout(finishLoading, 1400);
    if (document.readyState === 'complete') {
      setTimeout(finishLoading, 550);
    } else {
      window.addEventListener('load', () => setTimeout(finishLoading, 550), { once: true });
    }
    window.addEventListener('pageshow', event => {
      if (event.persisted) finishLoading();
    });
  }

  if ('IntersectionObserver' in window) {
    const waveObserver = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        target.classList.toggle('is-flowing', isIntersecting);
      }
    });
    document.querySelectorAll('.water-wave').forEach(wave => waveObserver.observe(wave));

    const photoObserver = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        if (!motion.matches) target.classList.add('wet-reveal');
        photoObserver.unobserve(target);
      }
    }, { threshold: .12 });
    document.querySelectorAll('.water-photo').forEach(photo => photoObserver.observe(photo));
  }

  const video = document.getElementById('hero-video');
  if (!video) return;

  const track = document.getElementById('inicio');
  const sticky = track.querySelector('.hero-sticky');
  const actions = track.querySelector('.hero-actions');
  const cue = track.querySelector('.scroll-cue');
  const header = document.getElementById('header');
  const source = video.querySelector('source');
  const shortViewport = matchMedia('(max-height: 530px)');

  let canSeek = Boolean(source && video.canPlayType(source.type) && !video.error);
  let frame = 0;
  let lastFrame = 0;
  let progress;
  let targetTime = 0;

  const clamp = value => Math.max(0, Math.min(1, value));
  function ease(value, start, end) {
    const fraction = clamp((value - start) / (end - start));
    return fraction * fraction * (3 - 2 * fraction);
  }

  function seekVideo() {
    if (!track.classList.contains('hero-motion') || video.readyState < 1 || video.seeking) return;
    const tolerance = progress === 0 || progress === 1 ? .003 : 1 / 24;
    if (Math.abs(video.currentTime - targetTime) >= tolerance) {
      video.currentTime = targetTime;
    }
  }

  function render(now) {
    frame = 0;
    const rect = track.getBoundingClientRect();
    const viewport = sticky.offsetHeight;
    const pastHero = rect.bottom < viewport * .8;
    if (!track.classList.contains('hero-motion')) {
      header.classList.toggle('solid', pastHero);
      return;
    }

    const range = Math.max(1, rect.height - viewport);
    const target = rect.bottom - viewport < 1 ? 1 : clamp(-rect.top / range);
    const elapsed = lastFrame ? Math.min(now - lastFrame, 48) : 16;
    if (progress === undefined || rect.bottom <= 0) {
      progress = target;
    } else {
      progress += (target - progress) * (1 - Math.exp(-elapsed / 75));
      if (Math.abs(target - progress) < .001) progress = target;
    }

    const titleExit = ease(progress, .06, .27);
    const descriptionExit = ease(progress, .11, .33);
    const actionsExit = ease(progress, .16, .39);
    const cueExit = ease(progress, .02, .20);
    const whiteFade = ease(progress, .93, 1);
    header.classList.toggle('solid', pastHero || progress >= .95);

    sticky.style.setProperty('--hero-title-exit', titleExit);
    sticky.style.setProperty('--hero-description-exit', descriptionExit);
    sticky.style.setProperty('--hero-actions-exit', actionsExit);
    sticky.style.setProperty('--hero-cue-exit', cueExit);
    sticky.style.setProperty('--hero-shade', 1 - .82 * ease(progress, .16, .45));
    sticky.style.setProperty('--hero-scale', 1 + .045 * ease(progress, 0, .78));
    sticky.style.setProperty('--hero-white', whiteFade);
    sticky.style.setProperty('--hero-progress-exit', ease(progress, .86, .97));
    sticky.style.setProperty('--hero-progress', progress);

    actions.classList.toggle('is-past', actionsExit >= .995);
    cue.classList.toggle('is-past', cueExit >= .995);

    if (Number.isFinite(video.duration)) {
      // Stay within the last decodable frame of the original clip.
      targetTime = progress * Math.max(0, video.duration - 1 / 24);
      seekVideo();
    }

    lastFrame = progress === target ? 0 : now;
    if (lastFrame) queue();
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function syncHeroMode() {
    const enabled = canSeek && !motion.matches && !shortViewport.matches;
    track.classList.toggle('hero-motion', enabled);
    progress = undefined;
    lastFrame = 0;
    queue();
  }

  function videoReady() {
    video.parentElement.classList.add('hero-video-ready');
    queue();
  }

  function videoFailed() {
    canSeek = false;
    syncHeroMode();
  }

  video.addEventListener('loadedmetadata', queue);
  video.addEventListener('loadeddata', videoReady);
  video.addEventListener('seeked', seekVideo);
  video.addEventListener('error', videoFailed);
  source?.addEventListener('error', videoFailed);
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('pageshow', queue);
  motion.addEventListener?.('change', syncHeroMode);
  shortViewport.addEventListener?.('change', syncHeroMode);

  if (video.readyState >= 2) videoReady();
  syncHeroMode();
})();
