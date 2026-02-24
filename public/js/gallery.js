// Lightbox for gallery detail page
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxLocation = document.getElementById('lightbox-location');

if (lightbox) {
  const galleryItems = document.querySelectorAll('.gallery-item');
  let currentItems = [];
  let currentIndex = 0;

  function openLightbox(index) {
    currentItems = [...galleryItems];
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    const item = currentItems[currentIndex];
    if (!item) return;
    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.dataset.title || '';
    if (lightboxTitle) lightboxTitle.textContent = item.dataset.title || '';
    if (lightboxLocation) lightboxLocation.textContent = item.dataset.location || '';
  }

  function nextImage() {
    currentIndex = (currentIndex + 1) % currentItems.length;
    updateLightbox();
  }

  function prevImage() {
    currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
    updateLightbox();
  }

  // Click gallery items
  galleryItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      openLightbox(idx);
    });
  });

  // Controls
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-next').addEventListener('click', nextImage);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', prevImage);

  // Click backdrop
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });
}