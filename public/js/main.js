// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.getElementById('main-nav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !expanded);
    mainNav.classList.toggle('open');
  });

  mainNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Header scroll effect
const header = document.querySelector('.site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Scroll reveal animations
(function () {
  // Standard fade-up reveals
  var fadeUps = document.querySelectorAll('.section, .cta-banner, .testimonial-grid');
  fadeUps.forEach(function (el) { el.classList.add('reveal'); });

  // Scale-up reveals for cards
  var scaleUps = document.querySelectorAll('.hike-card, .blog-card, .adventure-card, .gallery-item');
  scaleUps.forEach(function (el) { el.classList.add('reveal-scale'); });

  // Slide-in reveals for feature cards
  var slideItems = document.querySelectorAll('.why-card, .value-card, .pricing-card');
  slideItems.forEach(function (el, i) {
    el.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
  });

  // Standard reveal for other elements
  var others = document.querySelectorAll('.review-card, .guide-card, .about-story, .contact-info-card, .rating-stats, .booking-widget, .detail-section-title, .detail-description, .detail-list, .quick-info-bar');
  others.forEach(function (el) { el.classList.add('reveal'); });

  // Observe all animated elements
  var allAnimated = document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right');
  if (!allAnimated.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  allAnimated.forEach(function (el) { observer.observe(el); });

  // Stagger cards within grids
  var grids = document.querySelectorAll('.hike-grid, .review-grid, .gallery-grid, .why-grid, .values-grid, .guides-grid, .pricing-grid, .blog-grid, .testimonial-grid');
  grids.forEach(function (grid) {
    var cards = grid.children;
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transitionDelay = (i * 0.12) + 's';
    }
  });
})();

// Parallax on hero background
(function () {
  var heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var scroll = window.scrollY;
        if (scroll < window.innerHeight) {
          heroBg.style.transform = 'translateY(' + (scroll * 0.3) + 'px) scale(1.1)';
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

// Counter animation for stats
(function () {
  var counters = document.querySelectorAll('.rating-number');
  if (!counters.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseFloat(el.textContent);
      if (isNaN(target)) return;

      var start = 0;
      var duration = 1200;
      var startTime = null;

      function animate(time) {
        if (!startTime) startTime = time;
        var progress = Math.min((time - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = start + (target - start) * eased;
        el.textContent = target % 1 === 0 ? Math.round(current) : current.toFixed(1);
        if (progress < 1) requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(function (c) { observer.observe(c); });
})();
