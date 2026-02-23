// Client-side form validation
document.querySelectorAll('form[novalidate]').forEach(form => {
  form.addEventListener('submit', (e) => {
    let valid = true;

    // Clear previous errors
    form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

    // Check required fields
    form.querySelectorAll('[required]').forEach(field => {
      const group = field.closest('.form-group');
      if (!group) return;

      let fieldValid = true;

      if (field.type === 'email') {
        fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
      } else if (field.tagName === 'SELECT') {
        fieldValid = field.value !== '';
      } else {
        fieldValid = field.value.trim() !== '';
      }

      if (!fieldValid) {
        group.classList.add('error');
        valid = false;
      }
    });

    if (!valid) {
      e.preventDefault();
      // Scroll to first error
      const firstError = form.querySelector('.form-group.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Clear error on input
  form.querySelectorAll('.form-input, .form-textarea, .form-select').forEach(field => {
    field.addEventListener('input', () => {
      const group = field.closest('.form-group');
      if (group) group.classList.remove('error');
    });
    field.addEventListener('change', () => {
      const group = field.closest('.form-group');
      if (group) group.classList.remove('error');
    });
  });
});

// Pre-select hike from query param on booking page
const bookingHikeSelect = document.getElementById('b-hike');
if (bookingHikeSelect) {
  const params = new URLSearchParams(window.location.search);
  const hikeParam = params.get('hike');
  if (hikeParam) {
    bookingHikeSelect.value = hikeParam;
  }
}
