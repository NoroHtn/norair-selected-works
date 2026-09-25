(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = Array.from(document.querySelectorAll('.card'));
  const sections = ['slots', 'crash-instant'].map(id => document.getElementById(id)).filter(Boolean);
  const navLinks = Array.from(document.querySelectorAll('.collection-nav a[data-section]'));
  const progress = document.querySelector('[data-scroll-progress]');
  let scrollFrame = 0;

  const updateScroll = () => {
    scrollFrame = 0;
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

  // Artwork remains readable without JavaScript or an intersection observer.
  const revealItems = Array.from(document.querySelectorAll('.card, .project-context, .about, .cinematic'));
  let revealObserver;
  const setupReveals = () => {
    revealObserver?.disconnect();
    revealItems.forEach(item => item.classList.remove('will-reveal'));
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 50px 0px' });
    revealItems.forEach(item => {
      if (!item.classList.contains('is-visible')) {
        revealObserver.observe(item);
        item.classList.add('will-reveal');
      }
    });
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
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!pointer || reducedMotion.matches || !finePointer.matches) return;
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
    setupReveals();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', preferenceChange);
  else reducedMotion.addListener(preferenceChange);
  if (finePointer.addEventListener) finePointer.addEventListener('change', () => artworks.forEach(resetTilt));

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
    if (searchStatus) searchStatus.textContent = query
      ? `${count} ${count === 1 ? 'game' : 'games'} found`
      : `${cards.length} games in the collection`;
    scheduleScroll();
  };
  if (search) {
    search.addEventListener('input', filterGames);
    search.addEventListener('search', filterGames);
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
    let trigger;
    let index = 0;
    const showImage = nextIndex => {
      if (!gallery.length || !image) return;
      index = (nextIndex + gallery.length) % gallery.length;
      const link = gallery[index];
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || 'Game artwork';
      if (caption) caption.textContent = image.alt;
      if (counter) counter.textContent = `${index + 1} / ${gallery.length}`;
    };
    gallery.forEach((link, position) => {
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !image) return;
        event.preventDefault();
        trigger = link;
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
      trigger?.focus({ preventScroll: true });
    });
  }

  const reel = document.getElementById('reel-dialog');
  if (reel && typeof reel.showModal === 'function') {
    const video = reel.querySelector('video');
    const title = document.getElementById('reel-title');
    let trigger;
    if (video) document.querySelectorAll('[data-open-reel]').forEach(button => {
      button.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !button.dataset.video) return;
        event.preventDefault();
        trigger = button;
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'none';
        video.poster = button.dataset.poster || '';
        video.src = button.dataset.video;
        if (title) title.textContent = button.dataset.title || 'Game cinematic';
        reel.showModal();
        lockScroll(reel);
        const playback = video.play();
        if (playback?.catch) playback.catch(() => { /* Native controls remain available. */ });
      });
    });
    reel.querySelector('[data-close-reel], .close')?.addEventListener('click', () => reel.close());
    reel.addEventListener('click', event => closeOnBackdrop(reel, event));
    reel.addEventListener('close', () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      unlockScroll(reel);
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
