window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('menuButton');
  const menu = document.getElementById('sideMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('open'));
  });
});
