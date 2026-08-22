
(function () {
  function applyTheme(theme) {
    const light = theme === "light";
    document.body.classList.toggle("pi-light", light);
    document.body.classList.toggle("pi-dark", !light);
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  }

  const saved = localStorage.getItem("piTheme") || "dark";
  applyTheme(saved);

  window.ProductIQTheme = {
    set: function (theme) {
      const value = theme === "light" ? "light" : "dark";
      localStorage.setItem("piTheme", value);
      applyTheme(value);
      window.dispatchEvent(new CustomEvent("productiq:themechange", { detail: value }));
    },
    get: function () {
      return localStorage.getItem("piTheme") || "dark";
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(localStorage.getItem("piTheme") || "dark");
  });
})();
