/* Local, reversible UI translations. No entered text or member comments is sent
   to a translation service. Protected minutes are localized by the same API. */
(() => {
  window.CC = window.CC || {};
  if (CC.I18n) {
    CC.I18n.refresh();
    return;
  }
  const root = document.documentElement;
  let stored;
  try {
    stored = localStorage.getItem("cc-language");
  } catch (_) {}
  const query = new URLSearchParams(location.search).get("lang");
  let lang =
    query === "en" || query === "zh" ? query : stored === "en" ? "en" : "zh";
  let dictionary = {};
  let loaded = false;
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const normalize = (text) => String(text).replace(/\s+/g, " ").trim();
  const skip = (element) =>
    element?.closest(
      "script,style,svg,code,pre,textarea,[data-no-i18n],#docBody,.comment .body,.comment .meta,#handleValue,.credential .code,[contenteditable]",
    );
  const months = (value) =>
    value.replace(
      /(\d{4})\.(\d{2})(上旬|中旬|下旬)/g,
      (_, y, m, part) =>
        `${y}-${m} (${{ 上旬: "early", 中旬: "mid", 下旬: "late" }[part]})`,
    );
  function t(text) {
    if (lang !== "en") return text;
    const key = normalize(text);
    if (dictionary[key]) return dictionary[key];
    let match;
    if ((match = key.match(/^(\d+) 个工具 \/ (.+?)(?: \/ 搜索：(.*))?$/)))
      return `${match[1]} tools / ${t(match[2])}${match[3] ? " / Search: " + match[3] : ""}`;
    if ((match = key.match(/^(\d+) 项公开展示(?: · (\d+) 项待补充)?$/)))
      return `${match[1]} public entries${match[2] ? " · " + match[2] + " awaiting links" : ""}`;
    if ((match = key.match(/^(.+)，欢迎回来。以下为已开放纪要中的使用心得。$/)))
      return `Welcome back, ${match[1]}. Practical notes from published meetups follow.`;
    if ((match = key.match(/^(欢迎，|已登录为 )(.+?)(，正在跳转…)?$/)))
      return `Welcome, ${match[2]}${match[3] ? ". Redirecting…" : ""}`;
    if ((match = key.match(/^第 (\d+) 期现场 (\d+)$/)))
      return `Meetup ${match[1]}, photograph ${match[2]}`;
    if ((match = key.match(/^放大第 (\d+) 张$/)))
      return `Enlarge photograph ${match[1]}`;
    if ((match = key.match(/^加载失败：(.+)$/)))
      return `Unable to load: ${t(match[1])}`;
    if ((match = key.match(/^(最近一期|后续活动)（(.+)）：(参加|不参加)(.*)$/)))
      return `Future meetup (${t(match[2])}): ${t(match[3])}${match[4]}`;
    if ((match = key.match(/^(\d+) \/ (个人主页|公众号|小工具)$/)))
      return `${match[1]} / ${t(match[2])}`;
    if ((match = key.match(/^共 (\d+) 条报名 · 已通过 (\d+) 已驳回 (\d+)$/)))
      return `${match[1]} applications · ${match[2]} approved · ${match[3]} rejected`;
    if ((match = key.match(/^已更新权限：(.+)$/)))
      return `Access updated: ${t(match[1])}`;
    if ((match = key.match(/^期次 (.+)$/))) return `Meetups ${match[1]}`;
    if ((match = key.match(/^第 (\d+) 期$/))) return `Meetup ${match[1]}`;
    if ((match = key.match(/^(.+)（管理）$/))) return `${match[1]} (organizer)`;
    if ((match = key.match(/^尝试次数过多，请 (\d+) 分钟后再试$/)))
      return `Too many attempts. Try again in ${match[1]} minutes.`;

    if ((match = key.match(/^(已批准|已重发通行码|已设置权限并开通账号) · (.+)$/))) return `${t(match[1])} · ${match[2]}`;
    if ((match = key.match(/^可见期次：(.+?) · 通行码仅此一次可见，请立即私下发送。$/))) return `Accessible meetups: ${t(match[1])} · This passcode is shown only once. Send it privately now.`;
    if ((match = key.match(/^(.+?) · (已通过|已驳回)$/))) return `${match[1]} · ${t(match[2])}`;
    if ((match = key.match(/^· (.+)$/))) return `· ${t(match[1])}`;
    if ((match = key.match(/^(\d{4}\.\d{2}(?:上旬|中旬|下旬)) · (.+)$/))) return `${months(match[1])} · ${t(match[2])}`;
    if ((match = key.match(/^请求失败 (\d+)$/)))
      return `Request failed (${match[1]})`;
    if (key.match(/^\d{4}\.\d{2}(上旬|中旬|下旬)$/)) return months(key);
    if ((match = key.match(/^(\d{4}\.\d{2}\.\d{2}) · 深圳 · 线下$/)))
      return `${match[1]} · Shenzhen · In person`;
    return text;
  }
  function textNode(node) {
    if (!node.parentElement || skip(node.parentElement)) return;
    const current = node.nodeValue;
    let record = originals.get(node);
    if (!record || current !== record.last)
      record = { source: current, last: current };
    const normalized = normalize(record.source);
    const next = lang === "en" ? t(normalized) : record.source;
    const result =
      lang === "en" && next !== normalized
        ? record.source.replace(/\S[\s\S]*\S|\S/, () => next)
        : lang === "en"
          ? record.source
          : next;
    record.last = result;
    originals.set(node, record);
    if (current !== result) node.nodeValue = result;
  }
  function translateTree(scope = document.body) {
    if (!scope) return;
    if (scope.nodeType === 3) {
      textNode(scope);
      return;
    }
    if (scope.nodeType !== 1 && scope.nodeType !== 9) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) textNode(node);
    const elements = [
      ...(scope.nodeType === 1 ? [scope] : []),
      ...scope.querySelectorAll(
        "[placeholder],[aria-label],[title],img[alt],a[href],[data-label]",
      ),
    ];
    for (const element of elements) {
      if (skip(element) || element.matches("[data-language]")) continue;
      if (element.matches("a[href]")) {
        const href = element.getAttribute("href");
        if (href && !href.startsWith("#")) {
          try {
            const url = new URL(href, location.href);
            if (
              url.origin === location.origin &&
              /\/(?:index|login|apply|admin|process|photo-credits|gathering-\d+)\.html$/.test(
                url.pathname,
              )
            ) {
              url.searchParams.set("lang", lang);
              element.setAttribute(
                "href",
                url.pathname + url.search + url.hash,
              );
            }
          } catch (_) {}
        }
      }
      let record = attributes.get(element) || {};
      for (const attr of ["placeholder", "aria-label", "title", "alt", "data-label"]) {
        if (!element.hasAttribute(attr)) continue;
        const current = element.getAttribute(attr),
          old = record[attr];
        const source = old && current === old.last ? old.source : current;
        const next = lang === "en" ? t(source) : source;
        record[attr] = { source, last: next };
        if (current !== next) element.setAttribute(attr, next);
      }
      attributes.set(element, record);
    }
  }
  function controls() {
    document
      .querySelectorAll("[data-language]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.language === lang)),
      );
  }
  function refresh() {
    root.lang = lang === "en" ? "en" : "zh-CN";
    controls();
    if (loaded) {
      translateTree();
      translateTree(document.querySelector("title"));
    }
  }
  function setLanguage(value) {
    if (!["zh", "en"].includes(value)) return;
    lang = value;
    root.lang = lang === "en" ? "en" : "zh-CN";
    try {
      localStorage.setItem("cc-language", lang);
    } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(history.state, "", url);
    refresh();
    document.dispatchEvent(
      new CustomEvent("cc:language", { detail: { lang } }),
    );
  }
  CC.I18n = {
    get lang() {
      return lang;
    },
    t,
    refresh,
    set: setLanguage,
  };
  root.lang = lang === "en" ? "en" : "zh-CN";
  function start() {
    controls();
    const observer = new MutationObserver((records) => {
      if (!loaded || !window.document?.body) return;
      // Pause while making our own reversible changes, preventing observer loops.
      observer.disconnect();
      for (const record of records) {
        if (record.type === "childList")
          record.addedNodes.forEach((node) => translateTree(node));
        else if (record.type === "characterData") textNode(record.target);
        else if (record.type === "attributes") translateTree(record.target);
      }
      controls();
      observe();
    });
    function observe() {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label", "alt", "data-label"],
      });
    }
    observe();
    document.addEventListener("click", (e) => {
      const button = e.target.closest("[data-language]");
      if (button) setLanguage(button.dataset.language);
    });
    document.addEventListener("cc:page", refresh);
    fetch("/locales/en.json")
      .then((r) => {
        if (!r.ok) throw Error("Locale unavailable");
        return r.json();
      })
      .then((data) => {
        dictionary = data;
        loaded = true;
        refresh();
      })
      .catch(() => {
        document.querySelectorAll("[data-language=en]").forEach((b) => {
          b.disabled = true;
          b.title = "English content could not be loaded. Please refresh.";
        });
        if (lang === "en") {
          lang = "zh";
          refresh();
        }
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
