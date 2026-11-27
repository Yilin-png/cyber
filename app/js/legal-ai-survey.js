/* 法律 AI 社群问卷：题目与校验。
   同一份文件供浏览器（window.CCSurvey）、Worker 与 Node 服务端使用，改题只改这里。
   选项 id 一旦有人提交就不要改，否则旧答卷在审批台和导出里会对不上。 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CCSurvey = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SURVEY_ID = "legal-ai-2026";
  const SURVEY_VERSION = 2;
  const MAX_RESPONSES = 1500;

  const o = (id, label) => ({ id, label });

  const SECTIONS = [
    {
      id: "usage",
      title: "你和 AI",
      questions: [
        { id: "name", type: "text", max: 40, title: "怎么称呼你", placeholder: "昵称即可" },
        {
          id: "freq", type: "single", required: true, title: "平时多久用一次 AI",
          options: [
            o("never", "还很少用"), o("tried", "偶尔试试"), o("monthly", "每月几次"),
            o("weekly", "每周几次"), o("daily", "几乎每天")
          ]
        },
        {
          id: "tools", type: "multi", title: "常用的工具", hint: "可多选",
          options: [
            o("chatgpt", "ChatGPT"), o("claude", "Claude"), o("gemini", "Gemini"),
            o("deepseek", "DeepSeek"), o("kimi", "Kimi"), o("doubao", "豆包"),
            o("qwen", "通义 · 元宝"), o("legal", "法律类 AI"),
            o("coding", "Cursor 等编程工具"), o("builder", "Coze · Dify 等"),
            o("none", "暂时没有")
          ]
        },
        {
          id: "prompt", type: "single", title: "向 AI 提问时，你一般会",
          options: [
            o("ask", "直接说需求"), o("context", "补充背景和格式"),
            o("template", "用固定的模板"), o("advanced", "分步问或对比模型")
          ]
        },
        {
          id: "automation", type: "single", title: "智能体或自动化流程",
          options: [
            o("none", "还没接触"), o("used", "用过现成的"),
            o("built", "自己搭过"), o("team", "团队在用")
          ]
        },
        {
          id: "dev", type: "single", title: "写代码方面",
          options: [
            o("none", "不写代码"), o("read", "能看懂一些"),
            o("script", "用 AI 写过小工具"), o("ship", "做过完整应用")
          ]
        }
      ]
    },
    {
      id: "needs",
      title: "想用 AI 解决什么",
      questions: [
        {
          id: "tasks", type: "multi", required: true, max: 5,
          title: "最想用 AI 解决的工作问题", hint: "最多选 5 项",
          options: [
            o("research", "法律检索与类案"), o("contract", "合同起草与审查"),
            o("drafting", "文书与法律意见"), o("review", "尽调与文件审阅"),
            o("evidence", "证据与案件时间线"), o("translate", "翻译与跨境沟通"),
            o("minutes", "会议纪要整理"), o("knowledge", "知识管理"),
            o("marketing", "客户沟通与内容"), o("regwatch", "法规与监管追踪"),
            o("workflow", "流程自动化"), o("other", "其他")
          ]
        },
        {
          id: "pain", type: "textarea", max: 300,
          title: "一个最想让 AI 帮你解决的具体场景",
          placeholder: "例如：每周要比对几十份合同的违约条款，想要一个稳定的审查流程。"
        },
        {
          id: "wants", type: "multi", required: true, max: 4,
          title: "希望社群提供什么", hint: "最多选 4 项",
          options: [
            o("workshop", "工具实操工作坊"), o("prompts", "提示词与模板库"),
            o("cases", "实战案例拆解"), o("agents", "智能体与自动化"),
            o("coding", "AI 编程入门"), o("safety", "合规与数据安全"),
            o("tooling", "工具测评与选型"), o("network", "同行交流与对接"),
            o("build", "项目共创 · 黑客松")
          ]
        },
        {
          id: "concerns", type: "multi", title: "对数据和保密有哪些顾虑", hint: "可多选",
          options: [
            o("client", "客户信息泄露"), o("training", "数据被用于训练"),
            o("crossborder", "跨境数据传输"), o("accuracy", "准确性 · 幻觉"),
            o("ethics", "职业伦理与规范"), o("policy", "单位政策限制"),
            o("none", "暂无顾虑")
          ]
        }
      ]
    },
    {
      id: "events",
      title: "活动怎么办",
      questions: [
        {
          id: "format", type: "multi", required: true, title: "方便参加的形式与地点", hint: "可多选",
          options: [
            o("online", "线上"), o("shenzhen", "深圳线下"), o("hongkong", "香港线下"),
            o("guangzhou", "广州线下"), o("elsewhere", "其他城市线下")
          ]
        },
        {
          id: "time", type: "multi", required: true, title: "方便的时间", hint: "可多选",
          options: [
            o("weeknight", "工作日晚上"), o("lunch", "工作日午间"),
            o("weekendDay", "周末白天"), o("weekendNight", "周末晚上")
          ]
        },
        {
          id: "topics", type: "multi", max: 3, title: "想听的主题", hint: "最多选 3 项",
          options: [
            o("models", "大模型选型对比"), o("research", "AI 法律检索"),
            o("contract", "AI 合同审查"), o("litigation", "AI 辅助诉讼"),
            o("agents", "智能体与工作流"), o("vibe", "AI 编程"),
            o("regulation", "AI 监管与合规"), o("adoption", "律所 · 法务部落地"),
            o("career", "AI 时代的职业发展")
          ]
        },
        {
          id: "share", type: "single", required: true, title: "愿意分享或主讲吗",
          options: [
            o("talk", "愿意主讲一场"), o("short", "愿意短分享"),
            o("help", "愿意协助组织"), o("listen", "暂时先听")
          ]
        },
        {
          id: "shareTopic", type: "text", max: 80, title: "想分享的题目",
          placeholder: "一句话即可", showIf: { q: "share", in: ["talk", "short"] }
        },
        {
          id: "suggest", type: "textarea", max: 300, title: "对社群的其他建议",
          placeholder: "任何想法都可以"
        }
      ]
    }
  ];

  const QUESTIONS = SECTIONS.flatMap((s) => s.questions);

  function clean(value, max) {
    return String(value == null ? "" : value).trim().slice(0, max || 200);
  }

  function matches(answers, cond) {
    const v = answers[cond.q];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    return list.some((x) => cond.in.includes(x));
  }

  function isVisible(q, answers) {
    return !q.showIf || matches(answers, q.showIf);
  }

  /* 只保留题目里存在的选项和可见题；返回第一道未答必答题，方便前后端给同样的提示。 */
  function normalize(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const answers = {};
    let missing = null;
    for (const q of QUESTIONS) {
      if (!isVisible(q, answers)) continue;
      const v = input[q.id];
      if (q.type === "single") {
        const id = clean(v, 40);
        if (q.options.some((x) => x.id === id)) answers[q.id] = id;
      } else if (q.type === "multi") {
        const ids = (Array.isArray(v) ? v : []).map((x) => clean(x, 40));
        const valid = q.options.map((x) => x.id).filter((id) => ids.includes(id));
        const picked = q.max ? valid.slice(0, q.max) : valid;
        if (picked.length) answers[q.id] = picked;
      } else {
        const text = clean(v, q.max);
        if (text) answers[q.id] = text;
      }
      if (q.required && answers[q.id] == null && !missing) missing = q;
    }
    return { answers, missing };
  }

  function labelOf(q, value) {
    if (value == null) return "";
    if (q.type === "single") return (q.options.find((x) => x.id === value) || {}).label || value;
    if (q.type === "multi") {
      return value.map((id) => (q.options.find((x) => x.id === id) || {}).label || id).join("、");
    }
    return String(value);
  }

  function csv(responses, formatTime) {
    const cell = (v) => {
      let s = String(v == null ? "" : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ["提交时间", ...QUESTIONS.map((q) => q.title)];
    const lines = [header.map(cell).join(",")];
    for (const r of responses) {
      lines.push(
        [
          formatTime ? formatTime(r.createdAt) : r.createdAt,
          ...QUESTIONS.map((q) => labelOf(q, (r.answers || {})[q.id]))
        ].map(cell).join(",")
      );
    }
    return "\uFEFF" + lines.join("\r\n");
  }

  return {
    SURVEY_ID,
    SURVEY_VERSION,
    MAX_RESPONSES,
    SECTIONS,
    QUESTIONS,
    isVisible,
    normalize,
    labelOf,
    csv
  };
});
