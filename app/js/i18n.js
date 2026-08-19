/* 中 / EN：偏好记在 localStorage，切页不丢 */
window.CC = window.CC || {};

CC.I18N = (function () {
  const KEY = "cc-lang";
  const ZH = "zh";
  const EN = "en";

  const MODE = { 线下: "Offline", 线上: "Online" };
  const PLACE = { 深圳: "Shenzhen" };

  const STR = {
    zh: {
      "nav.home": "← 返回首页",
      "nav.back": "← 返回",
      "nav.login": "已有通行码？登录",
      "nav.apply": "还没有通行码？去申请",
      "hero.thesis": "AI技巧交流会",
      "hero.join": "我想参加",
      "hero.enter": "点击进入",
      "hero.next": "下一期",
      "tab.activity": "活动记录",
      "tab.gallery": "法器长廊",
      "tab.toolkit": "咒语手册",
      "tab.about": "关于我们",
      "activity.lead": "参加过当期的朋友登录后可看完整纪要并留言。",
      "activity.process": "活动流程",
      "gallery.lead": "预留给成员的项目与个人网页。做好了可以申请挂上来。",
      "toolkit.lead": "收录集会上讨论过的工具与使用心得。",
      "footer.copy": "© 2026 赛博法师 • CYBER CASTERS",
      "upcoming": "待举办",
      "readNotes": "阅读公开纪要",
      "applyJoin": "申请参加",
      "open": "打开",
      "repo": "仓库",
      "go": "前往",
      "fromNotes": "出自纪要",
      "login": "登录",
      "apply": "申请",
      "logout": "退出",
      "myNotes": "我的纪要",
      "admin": "管理",
      "toolkit.empty": "集会上讨论过的工具将陆续以卡片形式收录于此。",
      "toolkit.none": "该分类下暂无工具。",
      "toolkit.filter": "工具分类筛选",
      "spells.title": "使用心得",
      "spells.lockTitle": "使用心得需成员权限",
      "spells.lockBody": "上面的工具卡片可自由查阅。具体使用心得请参会登录后查看。",
      "spells.login": "成员登录",
      "spells.apply": "申请加入",
      "wechat.pending": "待维护",
      "wechat.qr": "二维码待维护",
      "cat.all": "全部",
      "cat.desktop": "桌面",
      "cat.coding": "编程",
      "cat.capture": "采集",
      "cat.document": "文档",
      "cat.knowledge": "知识库",
      "cat.voice": "语音",
      "spell.prod": "产品",
      "spell.tool": "工具",
      "spell.method": "方法论",
      "spell.exp": "经验",
      "spell.pit": "踩坑",
      "apply.title": "我想参加 • 赛博法师",
      "apply.name": "怎么称呼你 *",
      "apply.namePh": "昵称即可",
      "apply.joinNext": "是否参加最近一期",
      "apply.joinYes": "参加",
      "apply.joinNo": "不参加",
      "apply.intent": "下期参加意向（选填）",
      "apply.date": "日期",
      "apply.slot": "时段",
      "apply.area": "地点",
      "apply.intentHint": "选填。日期会随最近一期滚动更新；有意向时选大概方便的日期、时段和地点即可",
      "apply.contact": "联系方式（选填）",
      "apply.contactPh": "手机、邮箱或微信等",
      "apply.contactHint": "建议填写，方便组织者联系",
      "apply.topics": "想交流的方向（选填）",
      "apply.topic.extra": "也可手填，如 RAG、本地模型…",
      "apply.note": "补充说明（选填）",
      "apply.notePh": "如：可推荐场地/其他特殊要求等",
      "apply.submit": "提交意向",
      "apply.goLogin": "去登录",
      "apply.handle": "你的登录名",
      "apply.handleHint": "请先记下它。审核通过后组织者会私下发通行码，两者搭配登录。",
      "apply.submitting": "提交中…",
      "apply.needJoin": "请选择是否参加最近一期",
      "apply.submitted": "已提交",
      "login.title": "成员登录",
      "login.lead": "用申请时得到的登录名和组织者发放的通行码进入，即可查看自己参加过的期次完整纪要并留言。",
      "login.handle": "登录名 *",
      "login.handlePh": "申请成功后显示的登录名",
      "login.pass": "通行码 *",
      "login.passPh": "组织者私下告知",
      "login.submit": "登录",
      "login.applyFirst": "先去申请",
      "login.demo": "本地演示：登录名 demo_caster / 通行码 CAST-DEMO",
      "login.fillDemo": "一键填入",
      "login.filled": "已填入演示账号，点「登录」即可",
      "login.err": "登录暂不可用，请稍后重试，或确认通行码是否正确。",
      "login.ok": "已登录为 {name}，正在跳转…",
      "login.ing": "登录中…",
      "login.hi": "欢迎，{name}",
      "login.fail": "登录失败。请确认通过站点打开本页（不要直接双击 HTML）。",
      "g.back": "← 返回",
      "g.loading": "加载中…",
      "g.digest": "本期要点",
      "g.digestNote": "逐步实操、对照表、现场照片与留言板，仅对当期参会成员开放。",
      "g.lockTitle": "完整纪要需参会权限",
      "g.lockBody": "若你参加了本期，登录后可查看全文、现场照片，并在文末留言。",
      "g.lockLogin": "成员登录",
      "g.lockApply": "申请加入 / 报意向",
      "g.comments": "留言板",
      "g.commentsSub": "仅本期参会成员可见。友善交流，勿传播敏感操作细节到场外。",
      "g.commentPh": "写下一句想法、补充或感谢…",
      "g.commentSend": "发布留言",
      "g.commentEmpty": "还没有留言，来写第一条吧。",
      "g.sending": "发送中…",
      "g.posted": "已发布",
      "g.fail": "加载失败：",
      "g.photo": "现场照片",
      "g.close": "关闭",
      "g.prev": "上一张",
      "g.next": "下一张",
      "g.shot": "放大第 {n} 张",
      "g.shotAlt": "第一期现场 {n}",
      "g.offline": "当前为静态预览，未连上站点服务。完整纪要请通过站点登录查看。",
      "process.title": "赛博法师 AI技巧分享会流程",
      "process.meta": "线下 · 八人左右 · 90–120分钟",
      "process.k.theme": "会议主题",
      "process.v.theme": "AI技巧分享与共创",
      "process.k.size": "参会人数",
      "process.v.size": "8人左右",
      "process.k.time": "预计时长",
      "process.v.time": "90–120分钟",
      "process.k.form": "会议形式",
      "process.v.form": "线下",
      "process.h.prep": "会前准备",
      "process.prep.1": "每位参会人提前准备一个本人实际使用过、效果较好的AI技巧或完整方案。为避免给参会人带来压力，技巧和方案不限题材，亦无大小与高下之分，畅所欲言。",
      "process.prep.2": "分享内容可参考“应用场景—具体做法—实际效果—适用边界”的结构准备，必要时可以准备一张截图、一个示例或现场演示。",
      "process.prep.3": "由于可能涉及客户、项目、合同或其他敏感信息，除非征得分享人同意，不录屏、不拍照。",
      "process.h.agenda": "会议议程",
      "process.a1.h": "（一）开场及规则说明（5分钟）",
      "process.a1.p": "主持人简要说明本次分享会的目标和流程。如有新成员，快速介绍。",
      "process.a2.h": "（二）AI技巧或方案分享（60分钟）",
      "process.a2.p": "每位参会人依次分享一个实践效果最好的AI技巧或方案。建议按照以下结构展开：",
      "process.a2.1": "应用场景：原来遇到了什么问题，为什么需要使用AI；",
      "process.a2.2": "具体做法：使用了什么工具、提示词、工作流或操作步骤；",
      "process.a2.3": "实际效果：在时间、质量、准确性或工作体验方面带来了什么改善，可提供数据或前后对比；",
      "process.a2.4": "适用边界：当前方案仍存在哪些不足、风险，或者不适用于哪些场景；",
      "process.a2.5": "复用入口：如果其他人想尝试，最先可以从哪一步开始。",
      "process.a2.p2": "其他参会人可以将问题或感兴趣的内容记录，或与分享人进行机动讨论。",
      "process.a3.h": "（三）交叉评价与完善建议（45分钟）",
      "process.a3.p1": "全部方案分享完成后，请每位参会人独立选择除本人以外“最想尝试”的一个方案。",
      "process.a3.p2": "建议使用以下表达结构：",
      "process.a3.s1": "我最想尝试的是________的方案。",
      "process.a3.s2": "对我最有价值的地方是________。",
      "process.a3.s3": "我准备将它用于________场景。",
      "process.a3.s4": "我建议进一步增加、调整或验证________，因为________。",
      "process.a3.p3": "完善建议尽量落到具体动作，例如增加核验环节、明确适用条件、补充标准模板、简化操作步骤、设置效果指标或者加强数据安全控制，避免只提出“可以再优化”“可以更智能”等笼统意见。",
      "process.a3.p4": "被评价人可以作回应，说明是否采纳、需要进一步验证的事项或者必要的背景信息。",
      "process.a4.h": "（四）提问环节与总结（10分钟）",
      "process.a4.p1": "主持人选择一至两个被多次提及、对多数人有价值的问题进行集中讨论，每位参会人亦可提出自己的问题。",
      "process.a4.p2": "对于被多次选择、具有较高复用价值方案的分享人，由全体参会人表达感谢，并由分享人发表感想。",
      "process.a4.p3": "建议使用以下表达结构：",
      "process.a4.s1": "我分享这个技巧的心态是________。",
      "process.a4.s2": "进一步的规划和期待是________。",
      "process.a4.s3": "目前需要获得的支持是________。",
      "process.a4.s4": "希望在座各位做________。",
      "process.a4.p4": "主持人感谢全体参会人的分享，面对面建群，说明纪要预计发送时间，确定是否安排下一次会议。",
      "process.h.follow": "会后跟进",
      "process.f.1": "记录人在会后形成简要纪要。参会人可在微信群内对当期内容再次讨论，回访收集各方案的实际尝试结果，分享同步最新的AI资讯。",
      "process.f.2": "经验证有效的方案可以进一步整理为AI操作指引、标准提示词或工作流模板，使会议成果逐步沉淀为可复用的知识。",
      "lang.toEn": "Switch to English",
      "lang.toZh": "切换为中文",
      "theme.toDark": "切换为深色",
      "theme.toLight": "切换为浅色",
      "bgm": "背景音乐"
    },
    en: {
      "nav.home": "← Home",
      "nav.back": "← Back",
      "nav.login": "Have a passcode? Log in",
      "nav.apply": "No passcode yet? Apply",
      "hero.thesis": "AI skill gathering",
      "hero.join": "I want in",
      "hero.enter": "Enter",
      "hero.next": "Next",
      "tab.activity": "Activity",
      "tab.gallery": "Gallery",
      "tab.toolkit": "Toolkit",
      "tab.about": "About",
      "activity.lead": "Attendees can log in after each gathering to read the full notes and comment.",
      "activity.process": "How we run it",
      "gallery.lead": "A slot for members’ projects and personal sites. Apply to hang yours when it’s ready.",
      "toolkit.lead": "Tools discussed at gatherings, plus member notes.",
      "footer.copy": "© 2026 Cyber Casters",
      "upcoming": "Upcoming",
      "readNotes": "Read public notes",
      "applyJoin": "Apply to join",
      "open": "Open",
      "repo": "Repo",
      "go": "Go",
      "fromNotes": "From notes",
      "login": "Log in",
      "apply": "Apply",
      "logout": "Log out",
      "myNotes": "My notes",
      "admin": "admin",
      "toolkit.empty": "Tools from gatherings will be collected here as cards.",
      "toolkit.none": "No tools in this category yet.",
      "toolkit.filter": "Filter tools",
      "spells.title": "Field notes",
      "spells.lockTitle": "Field notes are members-only",
      "spells.lockBody": "Tool cards above are public. Practical notes unlock after you attend and log in.",
      "spells.login": "Member login",
      "spells.apply": "Apply to join",
      "wechat.pending": "Pending",
      "wechat.qr": "QR code pending",
      "cat.all": "All",
      "cat.desktop": "Desktop",
      "cat.coding": "Coding",
      "cat.capture": "Capture",
      "cat.document": "Docs",
      "cat.knowledge": "Knowledge",
      "cat.voice": "Voice",
      "spell.prod": "Product",
      "spell.tool": "Tool",
      "spell.method": "Method",
      "spell.exp": "Experience",
      "spell.pit": "Pitfall",
      "apply.title": "I want in · Cyber Casters",
      "apply.name": "What should we call you? *",
      "apply.namePh": "A nickname is fine",
      "apply.joinNext": "Join the next gathering",
      "apply.joinYes": "Yes",
      "apply.joinNo": "Not this one",
      "apply.intent": "Later gatherings (optional)",
      "apply.date": "Date",
      "apply.slot": "Time",
      "apply.area": "Area",
      "apply.intentHint": "Optional. Dates roll forward with the next gathering. Pick a rough date, slot, and area if you have a preference.",
      "apply.contact": "Contact (optional)",
      "apply.contactPh": "Phone, email, or WeChat",
      "apply.contactHint": "Recommended, so organizers can reach you.",
      "apply.topics": "Topics you’d like to talk about (optional)",
      "apply.topic.extra": "Or type your own, e.g. RAG, local models…",
      "apply.note": "Anything else (optional)",
      "apply.notePh": "Venue tips, constraints, etc.",
      "apply.submit": "Submit",
      "apply.goLogin": "Log in",
      "apply.handle": "Your login name",
      "apply.handleHint": "Save this. After review, organizers send a passcode privately. Use both to log in.",
      "apply.submitting": "Submitting…",
      "apply.needJoin": "Please choose whether you’ll join the next gathering.",
      "apply.submitted": "Submitted",
      "login.title": "Member login",
      "login.lead": "Use the login name from your application and the passcode from organizers to read notes from gatherings you attended, and to comment.",
      "login.handle": "Login name *",
      "login.handlePh": "Shown after your application is accepted",
      "login.pass": "Passcode *",
      "login.passPh": "Sent privately by organizers",
      "login.submit": "Log in",
      "login.applyFirst": "Apply first",
      "login.demo": "Local demo: login demo_caster / passcode CAST-DEMO",
      "login.fillDemo": "Fill demo",
      "login.filled": "Demo account filled. Hit Log in.",
      "login.err": "Login is unavailable right now. Try again later, or check the passcode.",
      "login.ok": "Signed in as {name}. Redirecting…",
      "login.ing": "Signing in…",
      "login.hi": "Welcome, {name}",
      "login.fail": "Login failed. Open this page via the site, not by double-clicking the HTML file.",
      "g.back": "← Back",
      "g.loading": "Loading…",
      "g.digest": "This gathering",
      "g.digestNote": "Walkthroughs, comparison tables, photos, and the comment board are for attendees of this gathering.",
      "g.lockTitle": "Full notes need attendee access",
      "g.lockBody": "If you were there, log in to read the full notes, photos, and to comment.",
      "g.lockLogin": "Member login",
      "g.lockApply": "Apply / register interest",
      "g.comments": "Comments",
      "g.commentsSub": "Visible to this gathering’s attendees. Be kind; don’t leak sensitive operational detail.",
      "g.commentPh": "A thought, addendum, or thanks…",
      "g.commentSend": "Post",
      "g.commentEmpty": "No comments yet. Write the first one.",
      "g.sending": "Sending…",
      "g.posted": "Posted",
      "g.fail": "Failed to load: ",
      "g.photo": "Photos",
      "g.close": "Close",
      "g.prev": "Previous",
      "g.next": "Next",
      "g.shot": "Enlarge photo {n}",
      "g.shotAlt": "Gathering 001 photo {n}",
      "g.offline": "Static preview — the API is not connected. Log in on the live site for full notes.",
      "process.title": "How a Cyber Casters skill gathering runs",
      "process.meta": "Offline · ~8 people · 90–120 minutes",
      "process.k.theme": "Theme",
      "process.v.theme": "AI skill sharing and co-creation",
      "process.k.size": "Size",
      "process.v.size": "About eight people",
      "process.k.time": "Length",
      "process.v.time": "90–120 minutes",
      "process.k.form": "Format",
      "process.v.form": "In person",
      "process.h.prep": "Before we meet",
      "process.prep.1": "Each person brings one AI skill or workflow they have actually used and found useful. No topic is too small. Speak freely.",
      "process.prep.2": "A useful shape: scenario → method → result → limits. A screenshot, example, or live demo helps.",
      "process.prep.3": "Client, project, or contract detail may come up. No recording or photos unless the speaker agrees.",
      "process.h.agenda": "Agenda",
      "process.a1.h": "(1) Opening and ground rules (5 min)",
      "process.a1.p": "The host states the goal and flow. New people get a quick intro.",
      "process.a2.h": "(2) Skill or workflow shares (60 min)",
      "process.a2.p": "Each person shares their best-working skill or workflow. Suggested shape:",
      "process.a2.1": "Scenario: what was stuck, and why AI entered the picture;",
      "process.a2.2": "Method: tools, prompts, workflows, or steps;",
      "process.a2.3": "Result: time, quality, accuracy, or how the work felt — numbers or before/after if you have them;",
      "process.a2.4": "Limits: what still fails, risks, or cases this does not fit;",
      "process.a2.5": "Reuse: if someone else wants to try, where should they start.",
      "process.a2.p2": "Others may note questions or talk with the speaker as we go.",
      "process.a3.h": "(3) Cross-critique (45 min)",
      "process.a3.p1": "After all shares, each person independently picks one other person’s workflow they most want to try.",
      "process.a3.p2": "Suggested phrasing:",
      "process.a3.s1": "The one I most want to try is ________.",
      "process.a3.s2": "The most valuable part for me is ________.",
      "process.a3.s3": "I would use it for ________.",
      "process.a3.s4": "I would add, change, or verify ________, because ________.",
      "process.a3.p3": "Make the suggestion a concrete action: a verification step, a precondition, a template, a simpler path, a metric, or a data-safety control. Avoid “make it smarter.”",
      "process.a3.p4": "The person being reviewed may respond: adopt, need to verify, or missing context.",
      "process.a4.h": "(4) Questions and close (10 min)",
      "process.a4.p1": "The host picks one or two questions that came up more than once. Anyone may also ask their own.",
      "process.a4.p2": "For a share that many people chose, the group thanks the speaker, who may say a few words.",
      "process.a4.p3": "Suggested phrasing:",
      "process.a4.s1": "I brought this skill because ________.",
      "process.a4.s2": "What I want to do next is ________.",
      "process.a4.s3": "Support I still need is ________.",
      "process.a4.s4": "What I’d like from the room is ________.",
      "process.a4.p4": "The host thanks everyone, we form a chat group in person, note when minutes should land, and whether to schedule the next gathering.",
      "process.h.follow": "After",
      "process.f.1": "A note-taker writes a short recap. The group can keep discussing in WeChat, follow up on what people actually tried, and share new AI notes.",
      "process.f.2": "Workflows that hold up can become guides, prompt packs, or templates — so the gathering compounds into reusable knowledge.",
      "lang.toEn": "Switch to English",
      "lang.toZh": "切换为中文",
      "theme.toDark": "Switch to dark",
      "theme.toLight": "Switch to light",
      "bgm": "Background music"
    }
  };

  const SELECT_EN = {
    工作日晚上: "Weeknight evening",
    周末上午: "Weekend morning",
    周末下午: "Weekend afternoon",
    周末晚上: "Weekend evening",
    周末全天: "Weekend all day",
    时间灵活: "Flexible",
    "南山·科技园": "Nanshan · Science Park",
    "南山·后海/深圳湾": "Nanshan · Houhai / Shenzhen Bay",
    "福田·车公庙": "Futian · Chegongmiao",
    "福田·CBD": "Futian · CBD",
    罗湖: "Luohu",
    "宝安·前海": "Bao’an · Qianhai",
    龙华: "Longhua",
    "龙岗/坂田": "Longgang / Bantan",
    香港: "Hong Kong",
    不限地点: "Anywhere"
  };

  const TOPIC_EN = {
    信息整理: "Information",
    "Skill 封装": "Skill packing",
    知识库: "Knowledge base",
    "多 Agent": "Multi-agent",
    会议纪要: "Minutes",
    写作排版: "Writing / layout"
  };

  const TITLE_EN = {
    "赛博法师 • 第二期AI交流会": "Cyber Casters · Gathering 002",
    "赛博法师 • 第一期AI交流会": "Cyber Casters · Gathering 001"
  };

  const ACTIVITY_EN = {
    "2026.08.20": "Gathering 002, still upcoming. 2026.08.20 19:00 · Shenzhen. Apply to join — bring a snag AI didn’t solve, or a small trick others probably don’t know.",
    "2026.07.24": "Gathering 001, in person. One hard problem AI didn’t finish for you, or a small trick you use that others probably don’t. Laptops open; same problem, different spells."
  };

  const TOPIC_BLURB_EN = {
    "01": ["Collecting and verifying information", "How to gather public sources, check them, and land them in a local library."],
    "02": ["Packing and managing Skills", "Turn experience into reusable Skills and store them in layers."],
    "03": ["Format and tool cost", "Markdown fits AI better; when Word is required, the tool choice changes cost a lot."],
    "04": ["Confidential notes, local first", "Redact at transcription. Then hand clean text to a model you trust."],
    "05": ["Audio and meeting notes", "How transcription, recorders, and everyday minutes connect."],
    "06": ["Voice input tools", "Speak to text; structure first, quality follows."],
    "07": ["Desktop collab and model switching", "Local folder collab; switch models inside the editor."],
    "08": ["Coding and multi-agent", "Skills and role split; the bottleneck is often requirements and tests."],
    "09": ["Cloud PCs / isolation", "Run assistants on an isolated host, still reachable when you’re out."],
    "10": ["Projects", "One space per project: background, files, memory."],
    "11": ["MCP for data sources", "Wire external data and tools; how far you get depends on how open the data is."],
    "12": ["Obsidian tricks", "Sync, templates, image archives, editor handoff."],
    "13": ["pandoc layout", "Mapping rules + a style template: Markdown to Word in one shot."],
    "14": ["Photos", "Snapshots from the night; the full set is attendees-only."]
  };

  const TOOL_EN = {
    "Claude Code": { label: "Coding", role: "CLI coding agent", desc: "Anthropic’s command-line coding agent: read the repo, edit files, run commands, close the loop in the terminal.", tags: ["coding", "Agent", "CLI"] },
    "Claude Desktop": { label: "Desktop", role: "Desktop agent", desc: "Anthropic desktop: chat, Cowork, and local collab in one place. Files and apps plug in.", tags: ["desktop", "Agent"] },
    Codex: { label: "Desktop", role: "Desktop agent", desc: "OpenAI Codex / ChatGPT: run several agents, review diffs, push across projects — not just a few patches.", tags: ["desktop", "Agent"] },
    Cubox: { label: "Capture", role: "Read-later / clipper", desc: "Drop links and clips into one inbox so they don’t vanish. One capture door from gathering 001.", tags: ["capture", "clip"] },
    Cursor: { label: "Coding", role: "AI code editor", desc: "Write, review diffs, and run agents in the IDE. Daily coding and multi-file edits.", tags: ["coding", "IDE", "Agent"] },
    Firecrawl: { label: "Capture", role: "Web crawl API", desc: "Search and crawl pages into clean Markdown / JSON for agent context.", tags: ["capture", "crawler", "API"] },
    MinerU: { label: "Docs", role: "Document parse", desc: "Turn PDF / Office / images into structured Markdown and JSON for RAG and agents.", tags: ["docs", "PDF"] },
    NotebookLM: { label: "Knowledge", role: "Source notebook", desc: "Google’s notebook: upload docs and links, then ask, summarize, and organize by source.", tags: ["knowledge", "Q&A"] },
    Obsidian: { label: "Knowledge", role: "Local knowledge base", desc: "Local Markdown as source of truth, easy for agents and scripts to read.", tags: ["knowledge", "local"] },
    OfficeCli: { label: "Docs", role: "Office from the CLI", desc: "Create, inspect, and patch docx / xlsx / pptx from the command line so an agent can read layout and charts.", tags: ["docs", "Office", "CLI"] },
    OpenCode: { label: "Coding", role: "Open-source coding agent", desc: "Open-source coding assistant for terminal / desktop / IDE. Many models; read, edit, run.", tags: ["coding", "Agent", "open source"] },
    Pandoc: { label: "Docs", role: "Format conversion", desc: "Compile Markdown (and more) to Word / PDF. Often paired with a reference.docx style file.", tags: ["docs", "CLI"] },
    Typeless: { label: "Voice", role: "Spoken structured input", desc: "Cross-app AI dictation that turns messy speech into structured text.", tags: ["voice", "IME"] },
    Whisper: { label: "Voice", role: "Local transcription", desc: "Open-source speech recognition. Transcribe locally, then let a model tidy it.", tags: ["voice", "local"] },
    Workbuddy: { label: "Desktop", role: "Desktop agent", desc: "Tencent’s all-scene AI workbench: research, docs, sheets, local files. Coding mode is one piece.", tags: ["desktop", "Agent"] },
    闪电说: { label: "Voice", role: "On-device Chinese voice input", desc: "Recognition can run locally. Short-press dumps speech into the field; long-press drafts a reply from context.", tags: ["voice", "IME", "local"] }
  };

  const ARTIFACT_EN = {
    name: "Open call",
    label: "Soon",
    role: "Member slot",
    desc: "For members’ projects, tools, or personal sites. Apply to hang yours when it’s ready.",
    tags: ["project", "site"]
  };

  const ABOUT_EN = {
    title: "Why Cyber Casters",
    lead: "We want a sincere, practical, open circle of people who already know each other a little. As AI moves fast and information piles up, we share, explore, turn anxiety into practice, and let scattered tricks become methods, products, and friendships.",
    principles: [
      { title: "Sync the picture, shrink the panic", body: "Party up. Trade notes. Understand the change with less noise and more action." },
      { title: "Share tricks that actually work", body: "Start from a real job. Can someone else reuse it? Does it save time? Skip the grand narrative; bring what you ran yourself." },
      { title: "Let products grow from real needs", body: "Mine pain from work and life, bounce product ideas, and bring industry / ops / user angles until a problem is worth solving." },
      { title: "Keep the room open and warm", body: "Invent, collaborate, open-source. No preaching, no funnels, no selling. Leave with skills — and with people who sharpen you." }
    ]
  };

  const CHANNEL_EN = [
    { name: "I want in", note: "Leave a name and intent. After review you get a login name and passcode.", cta: "Apply" },
    { name: "Member login", note: "Use your login name and passcode for notes and comments.", cta: "Log in" }
  ];

  const WECHAT_EN = {
    title: "WeChat group",
    note: "QR pending. Apply and leave a contact if you want in the group."
  };

  const SPELL_EN = [
    {
      group: "Format and layout",
      items: [
        { t: "Put the conclusion here", d: "MD / HTML fit AI; Word does not. If you must use Word, don’t unzip it." },
        { t: "Let reference.docx own style", d: "pandoc plus a style-only template: content and layout stay decoupled." },
        { t: "A cost test", d: "The same Word chunk can cost tens of times more tokens on the wrong path; daily reports add up over a year." },
        { t: "Pitfall", d: "pandoc defaults can watermark output; override with a reference doc." }
      ]
    },
    {
      group: "Packing Skills",
      items: [
        { t: "A Skill is distilled experience", d: "It’s markdown. It travels across tools." },
        { t: "Layer them", d: "Project vs system. When there are many, hang a map so the model learns to call them." },
        { t: "Don’t copy someone else’s", d: "Format, taste, and rigor differ. Internet Skills rarely drop in unchanged." }
      ]
    },
    {
      group: "Secrecy and local-first",
      items: [
        { t: "Redact at transcription", d: "Speech-to-text locally, then a trusted model for structured notes." },
        { t: "Local recognition is enough", d: "A bit less accurate than the cloud; later cleanup recovers some of it." }
      ]
    }
  ];

  function readLang() {
    try {
      const q = new URLSearchParams(location.search).get("lang");
      if (q === EN || q === ZH) return q;
    } catch (_) {}
    try {
      const v = localStorage.getItem(KEY);
      if (v === EN || v === ZH) return v;
    } catch (_) {}
    return ZH;
  }

  function writeLang(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (_) {}
  }

  function lang() {
    return document.documentElement.dataset.lang === EN ? EN : ZH;
  }

  function isEn() {
    return lang() === EN;
  }

  function t(key, vars) {
    const pack = STR[lang()] || STR.zh;
    let s = pack[key];
    if (s == null) s = STR.zh[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return s;
  }

  function mapSelect(value) {
    if (!isEn()) return value;
    if (SELECT_EN[value]) return SELECT_EN[value];
    return periodLabel(value);
  }

  function periodLabel(raw) {
    const s = String(raw || "");
    if (!isEn()) return s;
    return s
      .replace(/上旬/g, " early")
      .replace(/中旬/g, " mid")
      .replace(/下旬/g, " late")
      .replace(/时间灵活/g, "Flexible");
  }

  function topicLabel(v) {
    if (!isEn()) return v;
    return TOPIC_EN[v] || v;
  }

  function localizeItem(g) {
    if (!g) return g;
    const out = { ...g };
    if (isEn()) {
      if (out.mode && MODE[out.mode]) out.mode = MODE[out.mode];
      if (out.place && PLACE[out.place]) out.place = PLACE[out.place];
      if (out.title && TITLE_EN[out.title]) out.title = TITLE_EN[out.title];
      const descKey = out.date || "";
      if (ACTIVITY_EN[descKey] && (out.desc || out.summary)) {
        if (out.desc) out.desc = ACTIVITY_EN[descKey];
        if (out.summary) out.summary = ACTIVITY_EN[descKey];
      }
      if (out.status === "upcoming" || out.label === "待举办") out.label = t("upcoming");
      if (out.linkText === "阅读公开纪要" || (!out.status || out.status === "past") && out.link) {
        if (out.linkText) out.linkText = t("readNotes");
      }
      if (Array.isArray(out.topics)) {
        out.topics = out.topics.map((tp) => {
          const tr = TOPIC_BLURB_EN[tp.no];
          if (!tr) return tp;
          return { ...tp, title: tr[0], blurb: tr[1] };
        });
      }
    }
    return out;
  }

  function data() {
    const src = window.DATA || {};
    if (!isEn()) return src;
    const tools = (src.tools || []).map((tool) => {
      const tr = TOOL_EN[tool.name];
      if (!tr) {
        return { ...tool, label: t("cat." + tool.cat) || tool.label, linkText: tool.linkText === "仓库" ? t("repo") : t("open") };
      }
      return {
        ...tool,
        label: tr.label,
        role: tr.role,
        desc: tr.desc,
        tags: tr.tags,
        linkText: tool.linkText === "仓库" ? t("repo") : t("open")
      };
    });
    const artifacts = (src.artifacts || []).map((a) => ({
      ...a,
      name: ARTIFACT_EN.name,
      label: ARTIFACT_EN.label,
      role: ARTIFACT_EN.role,
      desc: ARTIFACT_EN.desc,
      tags: ARTIFACT_EN.tags
    }));
    const toolCats = (src.toolCats || []).map((c) => ({
      ...c,
      name: t("cat." + c.k) || c.name
    }));
    const activity = (src.activity || []).map(localizeItem);
    const spells = (src.spells || []).map((g, i) => {
      const tr = SPELL_EN[i];
      if (!tr) return g;
      return {
        ...g,
        group: tr.group,
        items: g.items.map((it, j) => ({
          ...it,
          t: tr.items[j]?.t || it.t,
          d: tr.items[j]?.d || it.d
        }))
      };
    });
    const channels = (src.channels || []).map((c, i) => ({
      ...c,
      name: CHANNEL_EN[i]?.name || c.name,
      note: CHANNEL_EN[i]?.note || c.note,
      cta: CHANNEL_EN[i]?.cta || c.cta
    }));
    return {
      ...src,
      activity,
      artifacts,
      tools,
      toolCats,
      spells,
      about: ABOUT_EN,
      channels,
      wechatCommunity: { ...src.wechatCommunity, ...WECHAT_EN }
    };
  }

  function applyDom(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = t(key);
      if (el.getAttribute("data-i18n-html") === "1") el.innerHTML = val;
      else el.textContent = val;
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    scope.querySelectorAll("select option").forEach((opt) => {
      const v = opt.value;
      if (!v) {
        if (opt.parentElement && opt.parentElement.id === "intentPeriod") opt.textContent = t("apply.date");
        else if (opt.parentElement && opt.parentElement.id === "intentSlot") opt.textContent = t("apply.slot");
        else if (opt.parentElement && opt.parentElement.id === "intentArea") opt.textContent = t("apply.area");
        return;
      }
      opt.textContent = mapSelect(v);
    });
    scope.querySelectorAll("#topicChips .choice-face").forEach((span) => {
      const input = span.parentElement && span.parentElement.querySelector("input");
      if (input) span.textContent = topicLabel(input.value);
    });
    const joinYes = scope.querySelector('input[name="joinNext"][value="参加"]');
    if (joinYes) {
      const face = joinYes.parentElement.querySelector(".choice-face");
      if (face) face.textContent = t("apply.joinYes");
    }
    const joinNo = scope.querySelector('input[name="joinNext"][value="不参加"]');
    if (joinNo) {
      const face = joinNo.parentElement.querySelector(".choice-face");
      if (face) face.textContent = t("apply.joinNo");
    }
  }

  function apply(next) {
    const langNow = next === EN || next === ZH ? next : readLang();
    const root = document.documentElement;
    root.dataset.lang = langNow;
    root.lang = langNow === EN ? "en" : "zh-CN";
    applyDom(document);
    syncBtn();
    if (CC.Theme && typeof CC.Theme.apply === "function") {
      try { CC.Theme.apply(CC.Theme.readPref()); } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent("cc:lang", { detail: { lang: langNow } }));
    return langNow;
  }

  function setLang(next) {
    const langNow = next === EN ? EN : ZH;
    writeLang(langNow);
    return apply(langNow);
  }

  function toggle() {
    return setLang(isEn() ? ZH : EN);
  }

  function syncBtn() {
    const en = isEn();
    document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
      btn.textContent = en ? "中" : "EN";
      btn.setAttribute("aria-label", en ? t("lang.toZh") : t("lang.toEn"));
      btn.title = en ? t("lang.toZh") : t("lang.toEn");
      btn.setAttribute("aria-pressed", en ? "true" : "false");
    });
    document.querySelectorAll("#bgmBtn").forEach((btn) => {
      btn.setAttribute("aria-label", t("bgm"));
      btn.title = t("bgm");
    });
  }

  function ensureToggle() {
    if (document.querySelector("[data-lang-toggle]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "langBtn";
    btn.dataset.langToggle = "";
    btn.textContent = "EN";
    document.body.appendChild(btn);
  }

  function bind() {
    if (bind._done) return;
    bind._done = true;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang-toggle]");
      if (!btn) return;
      e.preventDefault();
      toggle();
    });
  }

  function init() {
    ensureToggle();
    apply(readLang());
    bind();
  }

  return {
    KEY,
    t,
    lang,
    isEn,
    data,
    localizeItem,
    periodLabel,
    topicLabel,
    mapSelect,
    applyDom,
    apply,
    setLang,
    toggle,
    init
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CC.I18N.init());
} else {
  CC.I18N.init();
}
