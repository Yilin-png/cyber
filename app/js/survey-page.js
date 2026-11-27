/* 法律 AI 社群问卷页。题目与分级规则来自 legal-ai-survey.js（window.CCSurvey）。 */
(() => {
  const S = window.CCSurvey;
  const form = document.getElementById("surveyForm");
  const bodyEl = document.getElementById("surveyBody");
  const msg = document.getElementById("msg");
  const submitBtn = document.getElementById("submitBtn");
  const resultEl = document.getElementById("result");
  const progressCount = document.getElementById("progressCount");
  const progressBar = document.getElementById("progressBar");
  const DRAFT_KEY = `cc-survey-${S.SURVEY_ID}-draft`;
  const DONE_KEY = `cc-survey-${S.SURVEY_ID}-done`;

  if (window.CC && CC.BGM) CC.BGM.init({ mode: "button", toggleId: "bgmBtn", gestureKick: true });

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function tag(q) {
    return q.required
      ? ' <span class="field-required">必填</span>'
      : ' <span class="field-optional">选填</span>';
  }

  function renderQuestion(q) {
    const hint = q.hint ? `<p class="hint">${esc(q.hint)}</p>` : "";
    const attrs = `data-q="${esc(q.id)}"${q.showIf ? " hidden" : ""}`;
    if (q.type === "single" || q.type === "multi") {
      const type = q.type === "single" ? "radio" : "checkbox";
      const opts = q.options.map((o) => `<label class="choice"><input type="${type}" name="${esc(q.id)}" value="${esc(o.id)}"><span class="choice-face">${esc(o.label)}</span></label>`).join("");
      return `<div class="field survey-q" ${attrs}><p class="field-label" id="q-${esc(q.id)}">${esc(q.title)}${tag(q)}</p>${hint}<div class="survey-options${q.options.length > 6 ? " is-many" : ""}" role="${type === "radio" ? "radiogroup" : "group"}" aria-labelledby="q-${esc(q.id)}">${opts}</div></div>`;
    }
    const field = q.type === "textarea"
      ? `<textarea id="f-${esc(q.id)}" name="${esc(q.id)}" maxlength="${q.max}" rows="3" placeholder="${esc(q.placeholder || "")}"></textarea>`
      : `<input id="f-${esc(q.id)}" name="${esc(q.id)}" maxlength="${q.max}" placeholder="${esc(q.placeholder || "")}"${q.id === "name" ? ' autocomplete="nickname"' : ""}>`;
    const after = q.hint ? `<p class="hint after">${esc(q.hint)}</p>` : "";
    return `<div class="field survey-q" ${attrs}><label for="f-${esc(q.id)}">${esc(q.title)}${tag(q)}</label>${field}${after}</div>`;
  }

  function levelGuide() {
    return `<details class="survey-levels"><summary>分级说明 L0–L4</summary><ol>${S.LEVELS.slice().reverse().map((lv) =>
      `<li><b data-no-i18n>${esc(lv.id)}</b> <strong>${esc(lv.name)}</strong><span>${esc(lv.summary)}</span><small>${esc(lv.rule)}</small></li>`).join("")}</ol><p class="hint">从 L4 往下判断，满足哪一级的条件就停在哪一级。</p></details>`;
  }

  function render() {
    bodyEl.innerHTML = S.SECTIONS.map((sec, i) => `
      <fieldset class="form-section survey-section"><legend><span>${String(i + 1).padStart(2, "0")}</span> ${esc(sec.title)}</legend>
      ${sec.lead ? `<p class="hint survey-lead">${esc(sec.lead)}</p>` : ""}
      ${sec.id === "level" ? levelGuide() : ""}
      ${sec.questions.map(renderQuestion).join("")}
      </fieldset>`).join("");
  }

  function collect() {
    const raw = {};
    for (const q of S.QUESTIONS) {
      if (q.type === "single") {
        const el = form.querySelector(`input[name="${q.id}"]:checked`);
        if (el) raw[q.id] = el.value;
      } else if (q.type === "multi") {
        const vals = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map((el) => el.value);
        if (vals.length) raw[q.id] = vals;
      } else {
        const el = form.querySelector(`[name="${q.id}"]`);
        if (el && el.value.trim()) raw[q.id] = el.value;
      }
    }
    return raw;
  }

  function restore(raw) {
    for (const q of S.QUESTIONS) {
      const v = raw[q.id];
      if (v == null) continue;
      if (q.type === "single" || q.type === "multi") {
        const list = Array.isArray(v) ? v : [v];
        form.querySelectorAll(`input[name="${q.id}"]`).forEach((el) => { el.checked = list.includes(el.value); });
      } else {
        const el = form.querySelector(`[name="${q.id}"]`);
        if (el) el.value = String(v);
      }
    }
  }

  /* 「还没用过」「暂无顾虑」这类选项与其他选项互斥。 */
  const EXCLUSIVE = { tools: "none", concerns: "none" };

  function enforce(changed) {
    const qid = changed && changed.name;
    const q = S.QUESTIONS.find((x) => x.id === qid);
    if (q && q.type === "multi" && EXCLUSIVE[qid] && changed.checked) {
      form.querySelectorAll(`input[name="${qid}"]`).forEach((el) => {
        if (changed.value === EXCLUSIVE[qid] ? el !== changed : el.value === EXCLUSIVE[qid]) el.checked = false;
      });
    }
    for (const mq of S.QUESTIONS) {
      if (mq.type !== "multi" || !mq.max) continue;
      const inputs = [...form.querySelectorAll(`input[name="${mq.id}"]`)];
      const full = inputs.filter((el) => el.checked).length >= mq.max;
      inputs.forEach((el) => {
        el.disabled = full && !el.checked;
        el.closest(".choice").classList.toggle("is-disabled", el.disabled);
      });
    }
  }

  function sync() {
    const raw = collect();
    const { answers } = S.normalize(raw);
    let need = 0;
    let done = 0;
    for (const q of S.QUESTIONS) {
      const visible = S.isVisible(q, answers);
      const box = form.querySelector(`.survey-q[data-q="${q.id}"]`);
      if (box) box.hidden = !visible;
      if (visible && q.required) {
        need += 1;
        if (answers[q.id] != null) {
          done += 1;
          box && box.classList.remove("is-missing");
        }
      }
    }
    progressCount.textContent = `${done} / ${need}`;
    progressBar.style.width = need ? `${Math.round((done / need) * 100)}%` : "0%";
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(raw)); } catch (_) {}
    return answers;
  }

  function showLevel(levelId, note) {
    const lv = S.LEVELS.find((x) => x.id === levelId) || S.levelOf({});
    document.getElementById("resultLevel").textContent = lv.id;
    document.getElementById("resultName").textContent = lv.name;
    document.getElementById("resultSummary").textContent = lv.summary;
    document.getElementById("resultNote").textContent = note;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setMsg(text, kind) {
    msg.className = "form-msg" + (kind ? " " + kind : "");
    msg.textContent = text;
  }

  render();
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (draft) restore(draft);
  } catch (_) {}
  enforce(null);
  sync();
  try {
    if (localStorage.getItem(DONE_KEY)) setMsg("你已经提交过这份问卷。如有变化，可以修改后再提交一次。");
  } catch (_) {}

  form.addEventListener("change", (e) => {
    enforce(e.target);
    sync();
    if (msg.classList.contains("err") && !S.normalize(collect()).missing) setMsg("");
  });
  form.addEventListener("input", (e) => {
    if (e.target.matches("input[type=text], input:not([type]), textarea")) sync();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = collect();
    const { answers, missing } = S.normalize(raw);
    form.querySelectorAll(".survey-q.is-missing").forEach((el) => el.classList.remove("is-missing"));
    if (missing) {
      const box = form.querySelector(`.survey-q[data-q="${missing.id}"]`);
      if (box) {
        box.classList.add("is-missing");
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setMsg(`请回答：${missing.title}`, "err");
      return;
    }
    const level = S.levelOf(answers);
    submitBtn.disabled = true;
    setMsg("提交中…");
    try {
      const data = await CC.api("/api/survey", {
        method: "POST",
        body: JSON.stringify({ answers, website: form.elements.website.value })
      });
      setMsg("已提交，谢谢你！", "ok");
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.setItem(DONE_KEY, new Date().toISOString());
      } catch (_) {}
      showLevel(data.level || level.id, "级别只用于分组安排活动，组织者会据此准备不同深度的内容。");
    } catch (err) {
      const offline = err.status === 0 || err.status >= 500;
      setMsg(offline
        ? "暂时无法提交，服务器还在配置中。答案已保存在这台设备上，稍后再打开本页点提交即可。"
        : err.message, "err");
      showLevel(level.id, offline ? "这是按你的答案在本机算出的级别，提交成功后组织者才能看到。" : "");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
