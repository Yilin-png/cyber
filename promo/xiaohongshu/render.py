#!/usr/bin/env python3
"""赛博法师 · 小红书 3:4 宣传图（1242×1660）"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent
W, H = 1242, 1660
SCALE = 2
CW, CH = W * SCALE, H * SCALE

VOID = (7, 6, 14, 255)
CYAN = (63, 224, 208, 255)
ARCANE = (157, 107, 255, 255)
GOLD = (240, 192, 112, 255)
PAPER = (236, 232, 250, 255)
BODY = (185, 179, 212, 255)
ASH = (142, 136, 174, 255)
LINE = (42, 33, 80, 255)
PANEL = (16, 12, 33, 230)
FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
APPLY = "cyber-casters.com/apply.html"
PAD = 88 * SCALE


def font(size: int):
    return ImageFont.truetype(FONT, size * SCALE)


def canvas():
    img = Image.new("RGBA", (CW, CH), VOID)
    px = img.load()
    cx, cy = CW / 2, CH * 0.22
    for y in range(CH):
        for x in range(0, CW, 2):
            dx = (x - cx) / (CW * 0.62)
            dy = (y - cy) / (CH * 0.48)
            r2 = dx * dx + dy * dy
            glow = max(0.0, 1.0 - r2) ** 2
            p = int(24 * glow)
            c = int(10 * glow)
            v = int(16 * glow)
            px[x, y] = (7 + p, 6 + c, 14 + v + p, 255)
            if x + 1 < CW:
                px[x + 1, y] = px[x, y]
    rng = random.Random(32)
    for _ in range(9000):
        x = rng.randrange(CW)
        y = rng.randrange(CH)
        n = rng.randint(6, 18)
        r, g, b, a = px[x, y]
        px[x, y] = (min(255, r + n), min(255, g + n), min(255, b + n), a)
    return img


def draw_frame(draw: ImageDraw.ImageDraw):
    p = 56 * SCALE
    draw.rectangle([p, p, CW - p, CH - p], outline=LINE, width=2 * SCALE)
    tick = 18 * SCALE
    for x, y, dx, dy in (
        (p, p, 1, 0), (p, p, 0, 1),
        (CW - p, p, -1, 0), (CW - p, p, 0, 1),
        (p, CH - p, 1, 0), (p, CH - p, 0, -1),
        (CW - p, CH - p, -1, 0), (CW - p, CH - p, 0, -1),
    ):
        draw.line([x, y, x + dx * tick, y + dy * tick], fill=CYAN, width=3 * SCALE)


def hexagram_mask(cx, cy, r):
    up = [
        (cx, cy - r),
        (cx + r * 0.866, cy + r * 0.5),
        (cx - r * 0.866, cy + r * 0.5),
    ]
    down = [
        (cx, cy + r),
        (cx - r * 0.866, cy - r * 0.5),
        (cx + r * 0.866, cy - r * 0.5),
    ]
    a = Image.new("L", (CW, CH), 0)
    b = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(a).polygon(up, fill=255)
    ImageDraw.Draw(b).polygon(down, fill=255)
    return ImageChops.difference(a, b).filter(ImageFilter.SMOOTH)


def paste_hexagram(base: Image.Image, cx, cy, r, color=ARCANE):
    mask = hexagram_mask(cx, cy, r)
    layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    layer.paste(Image.new("RGBA", (CW, CH), color), mask=mask)
    d = ImageDraw.Draw(layer)
    for i in range(6):
        ang = math.radians(-90 + i * 60)
        x = cx + r * math.cos(ang)
        y = cy + r * math.sin(ang)
        d.ellipse([x - 4 * SCALE, y - 4 * SCALE, x + 4 * SCALE, y + 4 * SCALE], fill=CYAN)
    return Image.alpha_composite(base, layer)


def tw(draw, s, fnt):
    b = draw.textbbox((0, 0), s, font=fnt)
    return b[2] - b[0]


def th(draw, s, fnt):
    b = draw.textbbox((0, 0), s, font=fnt)
    return b[3] - b[1]


def center_text(draw, y, s, fnt, fill, tracking=0):
    if tracking:
        w = sum(tw(draw, ch, fnt) for ch in s) + tracking * (len(s) - 1)
        x = (CW - w) / 2
        for ch in s:
            draw.text((x, y), ch, font=fnt, fill=fill)
            x += tw(draw, ch, fnt) + tracking
        return
    draw.text(((CW - tw(draw, s, fnt)) / 2, y), s, font=fnt, fill=fill)


def wrap(draw, text, fnt, max_w):
    lines = []
    for para in text.split("\n"):
        line = ""
        for ch in para:
            trial = line + ch
            if tw(draw, trial, fnt) <= max_w:
                line = trial
            else:
                if line:
                    lines.append(line)
                line = ch
        if line:
            lines.append(line)
    return lines


def draw_wrapped(draw, x, y, text, fnt, fill, max_w, leading=1.35):
    lines = wrap(draw, text, fnt, max_w)
    lh = int(th(draw, "字", fnt) * leading)
    for i, line in enumerate(lines):
        draw.text((x, y + i * lh), line, font=fnt, fill=fill)
    return y + len(lines) * lh


def chip(draw, x, y, w, h, title, body):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=14 * SCALE, outline=LINE, width=2 * SCALE)
    draw.text((x + 22 * SCALE, y + 16 * SCALE), title, font=font(20), fill=CYAN)
    draw_wrapped(draw, x + 22 * SCALE, y + 50 * SCALE, body, font(22), PAPER, w - 44 * SCALE, 1.32)


def footer_apply(draw, y=None):
    y = y if y is not None else CH - 118 * SCALE
    center_text(draw, y, "联系报名  ·  " + APPLY, font(22), CYAN)


def finish(img: Image.Image, name: str):
    out = img.resize((W, H), Image.Resampling.LANCZOS).convert("RGB")
    path = OUT / name
    out.save(path, "PNG", optimize=True)
    art = Path("/opt/cursor/artifacts/xiaohongshu") / name
    art.parent.mkdir(parents=True, exist_ok=True)
    out.save(art, "PNG", optimize=True)
    print("wrote", path)


def poster_cover():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    img = paste_hexagram(img, CW - 168 * SCALE, 168 * SCALE, 48 * SCALE)
    d = ImageDraw.Draw(img)

    d.text((PAD, 108 * SCALE), "CYBER CASTERS", font=font(18), fill=CYAN)
    d.text((PAD, 148 * SCALE), "赛博法师", font=font(56), fill=PAPER)
    d.text((PAD, 228 * SCALE), "深圳法律人的 AI 技巧交流会", font=font(28), fill=GOLD)
    d.text((PAD, 276 * SCALE), "每月一次 · 线下小局 · 打开电脑互相修炼", font=font(22), fill=BODY)

    facts = [
        ("频率", "每月一次，深圳线下"),
        ("规模", "八人左右，熟人小局"),
        ("时长", "九十分钟至两小时"),
        ("形式", "不讲课 / 不录屏 / 不变现"),
        ("带什么", "一件真难事，或一个真技巧"),
        ("结构", "场景 — 做法 — 效果 — 边界"),
    ]
    gap = 16 * SCALE
    col_w = (CW - PAD * 2 - gap) // 2
    row_h = 118 * SCALE
    y0 = 340 * SCALE
    for i, (t, b) in enumerate(facts):
        col = i % 2
        row = i // 2
        chip(d, PAD + col * (col_w + gap), y0 + row * (row_h + gap), col_w, row_h, t, b)

    y = y0 + 3 * (row_h + gap) + 8 * SCALE
    d.text((PAD, y), "法律场景常聊", font=font(20), fill=GOLD)
    tags = "文书格式  ·  Skill 封装  ·  本地转写脱敏  ·  知识库  ·  检索  ·  会议纪要  ·  Word/Markdown 效率账"
    y = draw_wrapped(d, PAD, y + 40 * SCALE, tags, font(24), PAPER, CW - PAD * 2, 1.4)

    y += 28 * SCALE
    d.rounded_rectangle(
        [PAD, y, CW - PAD, y + 168 * SCALE],
        radius=16 * SCALE, outline=CYAN, width=3 * SCALE,
    )
    d.text((PAD + 28 * SCALE, y + 22 * SCALE), "联系报名", font=font(20), fill=GOLD)
    d.text((PAD + 28 * SCALE, y + 58 * SCALE), APPLY, font=font(28), fill=PAPER)
    d.text((PAD + 28 * SCALE, y + 108 * SCALE), "留下称呼、方向和方便的时段地点，审核后联系。", font=font(22), fill=BODY)
    finish(img, "01-cover.png")


def poster_who():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    d.text((PAD, 108 * SCALE), "WHO", font=font(18), fill=CYAN)
    d.text((PAD, 146 * SCALE), "写给深圳法律人", font=font(44), fill=PAPER)
    d.text((PAD, 214 * SCALE), "已经在用 AI，但卡在文书、检索、脱敏和本地化。不是零基础科普。", font=font(22), fill=BODY)

    items = [
        ("01  律师 / 法律顾问", [
            "检索、比对、结构，每天都在和文字较劲",
            "网上 Skill 很难套进自己的格式与严谨度",
            "要的是能复用的做法，不是概念课",
        ]),
        ("02  公司法务 / 合规", [
            "合同、制度、纪要要快，又不能把客户材料上云",
            "脱敏发生在转写那一步，能本地就本地",
            "制度与模板要能改、能核、能沉淀",
        ]),
        ("03  研究 / 仲裁 / 投行法务", [
            "公开资料要能采、能核、接到自己的本地库",
            "案例数据不开放，更要会自己搭工作流",
            "日报、行研、知识库怎么串起来",
        ]),
        ("04  已经动手的人", [
            "带一件 AI 没搞定的难事，或一个别人不知道的小技巧",
            "现场打开电脑对照，同题异解",
            "纪要只对参会成员开放",
        ]),
    ]
    y = 280 * SCALE
    box_h = 268 * SCALE
    for title, bullets in items:
        d.rounded_rectangle(
            [PAD, y, CW - PAD, y + box_h],
            radius=14 * SCALE, outline=LINE, width=2 * SCALE,
        )
        d.rectangle([PAD, y, PAD + 10 * SCALE, y + box_h], fill=ARCANE)
        d.text((PAD + 28 * SCALE, y + 18 * SCALE), title, font=font(28), fill=PAPER)
        by = y + 68 * SCALE
        for b in bullets:
            d.text((PAD + 28 * SCALE, by), "▸  " + b, font=font(22), fill=BODY)
            by += 58 * SCALE
        y += box_h + 16 * SCALE
    footer_apply(d)
    finish(img, "02-who.png")


def poster_how():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    d.text((PAD, 108 * SCALE), "HOW", font=font(18), fill=CYAN)
    d.text((PAD, 146 * SCALE), "一个月一次，怎么开", font=font(42), fill=PAPER)
    d.text((PAD, 210 * SCALE), "深圳线下  ·  八人左右  ·  约两小时  ·  不讲课 / 不录屏 / 不变现", font=font(20), fill=GOLD)

    rows = [
        ("01 会前", "每人准备一个本人用过、有效果的技巧或方案。不限题材、不论大小。建议按「应用场景—具体做法—实际效果—适用边界」准备，可带一张截图或现场演示。涉及客户与合同，除非本人同意，不录屏、不拍照。"),
        ("02 分享 60′", "依次讲：原来卡在哪、用了什么工具/提示词/工作流、时间与质量有何变化、哪里不能用、别人想试从哪一步开始。可机动提问。"),
        ("03 交叉 45′", "每人选一个「最想尝试」的他人方案：最有价值的点、准备用在哪、建议补核验/模板/安全边界的哪一步。落到具体动作，不说「可以更智能」。"),
        ("04 收束 10′", "集中讨论被多次提到的问题。有效方案会后整理成操作指引、提示词或工作流。参会人可继续在群里回访效果。"),
    ]
    y = 268 * SCALE
    for title, body in rows:
        d.text((PAD, y), title, font=font(26), fill=CYAN)
        y = draw_wrapped(d, PAD, y + 42 * SCALE, body, font(22), PAPER, CW - PAD * 2, 1.38)
        y += 28 * SCALE
        d.line([PAD, y, CW - PAD, y], fill=LINE, width=2 * SCALE)
        y += 22 * SCALE
    footer_apply(d)
    finish(img, "03-how.png")


def poster_legal():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    d.text((PAD, 108 * SCALE), "FIELD NOTES", font=font(18), fill=CYAN)
    d.text((PAD, 146 * SCALE), "法律场景，现场在聊这些", font=font(38), fill=PAPER)
    d.text((PAD, 208 * SCALE), "不是公开课提纲。是深圳局里已经对照过的真问题。", font=font(22), fill=BODY)

    left = [
        ("Skill 自己蒸馏", "法律研究的格式、审美、严谨度因人而异，网上模板很难原样套。经验写成 markdown，跨工具通用。"),
        ("文书效率账", "Markdown 更适 AI。非用 Word 不可时，选对工具，成本和错误率可差一个数量级。"),
        ("保密与本地化", "脱敏发生在转写那一步。能本地完成的，就不把原文送上云。"),
        ("知识库 / 检索", "公开资料怎么采、怎么核、怎么接到本地。案例数据不开放，更要自己搭工作流。"),
    ]
    right = [
        ("会议纪要", "录音、转写、结构化。先有结构，再交给可信模型整理。"),
        ("提示词不够用", "真正难的是流程：核验环节、适用条件、标准模板、效果指标。"),
        ("多 Agent / 协作", "瓶颈常在需求和测试，不在多开几个窗口。"),
        ("可复用才算数", "会后把有效方案沉淀成指引，而不是金句。纪要仅参会成员可见。"),
    ]
    gap = 16 * SCALE
    col_w = (CW - PAD * 2 - gap) // 2
    box_h = 268 * SCALE
    y0 = 268 * SCALE
    for col, block in enumerate((left, right)):
        y = y0
        x = PAD + col * (col_w + gap)
        for title, body in block:
            d.rounded_rectangle([x, y, x + col_w, y + box_h], radius=12 * SCALE, outline=LINE, width=2 * SCALE)
            d.text((x + 20 * SCALE, y + 16 * SCALE), title, font=font(24), fill=CYAN)
            draw_wrapped(d, x + 20 * SCALE, y + 62 * SCALE, body, font(21), PAPER, col_w - 40 * SCALE, 1.36)
            y += box_h + gap
    footer_apply(d)
    finish(img, "04-legal.png")


def poster_apply():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    img = paste_hexagram(img, CW - 156 * SCALE, 156 * SCALE, 42 * SCALE)
    d = ImageDraw.Draw(img)

    d.text((PAD, 108 * SCALE), "JOIN", font=font(18), fill=CYAN)
    d.text((PAD, 146 * SCALE), "一个月一次，联系报名", font=font(40), fill=PAPER)
    d.text((PAD, 214 * SCALE), "深圳线下熟人小局。留下意向即可，不用等某一场通知。", font=font(22), fill=BODY)

    steps = [
        ("01", "打开报名页", APPLY),
        ("02", "填写称呼", "昵称即可。建议留下手机、邮箱或微信，方便联系。"),
        ("03", "写下意向", "方便的时段、地点（南山 / 福田 / 前海等），以及想交流的方向：信息整理、Skill、知识库、纪要、多 Agent。"),
        ("04", "等待联系", "审核后组织者私下发登录名和通行码，用来看参会纪要。"),
    ]
    y = 276 * SCALE
    for no, title, body in steps:
        d.text((PAD, y), no, font=font(22), fill=GOLD)
        d.text((PAD + 70 * SCALE, y - 4 * SCALE), title, font=font(28), fill=PAPER)
        y = draw_wrapped(d, PAD + 70 * SCALE, y + 42 * SCALE, body, font(22), BODY, CW - PAD * 2 - 70 * SCALE, 1.36)
        y += 26 * SCALE

    box_y = y + 8 * SCALE
    d.rounded_rectangle(
        [PAD, box_y, CW - PAD, box_y + 220 * SCALE],
        radius=16 * SCALE, outline=CYAN, width=3 * SCALE,
    )
    d.text((PAD + 28 * SCALE, box_y + 24 * SCALE), "报名页（也请贴到评论区）", font=font(20), fill=GOLD)
    d.text((PAD + 28 * SCALE, box_y + 68 * SCALE), APPLY, font=font(30), fill=PAPER)
    draw_wrapped(
        d,
        PAD + 28 * SCALE,
        box_y + 122 * SCALE,
        "每月一次，深圳。不讲课、不录屏、不变现。带一件真事来。",
        font(22), BODY, CW - PAD * 2 - 56 * SCALE, 1.36,
    )
    finish(img, "05-apply.png")


def main():
    poster_cover()
    poster_who()
    poster_how()
    poster_legal()
    poster_apply()


if __name__ == "__main__":
    main()
