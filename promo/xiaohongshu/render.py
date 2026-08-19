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
FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"


def font(size: int):
    return ImageFont.truetype(FONT, size * SCALE)


def lerp(a, b, t):
    return a + (b - a) * t


def canvas():
    img = Image.new("RGBA", (CW, CH), VOID)
    px = img.load()
    # 中心紫青辉光
    cx, cy = CW / 2, CH * 0.38
    for y in range(CH):
        for x in range(0, CW, 2):
            dx = (x - cx) / (CW * 0.55)
            dy = (y - cy) / (CH * 0.55)
            r2 = dx * dx + dy * dy
            glow = max(0.0, 1.0 - r2)
            glow *= glow
            v = int(18 * glow)
            p = int(28 * glow)
            c = int(12 * glow)
            px[x, y] = (7 + p, 6 + c, 14 + v + p, 255)
            if x + 1 < CW:
                px[x + 1, y] = px[x, y]
    # 细颗粒
    rng = random.Random(32)
    for _ in range(14000):
        x = rng.randrange(CW)
        y = rng.randrange(CH)
        n = rng.randint(8, 22)
        r, g, b, a = px[x, y]
        px[x, y] = (min(255, r + n), min(255, g + n), min(255, b + n), a)
    return img


def draw_frame(draw: ImageDraw.ImageDraw, pad=72):
    p = pad * SCALE
    # 外框
    draw.rectangle([p, p, CW - p, CH - p], outline=LINE, width=2 * SCALE)
    tick = 22 * SCALE
    for x, y, dx, dy in (
        (p, p, 1, 0),
        (p, p, 0, 1),
        (CW - p, p, -1, 0),
        (CW - p, p, 0, 1),
        (p, CH - p, 1, 0),
        (p, CH - p, 0, -1),
        (CW - p, CH - p, -1, 0),
        (CW - p, CH - p, 0, -1),
    ):
        draw.line([x, y, x + dx * tick, y + dy * tick], fill=CYAN, width=3 * SCALE)


def draw_rings(draw: ImageDraw.ImageDraw, cx, cy, radii, color, width=1):
    for r in radii:
        bbox = [cx - r, cy - r, cx + r, cy + r]
        draw.ellipse(bbox, outline=color, width=width * SCALE)


def hexagram_mask(cx, cy, r):
    """两三角 XOR，得到中空六芒星。"""
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
    xor = ImageChops.difference(a, b)
    return xor.filter(ImageFilter.SMOOTH)


def paste_hexagram(base: Image.Image, cx, cy, r, color):
    mask = hexagram_mask(cx, cy, r)
    layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    solid = Image.new("RGBA", (CW, CH), color)
    layer.paste(solid, mask=mask)
    # 顶点
    d = ImageDraw.Draw(layer)
    pts = []
    for i in range(6):
        ang = math.radians(-90 + i * 60)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    for x, y in pts:
        d.ellipse([x - 5 * SCALE, y - 5 * SCALE, x + 5 * SCALE, y + 5 * SCALE], fill=CYAN)
    return Image.alpha_composite(base, layer)


def text_w(draw, s, fnt):
    b = draw.textbbox((0, 0), s, font=fnt)
    return b[2] - b[0]


def center_text(draw, y, s, fnt, fill, tracking=0):
    if tracking:
        w = sum(text_w(draw, ch, fnt) for ch in s) + tracking * (len(s) - 1)
        x = (CW - w) / 2
        for ch in s:
            draw.text((x, y), ch, font=fnt, fill=fill)
            x += text_w(draw, ch, fnt) + tracking
        return
    w = text_w(draw, s, fnt)
    draw.text(((CW - w) / 2, y), s, font=fnt, fill=fill)


def left_text(draw, x, y, s, fnt, fill):
    draw.text((x * SCALE, y), s, font=fnt, fill=fill)


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
    cx, cy = CW / 2, CH * 0.40
    draw_rings(d, cx, cy, [210 * SCALE, 268 * SCALE, 340 * SCALE], (*CYAN[:3],), 1)
    # 淡紫环
    faint = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    fd = ImageDraw.Draw(faint)
    draw_rings(fd, cx, cy, [180 * SCALE], ARCANE, 2)
    img = Image.alpha_composite(img, faint)
    img = paste_hexagram(img, cx, cy, 132 * SCALE, ARCANE)
    d = ImageDraw.Draw(img)

    center_text(d, 118 * SCALE, "GATHERING  002", font(22), CYAN, tracking=8 * SCALE)
    center_text(d, 1080 * SCALE, "赛博法师", font(92), PAPER)
    center_text(d, 1200 * SCALE, "CYBER CASTERS", font(28), ARCANE, tracking=10 * SCALE)
    center_text(d, 1288 * SCALE, "深圳法律人的 AI 线下局", font(36), GOLD)
    center_text(d, 1372 * SCALE, "第二期  ·  8人小局  ·  打开电脑", font(26), BODY)
    center_text(d, 1488 * SCALE, "2026.08.20  19:00  ·  深圳", font(24), CYAN)
    finish(img, "01-cover.png")


