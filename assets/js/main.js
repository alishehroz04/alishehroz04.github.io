(() => {
  const root = document.documentElement;
  root.classList.add('ready');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
        const i = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Nav + mobile dock ---------- */
  const nav = document.querySelector('.nav');
  const dock = document.querySelector('.dock');
  const hero = document.querySelector('.hero');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    if (dock && hero) dock.classList.toggle('is-on', y > hero.offsetHeight * 0.6);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Smooth scroll (desktop only) ---------- */
  let lenis = null;
  if (!reduce && finePointer && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    if (hasGsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : document.body;
      if (!target) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.2 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- GSAP motion ---------- */
  if (hasGsap && !reduce) {
    const { gsap } = window;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    // Hero intro
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__name .word', { yPercent: 110, duration: 1.2, stagger: 0.09 })
      .from('.hero__eyebrow', { y: 16, opacity: 0, duration: 0.8 }, 0.1)
      .from('.hero__lede', { y: 22, opacity: 0, duration: 0.9 }, 0.35)
      .from('.stat', { y: 26, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.45)
      .from('.hero__cta .btn', { y: 18, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.6)
      .from('.hero__mosaic', { scale: 1.12, opacity: 0, duration: 2.2, ease: 'power2.out' }, 0);

    // Count-up (finishes fast, real number is already in the HTML)
    document.querySelectorAll('.stat b[data-count]').forEach((el, i) => {
      const end = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 0.9, delay: 0.55 + i * 0.07, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
        onComplete: () => { el.textContent = end + suffix; },
      });
    });

    if (window.ScrollTrigger) {
      // Hero parallax
      gsap.to('.hero__mosaic', {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero__inner', {
        y: -60, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true },
      });
      // Section titles: subtle letter-space tighten
      gsap.utils.toArray('.section__title, .contact__title').forEach((t) => {
        gsap.from(t, {
          letterSpacing: '0.02em', ease: 'none',
          scrollTrigger: { trigger: t, start: 'top 90%', end: 'top 50%', scrub: true },
        });
      });
    }
  }

  /* ---------- Rail: drag to scroll on desktop ---------- */
  const rail = document.querySelector('.rail');
  if (rail && finePointer) {
    let down = false; let startX = 0; let startLeft = 0; let moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-drag'); }
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      rail.classList.remove('is-drag');
    });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    rail.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) return;
      e.stopPropagation();
    }, { passive: true });
  }

  /* ---------- In-view gameplay loops (load only when visible) ---------- */
  const saveData = navigator.connection && navigator.connection.saveData;
  const loops = document.querySelectorAll('video[data-src]');
  if (loops.length && 'IntersectionObserver' in window && !reduce && !saveData) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else if (v.getAttribute('src')) {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    loops.forEach((v) => vio.observe(v));
  }

  /* ---------- Trailer modal (video loads only on tap) ---------- */
  const modal = document.getElementById('modal');
  const video = document.getElementById('modal-video');
  const box = modal && modal.querySelector('.modal__box');
  let lastFocus = null;
  const openVideo = (btn) => {
    lastFocus = btn;
    box.classList.toggle('is-vertical', btn.hasAttribute('data-vertical'));
    video.poster = btn.dataset.poster || '';
    video.src = btn.dataset.video;
    modal.hidden = false;
    if (lenis) lenis.stop();
    video.play().catch(() => {});
    modal.querySelector('.modal__close').focus();
  };
  const closeVideo = () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    modal.hidden = true;
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  };
  document.querySelectorAll('[data-video]').forEach((b) => b.addEventListener('click', () => openVideo(b)));
  if (modal) {
    modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeVideo));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeVideo(); });
  }
})();
