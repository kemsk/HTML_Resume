const django_jwt_token = "{{ request.session.jwt_token|default:'' }}";
document.addEventListener('DOMContentLoaded', function () {
  function updateDateTime() {
    const now = new Date();
    const dateOptions = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    const timeOptions = {hour: '2-digit', minute: '2-digit'};

    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');

    if (dateEl && timeEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, dateOptions);
      timeEl.textContent = now.toLocaleTimeString(undefined, timeOptions);
    }
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  const sidebar = document.getElementById('sidebar');
  const contentArea = document.getElementById('content-area');

  if (sidebar && contentArea) {
    sidebar.addEventListener('mouseenter', () => {
      sidebar.classList.remove('collapsed');
      contentArea.classList.remove('expanded');
    });

    sidebar.addEventListener('mouseleave', () => {
      sidebar.classList.add('collapsed');
      contentArea.classList.add('expanded');
    });

    contentArea.classList.add('expanded');
  }

  const buttons = document.querySelectorAll('.buttons .btn');
  const sections = document.querySelectorAll('.content-section');

  buttons.forEach(button => {
    button.addEventListener('click', function () {
      buttons.forEach(btn => btn.classList.remove('active-btn'));
      sections.forEach(section => section.style.display = 'none');

      this.classList.add('active-btn');
      const targetId = this.id + '-content';
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
    });
  });

  const dropdownElements = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
  dropdownElements.forEach(dropdownToggleEl => {
    new bootstrap.Dropdown(dropdownToggleEl);
  });
});
