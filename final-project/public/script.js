// Use a saved theme across all pages, with a safe fallback when storage is blocked.
const toggle = document.querySelector("#theme_toggler");
function applyTheme(dark) {
  document.body.classList.toggle("dark_mode", dark);
  toggle.textContent = dark ? "Light mode" : "Dark mode";
  toggle.setAttribute("aria-pressed", String(dark));
}
try {
  applyTheme(localStorage.getItem("website_theme") === "dark_mode");
} catch {
  applyTheme(false);
}
toggle.addEventListener("click", () => {
  const dark = !document.body.classList.contains("dark_mode");
  applyTheme(dark);
  try {
    localStorage.setItem("website_theme", dark ? "dark_mode" : "default");
  } catch {
    /* Theme still works without persistence. */
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === "website_theme") applyTheme(event.newValue === "dark_mode");
});
// Mark the current page for keyboard and screen-reader users.
const current = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("nav a").forEach((link) => {
  if (link.getAttribute("href") === current)
    link.setAttribute("aria-current", "page");
});
// Filter existing cards without downloading data or rebuilding HTML.
const role = document.querySelector("#role");
role?.addEventListener("change", () => {
  let count = 0;
  document.querySelectorAll("[data-role]").forEach((card) => {
    card.hidden = role.value !== "all" && card.dataset.role !== role.value;
    if (!card.hidden) count++;
  });
  document.querySelector("#filter-count").textContent =
    `${count} entries shown`;
});
// Give immediate, accessible feedback on the beginner quiz.
document.querySelector("#quiz")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const answer = new FormData(event.currentTarget).get("answer");
  document.querySelector("#quiz-result").textContent =
    answer === "6"
      ? "Correct! An over contains six legal deliveries."
      : "Try again. An over contains six legal deliveries; wides and no-balls do not count.";
});