def poster_who():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    center_text(d, 130 * SCALE, "WHO", font(20), CYAN, tracking=14 * SCALE)
    center_text(d, 186 * SCALE, "写给谁", font(64), PAPER)

    items = [
        ("01", "律师 / 法律顾问", "检索、比对、文书结构，每天都在和文字较劲。"),
        ("02", "公司法务 / 合规", "合同、制度、纪要要快，但不能把客户信息喂给云端。"),
        ("03", "研究 / 仲裁 / 投行法务", "公开资料能采、能核、能接到自己的本地库。"),
        ("04", "已经在用 AI", "不是零基础科普。带一件真事来，现场对照。"),
    ]
    y = 340 * SCALE
    f_no = font(28)
    f_t = font(36)
    f_b = font(24)
    for no, title, body in items:
        d.rectangle(
            [140 * SCALE, y, 160 * SCALE, y + 148 * SCALE],
            fill=ARCANE,
        )
        d.text((188 * SCALE, y + 8 * SCALE), no, font=f_no, fill=CYAN)
        d.text((188 * SCALE, y + 44 * SCALE), title, font=f_t, fill=PAPER)
        d.text((188 * SCALE, y + 96 * SCALE), body, font=f_b, fill=BODY)
        y += 196 * SCALE

    center_text(d, 1508 * SCALE, "深圳 · 线下 · 熟人小局", font(24), GOLD)
    finish(img, "02-who.png")


def poster_how():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    center_text(d, 130 * SCALE, "HOW", font(20), CYAN, tracking=14 * SCALE)
    center_text(d, 186 * SCALE, "怎么开", font(64), PAPER)
    center_text(d, 280 * SCALE, "不讲课  ·  不录屏  ·  不变现", font(26), GOLD)

    blocks = [
        ("带一件真事", "一件 AI 没能替你搞定的难事，\n或一个你自己顺手、别人多半不知道的小技巧。"),
        ("打开电脑", "同题异解，互相修炼。\n建议按「场景—做法—效果—边界」讲清楚。"),
        ("八人左右", "90–120 分钟。先分享，再交叉评价，\n把能复用的沉淀成方法，而不是金句。"),
        ("法律场景可谈", "文书格式、Skill 封装、本地转写脱敏、\n知识库与检索。敏感信息现场不外传。"),
    ]
    y = 360 * SCALE
    for title, body in blocks:
        d.line(
            [160 * SCALE, y, 1082 * SCALE, y],
            fill=LINE,
            width=2 * SCALE,
        )
        d.text((160 * SCALE, y + 24 * SCALE), title, font=font(36), fill=CYAN)
        d.multiline_text(
            (160 * SCALE, y + 80 * SCALE),
            body,
            font=font(26),
            fill=BODY,
            spacing=10 * SCALE,
        )
        y += 260 * SCALE
    finish(img, "03-how.png")


def poster_legal():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    cx, cy = CW / 2, 430 * SCALE
    draw_rings(d, cx, cy, [150 * SCALE, 200 * SCALE], (*CYAN[:3],), 1)
    img = paste_hexagram(img, cx, cy, 92 * SCALE, ARCANE)
    d = ImageDraw.Draw(img)

    center_text(d, 130 * SCALE, "NOTES  ·  001", font(20), CYAN, tracking=8 * SCALE)
    center_text(d, 580 * SCALE, "第一期已经在聊这些", font(40), PAPER)

    rows = [
        ("Skill 封装", "法律研究的格式、审美、严谨度因人而异，\n网上的模板很难原样套用，得自己蒸馏。"),
        ("文书效率账", "Markdown 更适 AI；非用 Word 不可时，\n选对工具，成本和错误率差一个数量级。"),
        ("保密与本地化", "脱敏发生在转写那一步。\n能本地完成的，就不把原文送上云。"),
        ("知识库 / 检索", "公开资料怎么采、怎么核、怎么接到本地。\n案例数据不开放，更要会自己搭工作流。"),
    ]
    y = 680 * SCALE
    for i, (title, body) in enumerate(rows, 1):
        no = f"{i:02d}"
        d.text((160 * SCALE, y), no, font=font(22), fill=GOLD)
        d.text((240 * SCALE, y - 4 * SCALE), title, font=font(32), fill=PAPER)
        d.multiline_text(
            (240 * SCALE, y + 48 * SCALE),
            body,
            font=font(24),
            fill=BODY,
            spacing=8 * SCALE,
        )
        y += 180 * SCALE
    finish(img, "04-legal.png")


def poster_apply():
    img = canvas()
    d = ImageDraw.Draw(img)
    draw_frame(d)
    cx, cy = CW / 2, CH * 0.36
    draw_rings(d, cx, cy, [220 * SCALE, 280 * SCALE], (*CYAN[:3],), 1)
    img = paste_hexagram(img, cx, cy, 118 * SCALE, ARCANE)
    d = ImageDraw.Draw(img)

    center_text(d, 120 * SCALE, "JOIN", font(20), CYAN, tracking=16 * SCALE)
    center_text(d, 980 * SCALE, "我想参加", font(72), PAPER)
    center_text(d, 1100 * SCALE, "留下称呼与意向，审核后发通行码", font(26), BODY)
    # 链接盒
    box = [160 * SCALE, 1200 * SCALE, 1082 * SCALE, 1388 * SCALE]
    d.rounded_rectangle(box, radius=18 * SCALE, outline=CYAN, width=3 * SCALE)
    center_text(d, 1230 * SCALE, "报名页", font(22), GOLD)
    center_text(d, 1284 * SCALE, "cyber-casters.com/apply.html", font(28), PAPER)
    center_text(d, 1488 * SCALE, "2026.08.20  19:00  ·  深圳线下", font(24), CYAN)
    finish(img, "05-apply.png")


def main():
    poster_cover()
    poster_who()
    poster_how()
    poster_legal()
    poster_apply()


if __name__ == "__main__":
    main()
