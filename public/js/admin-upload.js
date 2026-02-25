// Admin Upload — injects file-upload buttons next to image fields
(function () {
  'use strict';

  const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  // ── Single-file upload (data-upload="single") ──
  document.querySelectorAll('input[data-upload="single"]').forEach(initSingle);

  // ── Multi-file upload (data-upload="multi") ──
  document.querySelectorAll('textarea[data-upload="multi"]').forEach(initMulti);

  function initSingle(input) {
    const wrap = document.createElement('div');
    wrap.className = 'upload-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm upload-btn';
    btn.textContent = 'Upload';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;

    const status = document.createElement('span');
    status.className = 'upload-status';

    const preview = document.createElement('img');
    preview.className = 'upload-preview';
    preview.hidden = true;

    // Show existing preview if value already set
    if (input.value) {
      preview.src = input.value;
      preview.hidden = false;
    }

    // Update preview when URL is pasted manually
    input.addEventListener('change', function () {
      if (this.value) {
        preview.src = this.value;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    });

    btn.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      if (!this.files.length) return;
      uploadFile(this.files[0], function (url) {
        input.value = url;
        input.dispatchEvent(new Event('change'));
        preview.src = url;
        preview.hidden = false;
      }, status);
    });

    input.parentNode.insertBefore(wrap, input.nextSibling);
    wrap.appendChild(btn);
    wrap.appendChild(fileInput);
    wrap.appendChild(status);
    wrap.appendChild(preview);
  }

  function initMulti(textarea) {
    const wrap = document.createElement('div');
    wrap.className = 'upload-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm upload-btn';
    btn.textContent = 'Upload Images';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.hidden = true;

    const status = document.createElement('span');
    status.className = 'upload-status';

    btn.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      var files = Array.from(this.files);
      if (!files.length) return;
      var remaining = files.length;
      status.textContent = 'Uploading 0/' + files.length + '...';
      status.className = 'upload-status';
      var done = 0;

      files.forEach(function (file) {
        uploadFile(file, function (url) {
          var current = textarea.value.trim();
          textarea.value = current ? current + '\n' + url : url;
          done++;
          status.textContent = 'Uploading ' + done + '/' + files.length + '...';
          remaining--;
          if (remaining === 0) {
            status.textContent = files.length + ' image(s) uploaded';
            status.className = 'upload-status upload-success';
          }
        }, status);
      });
    });

    textarea.parentNode.insertBefore(wrap, textarea.nextSibling);
    wrap.appendChild(btn);
    wrap.appendChild(fileInput);
    wrap.appendChild(status);
  }

  function uploadFile(file, onSuccess, statusEl) {
    // Validate extension (client-side check — server also validates MIME)
    var ext = file.name.split('.').pop().toLowerCase();
    if (ALLOWED_EXT.indexOf(ext) === -1) {
      statusEl.textContent = 'Invalid file type: .' + ext;
      statusEl.className = 'upload-status upload-error';
      return;
    }

    if (file.size > MAX_SIZE) {
      statusEl.textContent = 'File too large (max 10 MB)';
      statusEl.className = 'upload-status upload-error';
      return;
    }

    statusEl.textContent = 'Uploading...';
    statusEl.className = 'upload-status';

    var csrfToken = document.querySelector('input[name="_csrf"]')?.value || '';
    var formData = new FormData();
    formData.append('file', file);

    fetch('/admin/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: formData
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json.url) {
          statusEl.textContent = 'Uploaded';
          statusEl.className = 'upload-status upload-success';
          onSuccess(json.url);
        } else {
          statusEl.textContent = json.error || 'Upload failed';
          statusEl.className = 'upload-status upload-error';
        }
      })
      .catch(function () {
        statusEl.textContent = 'Upload failed';
        statusEl.className = 'upload-status upload-error';
      });
  }
})();
