/* ==========================================================================
   Flipbook viewer — vanilla JS, no dependencies.
   Single page on phones, two-page spread on wide landscape screens.
   Swipe / keyboard / thumbnails / pinch-zoom / auto-play / deep links.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.bookConfig || {};
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    app: $('app'), stage: $('stage'), bookWrap: $('bookWrap'), book: $('book'),
    topbar: $('topbar'), toolbar: $('toolbar'), hint: $('hint'),
    title: $('bookTitle'), pageNow: $('pageNow'), pageTotal: $('pageTotal'),
    indicator: $('pageIndicator'),
    first: $('btnFirst'), prev: $('btnPrev'), next: $('btnNext'), last: $('btnLast'),
    edgePrev: $('btnEdgePrev'), edgeNext: $('btnEdgeNext'),
    thumbs: $('btnThumbs'), zoom: $('btnZoom'), auto: $('btnAuto'),
    share: $('btnShare'), fullscreen: $('btnFullscreen'), download: $('btnDownload'),
    drawer: $('thumbDrawer'), thumbGrid: $('thumbGrid'), thumbsClose: $('btnThumbsClose'),
    scrim: $('scrim'), splash: $('splash'), splashText: $('splashText')
  };

  /* ---------------------------------------------------------------- state */
  var book = {
    pages: [],          // [{ src, thumb, w, h }]
    count: 0,
    ratio: 16 / 9,      // page aspect (w/h) taken from the manifest
    current: 1,         // 1-based, left page of the spread when spread is on
    spread: false,
    zoom: 1,
    panX: 0, panY: 0,
    animating: false,
    autoTimer: null
  };

  /* ------------------------------------------------------------- manifest */
  function loadManifest() {
    var url = CFG.manifest || '../files/book.json';
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    });
  }

  function applyManifest(data) {
    var pagePath = CFG.pagePath || '../files/mobile/';
    var thumbPath = CFG.thumbPath || '../files/thumb/';

    if (data.title) { CFG.title = data.title; }

    if (Array.isArray(data.pages) && data.pages.length) {
      book.pages = data.pages.map(function (p, i) {
        if (typeof p === 'string') { return { src: pagePath + p, thumb: thumbPath + p, w: 0, h: 0 }; }
        return {
          src: p.src ? (/^https?:|^\.|^\//.test(p.src) ? p.src : pagePath + p.src) : pagePath + (i + 1) + '.jpg',
          thumb: p.thumb ? (/^https?:|^\.|^\//.test(p.thumb) ? p.thumb : thumbPath + p.thumb) : thumbPath + (i + 1) + '.jpg',
          w: p.width || 0, h: p.height || 0
        };
      });
    } else if (data.pageCount) {
      var ext = data.ext || 'jpg';
      book.pages = [];
      for (var i = 1; i <= data.pageCount; i++) {
        book.pages.push({ src: pagePath + i + '.' + ext, thumb: thumbPath + i + '.' + ext, w: 0, h: 0 });
      }
    }

    book.count = book.pages.length;

    var first = book.pages[0];
    if (data.pageWidth && data.pageHeight) { book.ratio = data.pageWidth / data.pageHeight; }
    else if (first && first.w && first.h) { book.ratio = first.w / first.h; }

    document.documentElement.style.setProperty('--thumb-ratio', book.ratio.toFixed(4));
  }

  /* ---------------------------------------------------------------- layout */
  function useSpread() {
    var w = window.innerWidth, h = window.innerHeight;
    return book.count > 1 && w >= (CFG.spreadMinWidth || 900) && w > h;
  }

  /* Pages shown at `n`. In spread mode the cover stands alone, then 2-3, 4-5 … */
  function pagesAt(n) {
    if (!book.spread) { return [n]; }
    if (CFG.coverAlone !== false) {
      if (n === 1) { return [1]; }
      var left = n % 2 === 0 ? n : n - 1;
      return left + 1 <= book.count ? [left, left + 1] : [left];
    }
    var l = n % 2 === 1 ? n : n - 1;
    return l + 1 <= book.count ? [l, l + 1] : [l];
  }

  /* Normalise a target page onto a valid spread start. */
  function normalise(n) {
    n = Math.max(1, Math.min(book.count, n));
    if (!book.spread) { return n; }
    if (CFG.coverAlone !== false) { return n === 1 ? 1 : (n % 2 === 0 ? n : n - 1); }
    return n % 2 === 1 ? n : n - 1;
  }

  function step() { return book.spread ? 2 : 1; }

  /* Fit the book inside the stage, preserving the page aspect ratio. */
  function fit() {
    var rect = el.stage.getBoundingClientRect();
    var avail = Math.max(0, rect.width - 24);
    var availH = Math.max(0, rect.height - 24);
    var shown = pagesAt(book.current).length;
    var ratio = book.ratio * shown;

    var w = avail, h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }

    el.book.style.width = Math.round(w) + 'px';
    el.book.style.height = Math.round(h) + 'px';

    /* Size by the spread width, not the DOM count: mid-flip the book briefly
       holds both the outgoing and the incoming leaves. */
    var leaves = el.book.querySelectorAll('.leaf');
    for (var i = 0; i < leaves.length; i++) {
      leaves[i].style.width = (100 / shown) + '%';
      leaves[i].style.height = '100%';
    }
  }

  function applyTransform() {
    el.bookWrap.style.transform =
      'translate(' + book.panX + 'px,' + book.panY + 'px) scale(' + book.zoom + ')';
  }

  /* ---------------------------------------------------------------- render */
  function makeLeaf(pageNo, side) {
    var d = document.createElement('div');
    d.className = 'leaf' + (side ? ' ' + side : '');
    var img = document.createElement('img');
    img.src = book.pages[pageNo - 1].src;
    img.alt = pageNo + '페이지';
    img.decoding = 'async';
    img.loading = 'eager';
    d.appendChild(img);
    return d;
  }

  function render(direction) {
    var nums = pagesAt(book.current);
    var old = Array.prototype.slice.call(el.book.querySelectorAll('.leaf'));

    el.book.classList.toggle('spread', nums.length > 1);

    var fresh = nums.map(function (n, i) {
      return makeLeaf(n, nums.length > 1 ? (i === 0 ? 'left' : 'right') : '');
    });

    if (direction && old.length && !prefersReducedMotion()) {
      book.animating = true;
      var outCls = direction === 'next' ? 'anim-out-next' : 'anim-out-prev';
      var inCls = direction === 'next' ? 'anim-in-next' : 'anim-in-prev';

      old.forEach(function (o) { o.classList.add(outCls); });
      fresh.forEach(function (f) { f.classList.add(inCls); f.style.position = 'absolute'; f.style.top = '0'; });

      // lay the incoming leaves over the outgoing ones
      fresh.forEach(function (f, i) {
        f.style.left = (i * (100 / fresh.length)) + '%';
        el.book.appendChild(f);
      });
      fit();

      window.setTimeout(function () {
        old.forEach(function (o) { if (o.parentNode) { o.parentNode.removeChild(o); } });
        fresh.forEach(function (f) {
          f.classList.remove(inCls);
          f.style.position = ''; f.style.left = ''; f.style.top = '';
        });
        book.animating = false;
        fit();
      }, 430);
    } else {
      el.book.innerHTML = '';
      fresh.forEach(function (f) { el.book.appendChild(f); });
      book.animating = false;
      fit();
    }

    preload(book.current);
    syncUI();
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var preloaded = {};
  function preload(n) {
    var s = step();
    [n - s, n + s, n + s * 2].forEach(function (p) {
      for (var i = 0; i < step(); i++) {
        var t = p + i;
        if (t >= 1 && t <= book.count && !preloaded[t]) {
          preloaded[t] = true;
          var im = new Image();
          im.src = book.pages[t - 1].src;
        }
      }
    });
  }

  /* -------------------------------------------------------------- navigate */
  function goTo(n, direction) {
    n = normalise(n);
    if (n === book.current && direction) { return; }
    var dir = direction || (n > book.current ? 'next' : n < book.current ? 'prev' : null);
    book.current = n;
    resetZoom();
    render(dir);
    updateHash();
  }

  function next() { if (book.current + step() <= book.count) { goTo(book.current + step(), 'next'); } }
  function prev() { if (book.current > 1) { goTo(book.current - step(), 'prev'); } }

  function syncUI() {
    var nums = pagesAt(book.current);
    el.pageNow.textContent = nums.length > 1 ? nums[0] + '-' + nums[nums.length - 1] : nums[0];
    el.pageTotal.textContent = book.count;

    var atStart = book.current <= 1;
    var atEnd = book.current + step() > book.count;
    [el.first, el.prev, el.edgePrev].forEach(function (b) { b.disabled = atStart; });
    [el.next, el.last, el.edgeNext].forEach(function (b) { b.disabled = atEnd; });

    var cur = el.thumbGrid.querySelector('.thumb.current');
    if (cur) { cur.classList.remove('current'); }
    var t = el.thumbGrid.querySelector('.thumb[data-page="' + nums[0] + '"]');
    if (t) { t.classList.add('current'); }

    document.title = (CFG.title || '전자책') + ' · ' + el.pageNow.textContent + '/' + book.count;
  }

  /* ------------------------------------------------------------ deep links */
  function updateHash() {
    var h = '#page/' + book.current;
    if (window.location.hash !== h) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + h);
    }
  }
  function pageFromHash() {
    var m = /#page\/(\d+)/.exec(window.location.hash || '');
    return m ? parseInt(m[1], 10) : 1;
  }

  /* ------------------------------------------------------------- thumbnails */
  function buildThumbs() {
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= book.count; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.dataset.page = i;
      b.setAttribute('aria-label', i + '페이지로 이동');

      var img = document.createElement('img');
      img.src = book.pages[i - 1].thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';

      var sp = document.createElement('span');
      sp.textContent = i;

      b.appendChild(img); b.appendChild(sp);
      frag.appendChild(b);
    }
    el.thumbGrid.innerHTML = '';
    el.thumbGrid.appendChild(frag);
  }

  function openDrawer() {
    el.drawer.hidden = false;
    el.scrim.hidden = false;
    el.thumbs.classList.add('on');
    var cur = el.thumbGrid.querySelector('.thumb.current');
    if (cur && cur.scrollIntoView) { cur.scrollIntoView({ block: 'center' }); }
  }
  function closeDrawer() {
    el.drawer.hidden = true;
    el.scrim.hidden = true;
    el.thumbs.classList.remove('on');
  }

  /* -------------------------------------------------------------- zoom/pan */
  function setZoom(z, cx, cy) {
    var prevZ = book.zoom;
    book.zoom = Math.max(1, Math.min(4, z));

    if (book.zoom === 1) {
      book.panX = 0; book.panY = 0;
    } else if (cx !== undefined) {
      var rect = el.stage.getBoundingClientRect();
      var ox = cx - rect.left - rect.width / 2;
      var oy = cy - rect.top - rect.height / 2;
      var k = book.zoom / prevZ;
      book.panX = ox - (ox - book.panX) * k;
      book.panY = oy - (oy - book.panY) * k;
    }
    clampPan();
    applyTransform();
    el.zoom.classList.toggle('on', book.zoom > 1);
    /* the chrome stays put while zoomed — hiding it strands the zoom-out
       button. Tapping the middle of the page is the immersive toggle. */
  }

  function clampPan() {
    if (book.zoom <= 1) { book.panX = 0; book.panY = 0; return; }
    var r = el.book.getBoundingClientRect();
    var s = el.stage.getBoundingClientRect();
    var maxX = Math.max(0, (r.width - s.width) / 2 + 20);
    var maxY = Math.max(0, (r.height - s.height) / 2 + 20);
    book.panX = Math.max(-maxX, Math.min(maxX, book.panX));
    book.panY = Math.max(-maxY, Math.min(maxY, book.panY));
  }

  function resetZoom() {
    book.zoom = 1; book.panX = 0; book.panY = 0;
    applyTransform();
    el.zoom.classList.remove('on');
  }

  /* -------------------------------------------------------------- autoplay */
  function toggleAuto() {
    if (book.autoTimer) { stopAuto(); return; }
    var secs = (CFG.autoPlayDuration || 5) * 1000;
    book.autoTimer = window.setInterval(function () {
      if (book.current + step() > book.count) { goTo(1); } else { next(); }
    }, secs);
    el.auto.classList.add('on');
    el.auto.title = '자동 넘김 정지';
  }
  function stopAuto() {
    if (book.autoTimer) { window.clearInterval(book.autoTimer); book.autoTimer = null; }
    el.auto.classList.remove('on');
    el.auto.title = '자동 넘김';
  }

  /* ------------------------------------------------------------ fullscreen */
  function toggleFullscreen() {
    var d = document;
    var isFull = d.fullscreenElement || d.webkitFullscreenElement;
    if (isFull) {
      (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
    } else {
      var e = d.documentElement;
      (e.requestFullscreen || e.webkitRequestFullscreen || function () {}).call(e);
    }
  }

  /* ----------------------------------------------------------------- share */
  function share() {
    var data = { title: CFG.title || document.title, url: window.location.href };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(data.url).then(function () {
        flash('링크를 복사했습니다');
      }).catch(function () { flash(data.url); });
    } else {
      flash(data.url);
    }
  }

  var flashTimer = null;
  function flash(msg) {
    el.hint.textContent = msg;
    el.hint.classList.remove('gone');
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () { el.hint.classList.add('gone'); }, 2200);
  }

  /* ---------------------------------------------------------- touch/mouse */
  function bindGestures() {
    var pts = {};          // active pointers
    var startDist = 0, startZoom = 1, startMid = null;
    var swipeStart = null; // { x, y, t }
    var panStart = null;

    el.stage.addEventListener('pointerdown', function (e) {
      el.stage.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);

      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        startDist = Math.hypot(a.x - b.x, a.y - b.y);
        startZoom = book.zoom;
        startMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        swipeStart = null;
      } else if (ids.length === 1) {
        if (book.zoom > 1) {
          panStart = { x: e.clientX, y: e.clientY, px: book.panX, py: book.panY };
          el.bookWrap.classList.add('panning');
        } else {
          swipeStart = { x: e.clientX, y: e.clientY, t: Date.now() };
        }
      }
    });

    el.stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) { return; }
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);

      if (ids.length === 2 && startDist) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(startZoom * (d / startDist), startMid.x, startMid.y);
      } else if (panStart && book.zoom > 1) {
        book.panX = panStart.px + (e.clientX - panStart.x);
        book.panY = panStart.py + (e.clientY - panStart.y);
        clampPan();
        applyTransform();
      }
    });

    function release(e) {
      delete pts[e.pointerId];
      var ids = Object.keys(pts);

      if (ids.length < 2) { startDist = 0; startMid = null; }

      if (panStart && ids.length === 0) {
        panStart = null;
        el.bookWrap.classList.remove('panning');
      }

      if (swipeStart && ids.length === 0 && book.zoom === 1) {
        var dx = e.clientX - swipeStart.x;
        var dy = e.clientY - swipeStart.y;
        var dt = Date.now() - swipeStart.t;
        var far = Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4;
        var quick = dt < 600 && Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy) * 1.4;

        if (far || quick) {
          stopAuto();
          if (CFG.rightToLeft) { dx < 0 ? prev() : next(); }
          else { dx < 0 ? next() : prev(); }
        } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 350) {
          onTap(e.clientX);
        }
        swipeStart = null;
      }
    }

    el.stage.addEventListener('pointerup', release);
    el.stage.addEventListener('pointercancel', release);

    /* double-tap / double-click to zoom */
    var lastTap = 0;
    el.stage.addEventListener('pointerup', function (e) {
      var now = Date.now();
      if (now - lastTap < 300) {
        setZoom(book.zoom > 1 ? 1 : 2.2, e.clientX, e.clientY);
        lastTap = 0;
      } else { lastTap = now; }
    });

    /* wheel: ctrl+wheel zooms, plain wheel flips */
    var wheelLock = false;
    el.stage.addEventListener('wheel', function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(book.zoom * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
        return;
      }
      if (book.zoom > 1) { return; }
      if (wheelLock) { return; }
      if (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12) { return; }
      wheelLock = true;
      window.setTimeout(function () { wheelLock = false; }, 420);
      stopAuto();
      (e.deltaY > 0 || e.deltaX > 0) ? next() : prev();
    }, { passive: false });
  }

  /* Tapping the outer third of the stage flips; the middle toggles the chrome. */
  function onTap(x) {
    var r = el.stage.getBoundingClientRect();
    var rel = (x - r.left) / r.width;
    if (rel < 0.28) { stopAuto(); CFG.rightToLeft ? next() : prev(); }
    else if (rel > 0.72) { stopAuto(); CFG.rightToLeft ? prev() : next(); }
    else { el.app.classList.toggle('chrome-off'); }
  }

  /* -------------------------------------------------------------- keyboard */
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) { return; }
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ':
          e.preventDefault(); stopAuto(); CFG.rightToLeft ? prev() : next(); break;
        case 'ArrowLeft': case 'PageUp':
          e.preventDefault(); stopAuto(); CFG.rightToLeft ? next() : prev(); break;
        case 'Home': e.preventDefault(); stopAuto(); goTo(1); break;
        case 'End': e.preventDefault(); stopAuto(); goTo(book.count); break;
        case '+': case '=': setZoom(book.zoom * 1.25); break;
        case '-': setZoom(book.zoom / 1.25); break;
        case '0': resetZoom(); break;
        case 'Escape':
          if (!el.drawer.hidden) { closeDrawer(); }
          else if (book.zoom > 1) { resetZoom(); }
          break;
      }
    });
  }

  /* ------------------------------------------------------------- UI wiring */
  function bindUI() {
    el.first.addEventListener('click', function () { stopAuto(); goTo(1); });
    el.last.addEventListener('click', function () { stopAuto(); goTo(book.count); });
    el.prev.addEventListener('click', function () { stopAuto(); prev(); });
    el.next.addEventListener('click', function () { stopAuto(); next(); });
    el.edgePrev.addEventListener('click', function () { stopAuto(); prev(); });
    el.edgeNext.addEventListener('click', function () { stopAuto(); next(); });

    el.thumbs.addEventListener('click', function () {
      el.drawer.hidden ? openDrawer() : closeDrawer();
    });
    el.thumbsClose.addEventListener('click', closeDrawer);
    el.scrim.addEventListener('click', closeDrawer);

    el.thumbGrid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.thumb') : null;
      if (!b) { return; }
      stopAuto();
      goTo(parseInt(b.dataset.page, 10));
      closeDrawer();
    });

    el.zoom.addEventListener('click', function () {
      setZoom(book.zoom > 1 ? 1 : 2);
    });

    el.auto.addEventListener('click', toggleAuto);
    el.share.addEventListener('click', share);
    el.fullscreen.addEventListener('click', toggleFullscreen);

    el.indicator.addEventListener('click', function () {
      stopAuto();
      var v = window.prompt('이동할 페이지 번호 (1-' + book.count + ')', String(book.current));
      if (v === null) { return; }
      var n = parseInt(v, 10);
      if (!isNaN(n)) { goTo(n); }
    });

    if (CFG.downloadURL) {
      el.download.href = CFG.downloadURL;
      el.download.setAttribute('download', '');
      el.download.hidden = false;
    }

    window.addEventListener('hashchange', function () {
      var n = normalise(pageFromHash());
      if (n !== book.current) { goTo(n); }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(onResize, 120);
    });
    window.addEventListener('orientationchange', function () {
      window.setTimeout(onResize, 250);
    });
  }

  function onResize() {
    var wantSpread = useSpread();
    if (wantSpread !== book.spread) {
      book.spread = wantSpread;
      book.current = normalise(book.current);
      render();
    } else {
      fit();
    }
    clampPan();
    applyTransform();
  }

  /* ------------------------------------------------------------------ boot */
  function fail(msg) {
    el.splash.classList.add('error');
    el.splashText.textContent = msg;
    el.app.setAttribute('aria-busy', 'false');
  }

  function start() {
    el.title.textContent = CFG.title || '전자책';
    document.title = CFG.title || '전자책';

    book.spread = useSpread();
    book.current = normalise(pageFromHash());

    buildThumbs();
    bindUI();
    bindKeys();
    bindGestures();
    render();

    el.splash.classList.add('gone');
    el.app.setAttribute('aria-busy', 'false');
    window.setTimeout(function () { el.splash.hidden = true; }, 400);
    window.setTimeout(function () { el.hint.classList.add('gone'); }, 3200);
  }

  loadManifest().then(function (data) {
    applyManifest(data);
    if (!book.count) {
      fail('아직 등록된 페이지가 없습니다.\ntools/build_ebook.py 로 페이지를 생성해 주세요.');
      return;
    }
    start();
  }).catch(function (err) {
    fail('전자책 정보를 불러오지 못했습니다.\n(' + err.message + ')');
  });

})();
