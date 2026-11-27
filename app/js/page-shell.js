/* Small, page-local controls. No business API or session behavior is replaced. */
(() => {
  const root =
    document.querySelector("#cc-view > [data-cc-slot].is-on") || document;
  root.querySelectorAll("[data-pass-toggle]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const input = root.querySelector(
        "#" + CSS.escape(button.getAttribute("aria-controls")),
      );
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "隐藏" : "显示";
      button.setAttribute("aria-pressed", String(show));
      input.focus({ preventScroll: true });
    });
  });
  root.querySelectorAll("[data-copy-handle]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", async () => {
      const value = root.querySelector("#handleValue")?.textContent.trim();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "已复制 ✓";
      } catch (_) {
        button.textContent = "请选中上方登录名复制";
      }
    });
  });
})();
