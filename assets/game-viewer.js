(() => {
  'use strict';

  // Every project keeps a real URL. This enhancement is optional and never
  // prevents navigation until the data and native dialog are ready.
  const script = document.currentScript;
  if (!script?.src) return;
  const siteRoot = new URL('../', script.src);
  const dialog = document.querySelector('dialog.game-viewer');
  const projectId = document.body.dataset.projectId;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetURL = value => new URL(value, siteRoot).href;
  const motionAllowed = () => !reducedMotion.matches && !document.body.classList.contains('motion-paused');
  let games = [];
  let gamesById = new Map();
  let currentIndex = -1;
  let returnFocus = null;
  let returnURL = location.href;
  let savedScroll = null;
  let restoringHistory = false;
  let openAnimation = null;
  const session = `portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function setText(root, selector, value) {
    const elements = root.querySelectorAll(selector);
    elements.forEach(element => { element.textContent = value || ''; });
    return elements[0];
  }

  function setExternalLink(link, url) {
    if (!link) return;
    link.hidden = !url;
    if (!url) {
      link.removeAttribute('href');
      return;
    }
    link.href = new URL(url, siteRoot).href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function stopMedia(root) {
    root.querySelectorAll('video, audio').forEach(media => media.pause());
  }

  function renderGallery(root, game) {
    const container = root.querySelector('[data-game-gallery]');
    const hero = root.querySelector('img[data-game-cover]');
    const ambient = root.querySelector('img[data-game-ambient]');
    if (!hero) return;

    const images = [{ src: game.cover, alt: `${game.title} key art` }, ...(game.images || [])]
      .filter((item, index, items) => item?.src && items.findIndex(other => other?.src === item.src) === index);
    const buttons = [];
    const showImage = position => {
      const item = images[position];
      if (!item) return;
      hero.src = assetURL(item.src);
      hero.alt = item.alt || `${game.title} artwork ${position + 1}`;
      if (ambient) ambient.src = assetURL(item.src);
      buttons.forEach((button, index) => {
        const selected = index === position;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    };

    if (container) {
      stopMedia(container);
      container.replaceChildren();
      const fragment = document.createDocumentFragment();
      images.forEach((item, position) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-gallery-item';
        button.dataset.gameImageSrc = item.src;
        button.dataset.gameImageAlt = item.alt || `${game.title} artwork ${position + 1}`;
        button.setAttribute('aria-label', `Show ${position === 0 ? 'key art' : `artwork ${position + 1}`} for ${game.title}`);
        const image = document.createElement('img');
        image.src = assetURL(item.src);
        image.alt = item.alt || `${game.title} artwork ${position + 1}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        button.append(image);
        button.addEventListener('click', () => {
          showImage(position);
          root.querySelector('.game-hero')?.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' });
        });
        buttons.push(button);
        fragment.append(button);
      });

      if (game.video) {
        const source = typeof game.video === 'string' ? game.video : game.video.src;
        if (source) {
          const video = document.createElement('video');
          video.className = 'game-gallery-video';
          video.controls = true;
          video.preload = 'none';
          video.playsInline = true;
          video.src = assetURL(source);
          video.setAttribute('aria-label', `${game.title} game preview`);
          const poster = typeof game.video === 'object' ? game.video.poster : null;
          video.poster = assetURL(poster || game.cover);
          video.textContent = 'Your browser cannot play this video.';
          fragment.append(video);
        }
      }
      container.append(fragment);
      container.hidden = images.length < 2 && !game.video;
    }
    showImage(0);
  }

  function renderGame(root, game, index) {
    setText(root, '[data-game-count]', `${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`);
    setText(root, '[data-game-label]', `${game.title} · ${game.category}`);
    setText(root, '[data-game-title]', game.title);
    setText(root, '[data-game-description]', game.description);
    setText(root, '[data-game-credit]', game.credit);
    setText(root, '[data-game-category]', game.category);
    setText(root, '[data-game-company]', game.company);

    const play = setText(root, '[data-game-play]', `Play ${game.title} ↗`);
    const playShort = setText(root, '[data-game-play-short]', 'Play game ↗');
    [play, playShort].forEach(link => setExternalLink(link, game.playUrl || game.officialUrl));
    setText(root, '[data-game-play-note]', game.playDirect
      ? 'Opens the game in a new tab'
      : 'Opens on Pascal Gaming · select Play on the game page');
    setExternalLink(root.querySelector('[data-game-official]'), game.officialUrl);
    renderGallery(root, game);
  }

  function lockPage() {
    if (savedScroll) return;
    const body = document.body;
    savedScroll = {
      x: window.scrollX,
      y: window.scrollY,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight
    };
    const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.position = 'fixed';
    body.style.top = `${-savedScroll.y}px`;
    body.style.left = `${-savedScroll.x}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbar) body.style.paddingRight = `${padding + scrollbar}px`;
    body.classList.add('game-viewer-open');
  }

  function unlockPage() {
    if (!savedScroll) return;
    const state = savedScroll;
    savedScroll = null;
    const body = document.body;
    ['position', 'top', 'left', 'width', 'overflow', 'paddingRight'].forEach(property => {
      body.style[property] = state[property];
    });
    body.classList.remove('game-viewer-open');
    // Explicitly disable smooth scrolling while returning to the exact card.
    const html = document.documentElement;
    const behavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(state.x, state.y);
    html.style.scrollBehavior = behavior;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function resetViewerScroll() {
    dialog.scrollTop = 0;
    const content = dialog.querySelector('.game-view-content');
    if (content) content.scrollTop = 0;
  }

  function projectFromHash() {
    if (!location.hash.startsWith('#game=')) return null;
    try { return gamesById.get(decodeURIComponent(location.hash.slice(6))) || null; }
    catch { return null; }
  }

  function gameURL(id) {
    const url = new URL(location.href);
    url.hash = `game=${encodeURIComponent(id)}`;
    return url;
  }

  function historyState() {
    const state = history.state && typeof history.state === 'object' ? history.state : {};
    return { ...state, portfolioGameViewer: { session, returnURL } };
  }

  function displayGame(index) {
    currentIndex = (index + games.length) % games.length;
    const game = games[currentIndex];
    stopMedia(dialog);
    renderGame(dialog, game, currentIndex);
    const previous = games[(currentIndex - 1 + games.length) % games.length];
    const next = games[(currentIndex + 1) % games.length];
    dialog.querySelector('[data-game-prev]')?.setAttribute('aria-label', `Previous game: ${previous.title}`);
    dialog.querySelector('[data-game-next]')?.setAttribute('aria-label', `Next game: ${next.title}`);
    resetViewerScroll();
  }

  function openGame(game, trigger, fromHistory = false) {
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    const wasOpen = dialog.open;
    if (!wasOpen) {
      returnFocus = trigger || document.activeElement;
      if (!fromHistory) returnURL = location.href;
      else {
        const previous = history.state?.portfolioGameViewer;
        returnURL = previous?.returnURL || `${location.pathname}${location.search}`;
      }
    }
    try {
      displayGame(games.indexOf(game));
      if (!wasOpen) {
        // Lock first to prevent Safari from scrolling the document to the dialog.
        lockPage();
        dialog.showModal();
        resetViewerScroll();
        dialog.querySelector('[data-game-close]')?.focus({ preventScroll: true });
        const content = dialog.querySelector('.game-view-content');
        if (motionAllowed() && content?.animate) {
          openAnimation = content.animate(
            [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 240, easing: 'ease-out' }
          );
        }
      }
    } catch {
      if (dialog.open) dialog.close();
      unlockPage();
      return false;
    }
    if (!fromHistory) {
      try {
        if (wasOpen) history.replaceState(historyState(), '', gameURL(game.id));
        else history.pushState(historyState(), '', gameURL(game.id));
      } catch { /* Dialog navigation still works when history is unavailable. */ }
    }
    return true;
  }

  function navigateGame(offset) {
    if (!dialog?.open || !games.length) return;
    const next = (currentIndex + offset + games.length) % games.length;
    displayGame(next);
    try { history.replaceState(history.state, '', gameURL(games[next].id)); } catch {}
  }

  function restoreURL() {
    if (!projectFromHash()) return;
    const owned = history.state?.portfolioGameViewer?.session === session;
    if (owned) history.back();
    else {
      const state = history.state && typeof history.state === 'object' ? { ...history.state } : {};
      delete state.portfolioGameViewer;
      try { history.replaceState(state, '', returnURL); } catch {}
    }
  }

  function syncHistory() {
    const game = projectFromHash();
    if (game) {
      if (!dialog.open || games[currentIndex]?.id !== game.id) openGame(game, null, true);
    } else if (dialog.open) {
      restoringHistory = true;
      dialog.close();
    }
  }

  function setupDialog() {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (!dialog.hasAttribute('aria-labelledby')) dialog.setAttribute('aria-label', 'Game portfolio viewer');
    const label = dialog.querySelector('[data-game-label]');
    if (label) {
      label.setAttribute('aria-live', 'polite');
      label.setAttribute('aria-atomic', 'true');
    }
    dialog.querySelector('[data-game-prev]')?.addEventListener('click', event => {
      event.preventDefault();
      navigateGame(-1);
    });
    dialog.querySelector('[data-game-next]')?.addEventListener('click', event => {
      event.preventDefault();
      navigateGame(1);
    });
    dialog.querySelector('[data-game-close]')?.addEventListener('click', event => {
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener('close', () => {
      stopMedia(dialog);
      openAnimation?.cancel();
      unlockPage();
      if (!restoringHistory) restoreURL();
      restoringHistory = false;
    });
    dialog.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      // Do not take over controls whose native arrow keys have another purpose.
      if (event.target.closest('video, audio, input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      navigateGame(event.key === 'ArrowRight' ? 1 : -1);
    });
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      let url;
      try { url = new URL(link.href); } catch { return; }
      const prefix = `${siteRoot.pathname}work/`;
      if (url.origin !== siteRoot.origin || !url.pathname.startsWith(prefix)) return;
      const slug = url.pathname.slice(prefix.length).replace(/\/(?:index\.html)?$/, '');
      if (slug.includes('/')) return;
      const game = gamesById.get(slug);
      if (!game) return;
      if (openGame(game, link)) event.preventDefault();
    });
    window.addEventListener('popstate', syncHistory);
    window.addEventListener('hashchange', syncHistory);
    syncHistory();
  }

  // Existing direct project pages remain usable without JavaScript or a fetch.
  fetch(new URL('assets/games.json', siteRoot), { credentials: 'same-origin' })
    .then(response => {
      if (!response.ok) throw new Error('Game data unavailable');
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data) || !data.length) return;
      games = data.filter(game => game?.id && game.title && game.cover);
      gamesById = new Map(games.map(game => [game.id, game]));
      if (projectId) {
        const game = gamesById.get(projectId);
        const root = document.querySelector('.game-view-content');
        if (game && root) renderGame(root, game, games.indexOf(game));
      } else setupDialog();
    })
    .catch(() => { /* All real project links and server-rendered pages still work. */ });
})();
