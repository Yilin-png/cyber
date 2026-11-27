/* 法律 AI 社群问卷：题目、分级规则与校验。
   同一份文件供浏览器（window.CCSurvey）、Worker 与 Node 服务端使用，改题只改这里。
   选项 id 一旦有人提交就不要改，否则旧答卷在审批台和导出里会对不上。 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CCSurvey = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SURVEY_ID = "legal-ai-2026";
  const SURVEY_VERSION = 1;
  const MAX_RESPONSES = 1500;

  const o = (id, label) => ({ id, label });

  const SECTIONS = [
    {
      id: "you",
      title: "先认识一下",
      questions: [
        {
          id: "role", type: "single", required: true, title: "你目前的角色",
          options: [
            o("partner", "律师 · 合伙人"), o("lawyer", "律师 · 非合伙人"),
            o("trainee", "律师助理 · 实习律师"), o("inhouse", "公司法务"),
            o("public", "法官 · 检察官 · 仲裁等公职"), o("academic", "学者 · 学生"),
            o("legaltech", "法律科技从业者"), o("other", "其他")
          ]
        },
        {
          id: "org", type: "single", required: true, title: "所在机构类型",
          options: [
            o("big", "大型律所"), o("boutique", "中小型律所"),
            o("foreign", "外资所 · 港所"), o("company", "企业"),
            o("gov", "政府 · 司法机关"), o("school", "高校 · 研究机构"),
            o("tech", "法律科技公司"), o("indep", "独立执业 · 其他")
          ]
        },
        {
          id: "areas", type: "multi", required: true, max: 3, title: "主要执业领域",
          hint: "最多选 3 项",
          options: [
            o("disputes", "诉讼仲裁"), o("corporate", "公司并购"),
            o("finance", "金融 · 资本市场"), o("compliance", "合规 · 数据与网络"),
            o("ip", "知识产权"), o("labor", "劳动人事"), o("criminal", "刑事"),
            o("crossborder", "跨境 · 涉外"), o("realestate", "房地产 · 建工"),
            o("family", "婚姻家事 · 财富传承"), o("tax", "税务"), o("other", "其他")
          ]
        },
        {
          id: "city", type: "single", required: true, title: "常驻城市",
          options: [
            o("shenzhen", "深圳"), o("hongkong", "香港"), o("guangzhou", "广州"),
            o("beijing", "北京"), o("shanghai", "上海"), o("other", "其他城市")
          ]
        },
        {
          id: "cityOther", type: "text", max: 30, title: "哪座城市",
          placeholder: "填写城市", showIf: { q: "city", in: ["other"] }
        }
      ]
    },
    {
      id: "level",
      title: "AI 使用水平",
      lead: "以下 5 题用于分级，按实际情况选即可，没有好坏之分。",
      questions: [
        {
          id: "freq", type: "single", required: true, title: "在工作中使用 AI 的频率",
          options: [
            o("never", "基本没用过"), o("tried", "试过几次"), o("monthly", "每月几次"),
            o("weekly", "每周几次"), o("daily", "几乎每天")
          ]
        },
        {
          id: "tools", type: "multi", title: "用过哪些工具", hint: "可多选",
          options: [
            o("chatgpt", "ChatGPT"), o("claude", "Claude"), o("gemini", "Gemini"),
            o("deepseek", "DeepSeek"), o("kimi", "Kimi"), o("doubao", "豆包"),
            o("qwen", "通义 · 元宝等"), o("legal", "法律垂直 AI（法宝、威科、法信等）"),
            o("coding", "Cursor · Copilot 等编程工具"), o("builder", "Coze · Dify · n8n 等搭建平台"),
            o("none", "还没用过")
          ]
        },
        {
          id: "prompt", type: "single", required: true, title: "你通常怎么写提示词",
          options: [
            o("ask", "直接提问，一两句话"),
            o("context", "会补充背景、要求和输出格式"),
            o("template", "有自己的结构化模板（角色、背景、任务、格式、示例）"),
            o("advanced", "会拆成多步、让模型自查，或对比多个模型")
          ]
        },
        {
          id: "automation", type: "single", required: true, title: "做过自动化或智能体吗",
          options: [
            o("none", "没做过"),
            o("used", "用过别人搭好的智能体或 GPTs"),
            o("built", "自己搭过工作流或智能体（Coze、Dify、GPTs、n8n 等）"),
            o("team", "搭好后在团队里持续使用")
          ]
        },
        {
          id: "dev", type: "single", required: true, title: "开发能力",
          options: [
            o("none", "不会写代码"),
            o("read", "能看懂、改简单脚本"),
            o("script", "能调用 API 或用 AI 编程做小工具"),
            o("ship", "能开发并上线完整应用")
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
            o("drafting", "诉讼文书 · 法律意见起草"), o("review", "尽调与大批量文件审阅"),
            o("evidence", "证据整理 · 案件时间线"), o("translate", "翻译与跨境沟通"),
            o("minutes", "会议纪要 · 录音整理"), o("knowledge", "知识管理 · 内部知识库"),
            o("marketing", "客户沟通与内容营销"), o("regwatch", "法规与监管追踪"),
            o("workflow", "案件管理与流程自动化"), o("other", "其他")
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
            o("cases", "实战案例拆解"), o("agents", "智能体与自动化搭建"),
            o("coding", "AI 编程入门"), o("safety", "合规与数据安全指引"),
            o("tooling", "工具测评与选型建议"), o("network", "同行交流与资源对接"),
            o("build", "项目共创 · 黑客松")
          ]
        },
        {
          id: "concerns", type: "multi", title: "对数据和保密有哪些顾虑", hint: "可多选",
          options: [
            o("client", "客户信息泄露"), o("training", "数据被用于模型训练"),
            o("crossborder", "跨境数据传输"), o("accuracy", "输出准确性 · 幻觉"),
            o("ethics", "职业伦理与执业规范"), o("policy", "单位政策限制"),
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
            o("models", "大模型选型与对比"), o("research", "AI 法律检索"),
            o("contract", "AI 合同审查"), o("litigation", "AI 辅助诉讼"),
            o("agents", "智能体与工作流"), o("vibe", "AI 编程 · Vibe Coding"),
            o("regulation", "AI 监管与数据合规"), o("adoption", "律所 · 法务部 AI 落地"),
            o("career", "AI 时代的职业发展")
          ]
        },
        {
          id: "share", type: "single", required: true, title: "愿意分享或主讲吗",
          options: [
            o("talk", "愿意主讲一场"), o("short", "愿意做 10–15 分钟短分享"),
            o("help", "愿意协助组织"), o("listen", "暂时先听")
          ]
        },
        {
          id: "shareTopic", type: "text", max: 80, title: "想分享的题目",
          placeholder: "一句话即可", showIf: { q: "share", in: ["talk", "short"] }
        }
      ]
    },
    {
      id: "last",
      title: "最后",
      questions: [
        {
          id: "suggest", type: "textarea", max: 300, title: "对社群的其他建议",
          placeholder: "任何想法都可以"
        },
        { id: "name", type: "text", max: 40, title: "怎么称呼你", placeholder: "昵称即可" },
        {
          id: "contact", type: "text", max: 80, title: "联系方式",
          placeholder: "微信、手机或邮箱",
          hint: "只用于活动邀请或约分享，仅组织者可见。"
        }
      ]
    }
  ];

  /* 自上而下取第一个满足的级别。条件之间是「且」，同一条件内是「任一」。 */
  const LEVELS = [
    {
      id: "L4", name: "开发构建",
      summary: "能写代码、调用 API 或开发上线工具，可以从零构建法律 AI 应用。",
      rule: "开发能力为「能调用 API 或用 AI 编程做小工具」或「能开发并上线完整应用」",
      when: [{ q: "dev", in: ["script", "ship"] }]
    },
    {
      id: "L3", name: "流程搭建",
      summary: "自己搭过工作流、智能体或知识库，能把重复任务交给 AI 流程完成。",
      rule: "自动化为「自己搭过工作流或智能体」或「搭好后在团队里持续使用」",
      when: [{ q: "automation", in: ["built", "team"] }]
    },
    {
      id: "L2", name: "熟练应用",
      summary: "每周多次使用，会写结构化提示词，能把 AI 稳定用在真实法律工作中。",
      rule: "频率为每周几次或几乎每天，且提示词为「结构化模板」或「多步、自查、对比模型」",
      when: [
        { q: "freq", in: ["weekly", "daily"] },
        { q: "prompt", in: ["template", "advanced"] }
      ]
    },
    {
      id: "L1", name: "日常使用",
      summary: "经常用通用 AI 处理检索、写作、翻译等任务，提示词以直接提问或补充背景为主。",
      rule: "频率为每月几次及以上",
      when: [{ q: "freq", in: ["monthly", "weekly", "daily"] }]
    },
    {
      id: "L0", name: "观望起步",
      summary: "基本没用过或只试过几次，适合从入门演示和安全使用讲起。",
      rule: "以上都不满足",
      when: []
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

  function levelOf(answers) {
    return LEVELS.find((lv) => lv.when.every((c) => matches(answers || {}, c))) || LEVELS[LEVELS.length - 1];
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
    const header = ["提交时间", "级别", "级别名称", ...QUESTIONS.map((q) => q.title)];
    const lines = [header.map(cell).join(",")];
    for (const r of responses) {
      const lv = LEVELS.find((x) => x.id === r.level) || levelOf(r.answers);
      lines.push(
        [
          formatTime ? formatTime(r.createdAt) : r.createdAt,
          lv.id,
          lv.name,
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
    LEVELS,
    isVisible,
    levelOf,
    normalize,
    labelOf,
    csv
  };
});
