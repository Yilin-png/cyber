/* 赛博法师 · 站点公开内容 —— 不含敏感操作细节 */
window.DATA = {

  pulse: { members: 340, gatherings: 7, spells: 62 },
  nextGathering: "第三期 · 待定",
  mana: 82,

  trending: [
    "Agentic AI", "Context Engineering", "MCP Servers", "Tool Use",
    "Subagents", "Computer Use", "Vibe Coding", "Spec-Driven Dev",
    "Reasoning Models", "Test-Time Compute", "Chain of Thought", "Mixture of Experts",
    "Long Context", "KV Cache", "Speculative Decoding", "Quantization",
    "Distillation", "LoRA", "Fine-Tuning", "RLHF",
    "Synthetic Data", "Evals", "Guardrails", "Prompt Injection",
    "Hallucination", "RAG", "Embeddings", "Vector Search",
    "Semantic Chunking", "Knowledge Graph", "Multimodal", "Diffusion Models",
    "World Models", "Open Weights", "Edge Inference", "AI Alignment"
  ],
  contact: "CONTACT · cybercasters@gmail.com",

  /* 活动记录：公开摘要可写充分；操作细节与全文仍需参会登录 */
  activity: [
    {
      date: "2026.08.20",
      title: "赛博法师 • 第二期AI交流会",
      mode: "线下",
      place: "深圳",
      time: "19:00",
      status: "past",
      desc: "第二期线下交流已举办。Cursor 里把尽调报告收成可交付 Word，Skill 分层与触发，从个人工作流到团队规范，再到驾驶舱式长项目和硬约束写作。",
      link: "gathering-002.html",
      linkText: "阅读公开纪要"
    },
    {
      date: "2026.07.24",
      title: "赛博法师 • 第一期AI交流会",
      mode: "线下",
      place: "深圳",
      status: "past",
      desc: "第一期线下交流。一件AI没能替你搞定的难事、一个你自己顺手、别人多半不知道的小技巧。打开电脑，同题异解，互相修炼。",
      link: "gathering-001.html",
      linkText: "阅读公开纪要"
    }
  ],

  /* 法器长廊：预留给成员项目 / 个人网页展示 */
  artifacts: [
    {
      name: "征集中",
      status: "soon",
      label: "即将开放",
      role: "成员作品位",
      desc: "用于展示成员的项目、工具或个人网页。做好了就可以申请挂上来。",
      tags: ["项目", "网页"]
    }
  ],

  /* 咒语手册筛选分类：cat 与下方 tools 的 cat 字段对应 */
  toolCats: [
    { k: "all",       name: "全部" },
    { k: "desktop",   name: "桌面" },
    { k: "coding",    name: "编程" },
    { k: "capture",   name: "采集" },
    { k: "document",  name: "文档" },
    { k: "knowledge", name: "知识库" },
    { k: "voice",     name: "语音" }
  ],

  /* 咒语手册：只列工具（卡片式，按名称字母序）；使用心得归成员区 */
  tools: [
    {
      name: "Claude Code",
      cat: "coding",
      status: "tool",
      label: "编程",
      role: "终端编程 Agent",
      desc: "Anthropic 的命令行编程助手：读仓库、改文件、跑命令，适合在终端里把开发任务闭环完成。",
      tags: ["编程", "Agent", "CLI"],
      link: "https://docs.anthropic.com/en/docs/claude-code",
      linkText: "打开"
    },
    {
      name: "Claude Desktop",
      cat: "desktop",
      status: "tool",
      label: "桌面",
      role: "综合桌面 Agent",
      desc: "Anthropic 桌面端：聊天、Cowork 与本地协作集于一处，可接文件与应用，适合跨场景把事做完。",
      tags: ["桌面", "Agent", "综合"],
      link: "https://claude.com/download",
      linkText: "打开"
    },
    {
      name: "Codex",
      cat: "desktop",
      status: "tool",
      label: "桌面",
      role: "综合桌面 Agent",
      desc: "OpenAI 的 Codex 应用 / ChatGPT 入口：并行调度多 Agent、审 diff、跨项目推进，不只是写几行补丁。",
      tags: ["桌面", "Agent", "综合"],
      link: "https://chatgpt.com/codex/",
      linkText: "打开"
    },
    {
      name: "Cubox",
      cat: "capture",
      status: "tool",
      label: "采集",
      role: "稍后读 / 剪藏",
      desc: "把链接与摘录收进统一收件箱，减少「看过就丢」。第一期聊过的采集层入口之一。",
      tags: ["采集", "剪藏"],
      link: "https://cubox.pro/",
      linkText: "打开"
    },
    {
      name: "Cursor",
      cat: "coding",
      status: "tool",
      label: "编程",
      role: "AI 代码编辑器",
      desc: "在 IDE 里写代码、审 diff、跑 Agent；适合日常开发与多文件改动。",
      tags: ["编程", "IDE", "Agent"],
      link: "https://cursor.com/",
      linkText: "打开"
    },
    {
      name: "Firecrawl",
      cat: "capture",
      status: "tool",
      label: "采集",
      role: "网页采集 API",
      desc: "把网页搜、爬、转成干净的 Markdown / JSON，适合给 Agent 喂网页上下文。",
      tags: ["采集", "爬虫", "API"],
      link: "https://www.firecrawl.dev/",
      linkText: "打开"
    },
    {
      name: "MinerU",
      cat: "document",
      status: "tool",
      label: "文档",
      role: "文档解析",
      desc: "把 PDF / Office / 图片解析成结构化 Markdown 与 JSON，方便 RAG 与 Agent 后续处理。",
      tags: ["文档", "PDF", "解析"],
      link: "https://github.com/opendatalab/MinerU",
      linkText: "仓库"
    },
    {
      name: "NotebookLM",
      cat: "knowledge",
      status: "tool",
      label: "知识库",
      role: "资料笔记本",
      desc: "Google 的资料笔记本：上传文档与链接后，按来源问答、摘要与整理，适合深读一批材料。",
      tags: ["知识库", "问答"],
      link: "https://notebooklm.google.com/",
      linkText: "打开"
    },
    {
      name: "Obsidian",
      cat: "knowledge",
      status: "tool",
      label: "知识库",
      role: "本地知识库",
      desc: "以本地 Markdown 为真源，方便 Agent 与脚本直接读取。",
      tags: ["知识库", "本地"],
      link: "https://obsidian.md/",
      linkText: "打开"
    },
    {
      name: "OfficeCli",
      cat: "document",
      status: "tool",
      label: "文档",
      role: "命令行操作 Office",
      desc: "用命令行创建、检查与修改 docx / xlsx / pptx：让 Agent 直接读版式、挑格式问题、加图表。",
      tags: ["文档", "Office", "CLI"],
      link: "https://github.com/iOfficeAI/OfficeCLI",
      linkText: "仓库"
    },
    {
      name: "OpenCode",
      cat: "coding",
      status: "tool",
      label: "编程",
      role: "开源编程 Agent",
      desc: "开源 AI 编程助手，终端 / 桌面 / IDE 都能用；可接多家模型，读仓库、改代码、跑命令。",
      tags: ["编程", "Agent", "开源"],
      link: "https://opencode.ai/",
      linkText: "打开"
    },
    {
      name: "Pandoc",
      cat: "document",
      status: "tool",
      label: "文档",
      role: "格式转换",
      desc: "把 Markdown 等格式编译成 Word / PDF。常与 reference.docx 样式模板一起用。",
      tags: ["文档", "CLI"],
      link: "https://pandoc.org/",
      linkText: "打开"
    },
    {
      name: "Typeless",
      cat: "voice",
      status: "tool",
      label: "语音",
      role: "口述结构化输入",
      desc: "跨应用的 AI 语音听写，把零散口述整理成有结构的文字，适合回消息与起草稿。",
      tags: ["语音", "输入法"],
      link: "https://www.typeless.com/",
      linkText: "打开"
    },
    {
      name: "Whisper",
      cat: "voice",
      status: "tool",
      label: "语音",
      role: "本地语音转写",
      desc: "开源语音识别，可在本地跑完转写再交给模型整理。",
      tags: ["语音", "本地"],
      link: "https://github.com/openai/whisper",
      linkText: "仓库"
    },
    {
      name: "Workbuddy",
      cat: "desktop",
      status: "tool",
      label: "桌面",
      role: "综合桌面 Agent",
      desc: "腾讯全场景 AI 工作台：研究、文档、表格到本地文件操作一条龙；Coding Mode 只是其中一环。",
      tags: ["桌面", "Agent", "综合"],
      link: "https://www.workbuddy.ai/",
      linkText: "打开"
    },
    {
      name: "闪电说",
      /* 中文名按拼音参与字母排序 */
      sortKey: "shandianshuo",
      cat: "voice",
      status: "tool",
      label: "语音",
      role: "端侧中文语音输入",
      desc: "识别可在本地跑，短按口述直接落进输入框，长按让它按上下文替你把回复写好。",
      tags: ["语音", "输入法", "本地"],
      link: "https://shandianshuo.cn/",
      linkText: "打开"
    }
  ],

  /* 使用心得：技巧 / 方法 / 踩坑，仅参会成员可见 */
  spellsMemberOnly: true,
  spells: [
    { group: "格式与排版", src: "gathering-001.html#s03", items: [
      { k: "method", t: "结论先摆这儿", d: "MD / HTML 最适合 AI，Word 不适合。非用 Word 不可的时候，别走解包那条路。" },
      { k: "method", t: "用 reference.docx 管样式", d: "pandoc 配纯样式模板：内容与版式解耦，改内容不必重调格式。" },
      { k: "exp", t: "一份成本实测", d: "同样一段 Word，不同处理路径的 token 成本可差数十倍；日报场景一年下来差别很明显。" },
      { k: "pit", t: "踩过的坑", d: "pandoc 默认规则可能给输出加水印，需用 reference 覆盖。" }
    ]},
    { group: "Skill 的封装与管理", src: "gathering-001.html#s02", items: [
      { k: "method", t: "Skill 就是蒸馏过的经验", d: "本质是一份 markdown，跨工具通用。" },
      { k: "method", t: "分层放", d: "项目级与系统级分开；数量大了挂图谱让它自学调用。" },
      { k: "exp", t: "别指望直接抄别人的", d: "格式、审美、严谨度因人而异，网上 skill 很难原样套用。" }
    ]},
    { group: "保密与本地化", src: "gathering-001.html#s04", items: [
      { k: "method", t: "脱敏发生在转写那一步", d: "语音转文字尽量本地完成，再交给可信模型做结构化纪要。" },
      { k: "exp", t: "本地识别够用", d: "准确率略低于云端，但后续提炼能纠回一部分。" }
    ]},
    { group: "尽调报告交付", src: "gathering-002.html#s02", items: [
      { k: "method", t: "内容和格式拆成两条 Skill", d: "前端定稿一条，转 Word 一条；演示可以只测转换。" },
      { k: "method", t: "MD → HTML → Word，再微调", d: "目录和合并表先走 HTML；列宽间距再在成品上改。" },
      { k: "exp", t: "reference 交给模型改", d: "按 pandoc 映射规则改样式模板，不必自己从零点字体。" }
    ]},
    { group: "Skill 触发", src: "gathering-002.html#s08", items: [
      { k: "pit", t: "中转会盖掉 settings", d: "钩子放到项目级；用户级配置被旧版覆盖时才不会静音。" },
      { k: "method", t: "常用 Skill 放进强制扫描层", d: "只靠长 memory 里的触发词，模型会漏。每天真用的先搬过去。" },
      { k: "method", t: "软约束要配检查点", d: "说明文件只是提醒。章节缺了就回头重做。" }
    ]},
    { group: "长项目怎么开", src: "gathering-002.html#s11", items: [
      { k: "method", t: "主对话只做驾驶舱", d: "重活新开对话，权威文件当记忆，别指望自动压缩保真。" },
      { k: "method", t: "工程目录是给模型的地图", d: "原料、简报、知识库分层；知识库只收摘要。" },
      { k: "exp", t: "硬约束靠骨架不是靠提示词", d: "句级出处 + JSON Schema，长报告才能稳定。" }
    ]}
  ],

  about: {
    title: "赛博法师的初心",
    lead: "我们希望建立一个真诚、务实、开放的熟人社群。在 AI 技术快速演进、信息不断涌现的时代，彼此分享、共同探索，把对变化的焦虑转化为学习与行动，把零散的经验和灵感沉淀为真正有用的方法、产品与连接。",
    principles: [
      {
        title: "同步认知，减少焦虑与信息差",
        body: "抱团打怪，互通有无，帮助彼此更从容地理解变化、跟上节奏，少一些无谓的焦虑，多一些确定的行动。"
      },
      {
        title: "分享真正实用的技巧",
        body: "从具体问题和真实场景出发，注重方法是否可复用、能提高效率。少谈宏大叙事，多讲亲自实践和验证过的经验。"
      },
      {
        title: "从真实需求中孕育产品",
        body: "挖掘工作与生活中的实际痛点，碰撞产品构想，提供来自行业、业务和用户的不同视角，找到值得解决的问题。"
      },
      {
        title: "营造开放而有温度的社群文化",
        body: "倡导创新、协作与开源精神，不说教、不营销、不变现。我们希望在这里收获的不只是技巧，也有能够彼此启发、共同成长的朋友。"
      }
    ]
  },

  channels: [
    { name: "我想参加", type: "link", url: "apply.html",
      kicker: "JOIN",
      note: "留下称呼与意向，审核通过后会收到登录名和通行码。",
      cta: "填写申请", variant: "primary" },
    { name: "成员登录", type: "link", url: "login.html",
      kicker: "LOGIN",
      note: "用登录名和通行码进入，查阅参会纪要与留言。",
      cta: "去登录", variant: "ghost" }
  ],

  wechatCommunity: {
    title: "微信社群",
    kicker: "COMMUNITY",
    status: "pending",
    note: "群二维码待维护。需要加群可先报名留下联系方式。"
  }
};
