(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var submitButton = document.getElementById('contact-form-submit');
  var errorBox = document.getElementById('contact-form-error');
  var confirmation = document.getElementById('contact-confirmation');
  var recap = document.getElementById('contact-recap');
  var wrap = form.closest('.contact-form-wrap');

  var recapFields = [
    { name: 'name', label: 'Nom et prénom' },
    { name: 'email', label: 'E-mail' },
    { name: 'phone', label: 'Téléphone' },
    { name: 'subject', label: 'Objet' },
    { name: 'message', label: 'Message' }
  ];

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function buildRecap(formData) {
    recap.innerHTML = '';
    recapFields.forEach(function (field) {
      var value = (formData.get(field.name) || '').toString().trim();
      if (!value) return;
      var dt = document.createElement('dt');
      dt.textContent = field.label;
      var dd = document.createElement('dd');
      dd.textContent = value;
      recap.appendChild(dt);
      recap.appendChild(dd);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideError();

    if (!form.reportValidity()) return;

    var formData = new FormData(form);
    submitButton.disabled = true;
    submitButton.classList.add('is-loading');

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.ok) {
          throw new Error((result.data && result.data.error) || 'Une erreur est survenue.');
        }
        buildRecap(formData);
        wrap.classList.add('is-confirmed');
        form.hidden = true;
        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (error) {
        showError(error.message || 'L\'envoi du message a échoué. Merci de réessayer ou de nous appeler directement.');
      })
      .finally(function () {
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
      });
  });
})();
