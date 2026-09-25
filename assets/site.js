(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let manuallyPaused = false;
  try { manuallyPaused = localStorage.getItem('portfolio-motion') === 'off'; } catch {}
  const motionAllowed = () => !reducedMotion.matches && !manuallyPaused;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = Array.from(document.querySelectorAll('.card'));
  const sections = ['slots', 'crash-instant'].map(id => document.getElementById(id)).filter(Boolean);
  const navLinks = Array.from(document.querySelectorAll('.collection-nav a[data-section]'));
  const progress = document.querySelector('[data-scroll-progress]');
  let scrollFrame = 0;

  const updateScroll = () => {
    scrollFrame = 0;
    document.querySelector('.back-top')?.classList.toggle('is-visible', window.scrollY > 600);
    if (progress) {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0})`;
    }
    const visibleSections = sections.filter(section => !section.hidden);
    const threshold = Math.min(200, window.innerHeight * 0.3);
    let active = visibleSections[0];
    visibleSections.forEach(section => {
      if (section.getBoundingClientRect().top <= threshold) active = section;
    });
    navLinks.forEach(link => {
      const selected = Boolean(active && link.dataset.section.replace(/^#/, '') === active.id);
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll);
  };
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('load', scheduleScroll, { once: true });
  updateScroll();

  // Content stays visible before, during and after animation setup.
  const revealItems = Array.from(document.querySelectorAll('.card, .project-context, .about, .cinematic'));
  let revealObserver;
  const setupReveals = () => {
    revealObserver?.disconnect();
    if (!motionAllowed() || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const item = entry.target;
        if (!item.classList.contains('is-visible') && item.animate && motionAllowed()) {
          item.animate([{ opacity: 0.25, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 540, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
        item.classList.add('is-visible');
        revealObserver.unobserve(item);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 30px 0px' });
    revealItems.filter(item => !item.classList.contains('is-visible')).forEach(item => revealObserver.observe(item));
  };
  setupReveals();

  const artworks = Array.from(document.querySelectorAll('.card-art'));
  const resetTilt = art => {
    ['--rx', '--ry', '--mx', '--my'].forEach(property => art.style.removeProperty(property));
  };
  artworks.forEach(art => {
    let frame = 0;
    let pointer;
    art.addEventListener('pointermove', event => {
      if (!motionAllowed() || !finePointer.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!pointer || !motionAllowed() || !finePointer.matches) return;
        const rect = art.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(1, (pointer.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (pointer.y - rect.top) / rect.height));
        art.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
        art.style.setProperty('--ry', `${((x - 0.5) * 6).toFixed(2)}deg`);
        art.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        art.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    }, { passive: true });
    const leave = () => {
      pointer = null;
      window.cancelAnimationFrame(frame);
      frame = 0;
      resetTilt(art);
    };
    art.addEventListener('pointerleave', leave);
    art.addEventListener('pointercancel', leave);
  });
  const preferenceChange = () => {
    artworks.forEach(resetTilt);
    document.body.classList.toggle('motion-paused', !motionAllowed());
    const motionButton = document.querySelector('[data-motion]');
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(motionAllowed()));
      motionButton.setAttribute('aria-label', motionAllowed() ? 'Pause decorative motion' : 'Enable decorative motion');
      motionButton.querySelector('span').textContent = motionAllowed() ? 'on' : 'off';
      motionButton.disabled = reducedMotion.matches;
      motionButton.title = reducedMotion.matches ? 'Your system preference reduces motion' : '';
    }
    if (!motionAllowed()) document.getAnimations?.().forEach(animation => animation.cancel());
    setupReveals();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', preferenceChange);
  else reducedMotion.addListener(preferenceChange);
  if (finePointer.addEventListener) finePointer.addEventListener('change', () => artworks.forEach(resetTilt));

  document.querySelector('[data-motion]')?.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    try { localStorage.setItem('portfolio-motion', manuallyPaused ? 'off' : 'on'); } catch {}
    preferenceChange();
  });
  preferenceChange();

  document.querySelectorAll('img[data-fallback]').forEach(img => {
    const fallback = () => {
      const src = img.dataset.fallback;
      if (!src || img.src.endsWith(src)) return;
      delete img.dataset.fallback;
      img.removeAttribute('srcset');
      img.src = src;
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && !img.naturalWidth) fallback();
  });

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.dataset.layout = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      scheduleScroll();
    });
  });

  const showcase = document.querySelector('.showcase');
  const showcaseData = document.getElementById('showcase-data');
  if (showcase && showcaseData) {
    const items = JSON.parse(showcaseData.textContent);
    const mainImage = showcase.querySelector('[data-showcase-image]');
    const mainLink = showcase.querySelector('[data-showcase-link]');
    const title = showcase.querySelector('[data-showcase-title]');
    let selected = 0;
    let request = 0;
    const display = async position => {
      selected = (position + items.length) % items.length;
      const index = selected;
      const token = ++request;
      const item = items[index];
      const preload = new Image();
      preload.src = item.image;
      try { await preload.decode(); } catch {}
      if (token !== request) return;
      mainImage.src = item.image;
      mainImage.alt = item.title + ' key art';
      mainLink.href = item.href;
      mainLink.setAttribute('aria-label', 'Explore ' + item.title);
      title.href = item.href;
      title.textContent = item.title;
      showcase.querySelector('[data-showcase-category]').textContent = item.category;
      showcase.querySelector('[data-showcase-count]').textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
      showcase.querySelector('.stage-back-one').src = items[(index + 1) % items.length].image;
      showcase.querySelector('.stage-back-two').src = items[(index + 2) % items.length].image;
      showcase.querySelectorAll('[data-showcase-go]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.showcaseGo) === index)));
      if (motionAllowed() && mainImage.animate) mainImage.animate([{ opacity: .45, transform: 'scale(.975)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
    };
    showcase.querySelector('[data-showcase-prev]').addEventListener('click', () => display(selected - 1));
    showcase.querySelector('[data-showcase-next]').addEventListener('click', () => display(selected + 1));
    showcase.querySelectorAll('[data-showcase-go]').forEach(button => button.addEventListener('click', () => display(Number(button.dataset.showcaseGo))));
    showcase.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); display(selected + (event.key === 'ArrowRight' ? 1 : -1));
    });
    let stageFrame = 0;
    showcase.addEventListener('pointermove', event => {
      if (!motionAllowed() || !finePointer.matches || event.pointerType === 'touch') return;
      cancelAnimationFrame(stageFrame);
      stageFrame = requestAnimationFrame(() => {
        const rect = showcase.getBoundingClientRect();
        showcase.style.setProperty('--stage-x', ((event.clientX - rect.left) / rect.width * 5 - 2.5) + 'deg');
        showcase.style.setProperty('--stage-y', (2.5 - (event.clientY - rect.top) / rect.height * 5) + 'deg');
      });
    }, { passive: true });
    showcase.addEventListener('pointerleave', () => { cancelAnimationFrame(stageFrame); showcase.style.removeProperty('--stage-x'); showcase.style.removeProperty('--stage-y'); });
  }

  const search = document.getElementById('game-search');
  const empty = document.getElementById('empty-results');
  const searchStatus = document.getElementById('search-status');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const searchableCards = cards.map(card => {
    const title = normalize(card.querySelector('h3')?.textContent || '');
    const aliases = [title];
    if (title.includes('chartx')) aliases.push('xchart');
    if (title.includes('capinho')) aliases.push('fortunecapibara', 'fortunecapybara', 'capibara', 'capybara');
    return { card, aliases };
  });
  const filterGames = () => {
    const query = normalize(search?.value || '');
    let count = 0;
    searchableCards.forEach(({ card, aliases }) => {
      const matches = !query || aliases.some(alias => alias.includes(query));
      card.hidden = !matches;
      if (matches) count += 1;
    });
    sections.forEach(section => {
      section.hidden = !Array.from(section.querySelectorAll('.card')).some(card => !card.hidden);
    });
    if (empty) empty.hidden = count !== 0;
    document.querySelectorAll('.clear-search').forEach(button => { button.hidden = !query; });
    if (searchStatus) searchStatus.textContent = query
      ? `${count} ${count === 1 ? 'game' : 'games'} found`
      : `${cards.length} games in the collection`;
    scheduleScroll();
  };
  if (search) {
    search.addEventListener('input', filterGames);
    search.addEventListener('search', filterGames);
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        const target = document.getElementById(link.hash.slice(1));
        if (target && sections.includes(target) && target.hidden) {
          search.value = '';
          filterGames();
        }
      });
    });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        filterGames();
      }
    });
    document.querySelectorAll('[data-clear-search]').forEach(button => {
      button.addEventListener('click', () => {
        search.value = '';
        filterGames();
        search.focus({ preventScroll: true });
      });
    });
    filterGames();
  }

  const openDialogs = new Set();
  let previousOverflow = '';
  const lockScroll = dialog => {
    if (!openDialogs.size) previousOverflow = document.body.style.overflow;
    openDialogs.add(dialog);
    document.body.style.overflow = 'hidden';
  };
  const unlockScroll = dialog => {
    openDialogs.delete(dialog);
    if (!openDialogs.size) document.body.style.overflow = previousOverflow;
  };
  const closeOnBackdrop = (dialog, event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  };

  const dialog = document.querySelector('.lightbox');
  const gallery = Array.from(document.querySelectorAll('[data-lightbox]'));
  if (dialog && typeof dialog.showModal === 'function') {
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('p');
    const counter = dialog.querySelector('[data-gallery-count]');
    const previous = dialog.querySelector('[data-gallery-prev]');
    const next = dialog.querySelector('[data-gallery-next]');
    const thumbs = dialog.querySelector('.viewer-thumbs');
    const zoomButton = dialog.querySelector('[data-gallery-zoom]');
    const resetZoom = () => { dialog.classList.remove('is-zoomed'); if (zoomButton) { zoomButton.textContent = 'Zoom in'; zoomButton.setAttribute('aria-pressed', 'false'); } };
    zoomButton?.addEventListener('click', () => { const zoomed = dialog.classList.toggle('is-zoomed'); zoomButton.textContent = zoomed ? 'Fit image' : 'Zoom in'; zoomButton.setAttribute('aria-pressed', String(zoomed)); });
    image?.addEventListener('click', () => zoomButton?.click());
    let thumbnailsReady = false;
    let trigger;
    let index = 0;
    const showImage = nextIndex => {
      if (!gallery.length || !image) return;
      resetZoom();
      index = (nextIndex + gallery.length) % gallery.length;
      const link = gallery[index];
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || 'Game artwork';
      if (caption) caption.textContent = image.alt;
      if (counter) counter.textContent = `Artwork ${index + 1} / ${gallery.length}`;
      thumbs?.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    };
    gallery.forEach((link, position) => {
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !image) return;
        event.preventDefault();
        trigger = link;
        if (thumbs && !thumbnailsReady) {
          gallery.forEach((item, i) => {
            const button = document.createElement('button'); button.type = 'button';
            button.setAttribute('aria-label', 'Show artwork ' + (i + 1));
            const thumb = document.createElement('img'); thumb.src = item.href; thumb.alt = ''; thumb.loading = 'lazy';
            button.append(thumb); button.addEventListener('click', () => showImage(i)); thumbs.append(button);
          });
          thumbnailsReady = true;
        }
        showImage(position);
        dialog.showModal();
        lockScroll(dialog);
      });
    });
    [previous, next].forEach(button => { if (button) button.hidden = gallery.length < 2; });
    previous?.addEventListener('click', () => showImage(index - 1));
    next?.addEventListener('click', () => showImage(index + 1));
    dialog.querySelector('.close, [data-close-gallery]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showImage(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    dialog.addEventListener('click', event => closeOnBackdrop(dialog, event));
    dialog.addEventListener('close', () => {
      unlockScroll(dialog);
      resetZoom();
      trigger?.focus({ preventScroll: true });
    });
  }

  const copyStatus = document.getElementById('copy-status');
  document.querySelectorAll('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail || document.querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7).split('?')[0];
      if (!email) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(email);
        if (copyStatus) copyStatus.textContent = 'Email address copied.';
      } catch {
        if (copyStatus) copyStatus.textContent = `Select and copy: ${email}`;
      }
    });
  });
})();
