/*
  script.js
  Author: Maulin Patel
  Vanilla JavaScript theme switcher (no jQuery or libraries).
  1. Toggles the "dark_mode" class on <body> when the button is clicked.
  2. Saves the choice in localStorage so it survives a page reload.
  3. Listens for the "storage" event so other open tabs stay in sync.
*/

// Grab the toggle button from the HTML by its id
let theme_toggler = document.querySelector('#theme_toggler');

// Updates the button text so it always offers the *other* theme
function update_button_label() {
  if (document.body.classList.contains('dark_mode')) {
    theme_toggler.textContent = '☀️ Light mode';
  } else {
    theme_toggler.textContent = '🌙 Dark mode';
  }
}

// Saves the current theme to localStorage under the key "website_theme"
function save_theme() {
  if (document.body.classList.contains('dark_mode')) {
    localStorage.setItem('website_theme', 'dark_mode');
  } else {
    localStorage.setItem('website_theme', 'default');
  }
}

// Reads the saved theme (if there is one) and applies it to <body>
function retrieve_theme() {
  let theme = localStorage.getItem('website_theme');

  // Only change anything if a theme was saved before
  if (theme != null) {
    // Clear both theme classes, then add the saved one
    document.body.classList.remove('default', 'dark_mode');
    document.body.classList.add(theme);
  }

  // Keep the button text matched to the current theme
  update_button_label();
}

// When the button is clicked: switch themes, then save the new choice
theme_toggler.addEventListener('click', function () {
  document.body.classList.toggle('dark_mode');
  document.body.classList.toggle('default');
  save_theme();
  update_button_label();
});

// Bonus from the article: if the theme changes in another tab,
// localStorage fires a "storage" event here and we re-apply it
window.addEventListener('storage', function () {
  retrieve_theme();
}, false);

// Apply the saved theme as soon as the page loads
retrieve_theme();
