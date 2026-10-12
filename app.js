/* ==========================================================================
   李尚禅 · 个人档案站 —— 交互
   1. 原件「上版」进场
   2. 滚动视差（图片在相框内以更慢速度上移）
   3. 背景音乐（四段随机播放，淡出淡入，右下角开关）
   4. 原件查看器（画面里只有图，配文只读给屏幕阅读器）
   5. 深链 #exhibit-*
   6. 导航当前板块
   7. 中英切换（中文写在页面元素里，英文放在 data-en / data-en-alt / data-en-aria 上）
   没有依赖，没有构建。
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var langHooks = [];   // 语言切换后需要跟着刷新的地方，各模块自己注册

  /* ---------------- 1. 原件「上版」 ----------------
     不用 IntersectionObserver，也不用 requestAnimationFrame 节流：
     两者的回调都挂在渲染生命周期上，后台标签页/无头环境里会被无限推迟，
     一旦不触发，展品就停在裁切状态（等于空白）。改成同步矩形检查 +
     时间节流 + 兜底轮询，13 个元素，成本可以忽略。
     没有 JS 时 CSS 不施加初始状态，内容默认可见。 */
  var pending = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var sweep = null;
  var lastCheck = 0;

  function revealNow(el) {
    if (!el.style.getPropertyValue('--d') && el.parentElement) {
      var group = el.parentElement.querySelectorAll('[data-reveal]');
      var i = Array.prototype.indexOf.call(group, el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 4) * 70 + 'ms');
    }
    el.classList.add('is-in');
  }

  function checkReveals() {
    var limit = window.innerHeight * 0.92;
    for (var i = 0; i < pending.length; i++) {
      var r = pending[i].getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) {
        revealNow(pending[i]);
        pending.splice(i, 1);
        i--;
      }
    }
    if (!pending.length) {
      window.removeEventListener('scroll', onRevealScroll);
      window.removeEventListener('resize', onRevealScroll);
      if (sweep) { window.clearInterval(sweep); sweep = null; }
    }
  }

  function onRevealScroll() {
    var now = Date.now();
    if (now - lastCheck < 50) return;
    lastCheck = now;
    checkReveals();
  }

  if (pending.length) {
    window.addEventListener('scroll', onRevealScroll, { passive: true });
    window.addEventListener('resize', onRevealScroll);
    window.addEventListener('load', checkReveals);
    sweep = window.setInterval(checkReveals, 700);
    checkReveals();
  }

  /* ---------------- 2. 滚动视差 ----------------
     展品图片在相框里以更慢的速度上移：位移按元素高度取比例（2.8%，上限 20px），
     CSS 里图片纵向多留了 6.5% 余量，所以永远不露底、也完全不影响布局。
     只改 translate（不被过渡），进场用的是 scale，两件事互不干扰。
     这是纯视觉增强：即使 rAF 不触发也只是没有视差，不会坏掉。 */
  var pxTargets = Array.prototype.slice.call(document.querySelectorAll('.media img'));
  var pxTicking = false;

  function updateParallax() {
    pxTicking = false;
    if (reduceMotion && reduceMotion.matches) return;
    var vh = window.innerHeight;
    var i, rects = [];
    for (i = 0; i < pxTargets.length; i++) {
      rects.push(pxTargets[i].parentNode.getBoundingClientRect());
    }
    for (i = 0; i < pxTargets.length; i++) {
      var r = rects[i];
      if (r.bottom < -160 || r.top > vh + 160) continue;
      var center = r.top + r.height / 2;
      var progress = (center - vh / 2) / ((vh + r.height) / 2);
      if (progress > 1) progress = 1;
      if (progress < -1) progress = -1;
      var max = Math.min(r.height * 0.028, 20);
      // 在下方时图片先上移，随页面上滑再回落 —— 于是它比相框走得慢
      pxTargets[i].style.setProperty('--py', (-progress * max).toFixed(2) + 'px');
    }
  }

  function onParallaxScroll() {
    if (pxTicking) return;
    pxTicking = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(updateParallax);
    else updateParallax();
  }

  if (pxTargets.length && !(reduceMotion && reduceMotion.matches)) {
    window.addEventListener('scroll', onParallaxScroll, { passive: true });
    window.addEventListener('resize', onParallaxScroll);
    updateParallax();
  }

  /* ---------------- 3. 背景音乐 ----------------
     四段音频随机播放，每首结束前淡出、下一首淡入（不重叠）。
     浏览器禁止自动出声，所以默认不播；右下角开关点一下才开始。
     audio 上写了 preload="none"：不点开关就一个字节都不下载。 */
  var TRACKS = [
    { src: 'assets/audio/daotangzhu.mp3', title: '捣唐猪（整完版）', titleEn: 'Daotangzhu (final cut)' },
    { src: 'assets/audio/tangtumengjin.mp3', title: '糖突猛进 · 路人乐队的组成方法', titleEn: 'Tang Tu Meng Jin · how a band of passers-by forms' },
    { src: 'assets/audio/haotang-xiongdi.mp3', title: '好唐，兄弟', titleEn: 'Nice one, bro' },
    { src: 'assets/audio/shuizhao.mp3', title: '听完能睡着的是神', titleEn: 'Sleep through this and you are a legend' }
  ];
  var musicAudio = document.getElementById('music-audio');
  var musicBtn = document.getElementById('music-toggle');
  var musicIcon = document.getElementById('music-icon-use');
  var musicNow = document.getElementById('music-now');

  if (musicAudio && musicBtn) {
    var MUSIC_VOLUME = 0.5;
    var FADE_STEP = 100;       // 每一步 100ms
    var FADE_OUT_AT = 1.8;     // 结束前 1.8 秒开始淡出
    var queue = [];
    var currentTrack = -1;
    var fadeTimer = null;
    var playing = false;
    var prefetch = null;       // 预取下一首，切歌不留空档

    function shuffleQueue() {
      var idx = TRACKS.map(function (t, i) { return i; });
      for (var i = idx.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
      }
      // 别让刚播完的那首紧接着又出现
      if (idx.length > 1 && idx[0] === currentTrack) idx.push(idx.shift());
      queue = idx;
    }

    function fadeTo(target, done) {
      if (fadeTimer) { window.clearInterval(fadeTimer); fadeTimer = null; }
      var from = musicAudio.volume;
      var steps = Math.max(1, Math.round(Math.abs(target - from) / (MUSIC_VOLUME / 12)));
      var n = 0;
      fadeTimer = window.setInterval(function () {
        n++;
        musicAudio.volume = Math.max(0, Math.min(1, from + (target - from) * (n / steps)));
        if (n >= steps) {
          window.clearInterval(fadeTimer);
          fadeTimer = null;
          if (done) done();
        }
      }, FADE_STEP);
    }

    function trackTitle(i) {
      var t = TRACKS[i];
      if (!t) return '';
      return (document.documentElement.getAttribute('lang') === 'en' && t.titleEn) ? t.titleEn : t.title;
    }

    function nextTrack() {
      if (!queue.length) shuffleQueue();
      var i = queue.shift();
      if (typeof i !== 'number' || !TRACKS[i]) { nextTrack(); return; }
      currentTrack = i;
      musicAudio.src = TRACKS[i].src;
      musicAudio.volume = 0;
      if (musicNow) { musicNow.textContent = trackTitle(i); musicNow.hidden = false; }
      var p = musicAudio.play();
      if (p && p.catch) p.catch(function () { stopMusic(); });
      fadeTo(MUSIC_VOLUME);
      if (queue.length) {
        prefetch = new Audio();
        prefetch.preload = 'auto';
        prefetch.src = TRACKS[queue[0]].src;
      }
    }

    function stopMusic() {
      playing = false;
      musicBtn.setAttribute('aria-pressed', 'false');
      if (musicIcon) musicIcon.setAttribute('href', '#i-mute');
      if (musicNow) musicNow.hidden = true;
      fadeTo(0, function () { musicAudio.pause(); });
    }

    function startMusic() {
      playing = true;
      musicBtn.setAttribute('aria-pressed', 'true');
      if (musicIcon) musicIcon.setAttribute('href', '#i-note');
      shuffleQueue();
      nextTrack();
    }

    musicBtn.addEventListener('click', function () {
      if (playing) stopMusic(); else startMusic();
    });

    // 结束前先淡出，ended 之后再淡入下一首
    musicAudio.addEventListener('timeupdate', function () {
      if (!playing) return;
      var d = musicAudio.duration;
      if (!d || !isFinite(d)) return;
      if (d - musicAudio.currentTime <= FADE_OUT_AT && musicAudio.volume > 0.001) fadeTo(0);
    });
    musicAudio.addEventListener('ended', function () { if (playing) nextTrack(); });
    // 某一段加载失败就跳过，别让播放列表卡死
    musicAudio.addEventListener('error', function () { if (playing) nextTrack(); });

    // 切语言时曲名跟着换
    langHooks.push(function () {
      if (musicNow && !musicNow.hidden && currentTrack > -1) musicNow.textContent = trackTitle(currentTrack);
    });
  }

  /* ---------------- 4. 中英切换 ----------------
     中文写在页面元素里（没有 JS 时的默认语言），英文放在 data-en / data-en-alt /
     data-en-aria 上，两种语言挨着放，改的时候不用跳文件。切换只换文字、不动结构，
     所以查看器、进场动效、视差都不受影响。选择记在 localStorage，下次自动生效。 */
  var LANG_KEY = 'lsc-lang';
  var META_TEXT = {
    zh: {
      title: '李尚禅 · 记录与原件',
      desc: '李尚禅（Danny Li），16 岁，高二在读。上海观合医药分子诊断实习（PCR）、助残 AI 智能导盲眼镜项目、ASDAN 商赛三银一金、开源 DSH 插件。每一条都能点开看到原件。',
      ogTitle: '李尚禅 · 记录与原件',
      ogDesc: '在中心实验室跑过 PCR，给视障者做了一副会说话的眼镜，也在给 AI 写「少忘事」的插件。每一条都能点开看到原件。'
    },
    en: {
      title: 'Danny Li · Records & Originals',
      desc: 'Danny Li (Li Shangchan), 16, Grade 11. Molecular diagnostics internship at a Shanghai central laboratory (PCR), an AI guide-glasses project for visually impaired people, three silvers and a gold at ASDAN Business Simulation, and open-source DeepSeek Harness plugins. Every item opens to its original document.',
      ogTitle: 'Danny Li · Records & Originals',
      ogDesc: 'I have run PCR in a central laboratory, built a pair of talking glasses for visually impaired people, and I write plugins that help AI forget less. Every item opens to its original document.'
    }
  };
  var i18nText = Array.prototype.slice.call(document.querySelectorAll('[data-en]'));
  var i18nAlt = Array.prototype.slice.call(document.querySelectorAll('[data-en-alt]'));
  var i18nAria = Array.prototype.slice.call(document.querySelectorAll('[data-en-aria]'));
  var langBtns = Array.prototype.slice.call(document.querySelectorAll('.lang-btn'));

  function langIs() { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'zh'; }

  function setLang(lang, remember) {
    var en = lang === 'en';
    var i, el;
    for (i = 0; i < i18nText.length; i++) {
      el = i18nText[i];
      if (el.__zh === undefined) el.__zh = el.innerHTML;
      el.innerHTML = en ? el.getAttribute('data-en') : el.__zh;
    }
    for (i = 0; i < i18nAlt.length; i++) {
      el = i18nAlt[i];
      if (el.__zhAlt === undefined) el.__zhAlt = el.getAttribute('alt') || '';
      el.setAttribute('alt', en ? el.getAttribute('data-en-alt') : el.__zhAlt);
    }
    for (i = 0; i < i18nAria.length; i++) {
      el = i18nAria[i];
      if (el.__zhAria === undefined) el.__zhAria = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', en ? el.getAttribute('data-en-aria') : el.__zhAria);
    }
    document.documentElement.setAttribute('lang', en ? 'en' : 'zh-CN');
    var m = META_TEXT[en ? 'en' : 'zh'];
    document.title = m.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', m.desc);
    meta = document.querySelector('meta[property="og:title"]');
    if (meta) meta.setAttribute('content', m.ogTitle);
    meta = document.querySelector('meta[property="og:description"]');
    if (meta) meta.setAttribute('content', m.ogDesc);
    for (i = 0; i < langBtns.length; i++) {
      langBtns[i].setAttribute('aria-pressed', String(langBtns[i].getAttribute('data-lang') === (en ? 'en' : 'zh')));
    }
    for (i = 0; i < langHooks.length; i++) langHooks[i]();
    if (remember) { try { localStorage.setItem(LANG_KEY, en ? 'en' : 'zh'); } catch (e) {} }
  }

  for (var lb = 0; lb < langBtns.length; lb++) {
    langBtns[lb].addEventListener('click', function () { setLang(this.getAttribute('data-lang'), true); });
  }
  setLang(langIs(), false);

  /* ---------------- 5. 原件查看器 ---------------- */
  var exhibits = Array.prototype.slice.call(document.querySelectorAll('.js-exhibit'));
  var viewer = document.getElementById('viewer');
  if (!viewer || !exhibits.length) return;

  var vImg = document.getElementById('viewer-img');
  var vCount = document.getElementById('viewer-count');
  var vSr = document.getElementById('viewer-sr');
  var vClose = document.getElementById('viewer-close');
  var vPrev = document.getElementById('viewer-prev');
  var vNext = document.getElementById('viewer-next');
  var current = 0;
  var lastFocus = null;

  function exhibitData(i) {
    var el = exhibits[i];
    var img = el.querySelector('img');
    var en = document.documentElement.getAttribute('lang') === 'en';
    return {
      src: el.getAttribute('data-full'),
      alt: img ? img.getAttribute('alt') : '',
      caption: (en && el.getAttribute('data-en-caption')) || el.getAttribute('data-caption') || '',
      meta: (en && el.getAttribute('data-en-meta')) || el.getAttribute('data-meta') || ''
    };
  }

  function show(i) {
    current = (i + exhibits.length) % exhibits.length;
    var d = exhibitData(current);
    vImg.setAttribute('src', d.src);
    vImg.setAttribute('alt', d.alt);
    vCount.textContent = (current + 1) + ' / ' + exhibits.length;
    // 画面里不显示配文，但读屏要能拿到：这条只在无障碍树里存在
    if (vSr) vSr.textContent = (current + 1) + ' / ' + exhibits.length + '。' + d.caption + ' ' + d.meta;
  }

  function isOpen() { return viewer.getAttribute('data-open') === 'true'; }

  // 查看器开着的时候切语言，读屏文案要跟着换
  langHooks.push(function () { if (isOpen()) show(current); });

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    viewer.hidden = false;
    void viewer.offsetWidth;
    viewer.setAttribute('data-open', 'true');
    document.body.classList.add('is-locked');
    vClose.focus();
  }

  function close() {
    viewer.setAttribute('data-open', 'false');
    document.body.classList.remove('is-locked');
    window.setTimeout(function () {
      if (!isOpen()) { viewer.hidden = true; vImg.removeAttribute('src'); }
    }, 260);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    // 查看器锁过 body 滚动，关闭后主动补一次状态，不依赖滚动事件是否还在
    checkReveals();
    updateParallax();
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    var ref = t.closest('[data-exhibit-ref]');
    if (ref) {
      var id = ref.getAttribute('data-exhibit-ref');
      for (var i = 0; i < exhibits.length; i++) {
        if (exhibits[i].getAttribute('data-exhibit') === id) { open(i); return; }
      }
      return;
    }

    var btn = t.closest('.js-exhibit .plate-btn');
    if (btn) {
      var fig = btn.closest('.js-exhibit');
      var idx = exhibits.indexOf(fig);
      if (idx > -1) open(idx);
      return;
    }

    if (isOpen() && (t === viewer || (t.classList && t.classList.contains('viewer-stage')))) close();
  });

  vClose.addEventListener('click', close);
  vPrev.addEventListener('click', function () { show(current - 1); });
  vNext.addEventListener('click', function () { show(current + 1); });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); return; }
    if (e.key === 'Tab') {
      var ring = [vClose, vPrev, vNext];
      var at = ring.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey
        ? (at <= 0 ? ring.length - 1 : at - 1)
        : (at === -1 || at === ring.length - 1 ? 0 : at + 1);
      ring[next].focus();
    }
  });

  /* ---------------- 6. 深链：index.html#exhibit-letter 直接打开某张原件 ---------------- */
  function openFromHash() {
    var m = /^#exhibit-(.+)$/.exec(window.location.hash || '');
    if (!m) return;
    for (var i = 0; i < exhibits.length; i++) {
      if (exhibits[i].getAttribute('data-exhibit') === m[1]) { open(i); return; }
    }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* ---------------- 7. 导航当前板块 ---------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = navLinks.map(function (a) {
    var href = a.getAttribute('href') || '';
    return href.charAt(0) === '#' ? document.querySelector(href) : null;
  }).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var ratios = {};
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        ratios[en.target.id] = en.isIntersecting ? Math.max(en.intersectionRatio, 0.01) : 0;
      });
      var best = '', bestRatio = 0;
      Object.keys(ratios).forEach(function (k) {
        if (ratios[k] > bestRatio) { bestRatio = ratios[k]; best = k; }
      });
      navLinks.forEach(function (a) {
        a.setAttribute('aria-current', best && a.getAttribute('href') === '#' + best ? 'true' : 'false');
      });
    }, { threshold: [0, 0.12, 0.3, 0.55, 0.8], rootMargin: '-76px 0px -45% 0px' });
    sections.forEach(function (s) { nio.observe(s); });
  }
})();
