"""Helpers para montar os PDFs de documentação (HTML + SVG → Chrome headless)."""
from __future__ import annotations
import html
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent
esc = html.escape


def inline(text: str) -> str:
    """Escapa HTML mantendo `code` e **negrito** com marcação simples."""
    import re
    t = esc(text, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\*\w])\*([^*\n]+)\*(?![\*\w])", r"<i>\1</i>", t)
    return t


class Doc:
    def __init__(self, title: str, kicker: str, cover_title: str, lead: str, chips: list[str], filename: str):
        self.title, self.kicker, self.cover_title, self.lead, self.chips, self.filename = title, kicker, cover_title, lead, chips, filename
        self.parts: list[str] = []
        self.sections: list[tuple[str, str, str]] = []
        self.fig = 0

    # ── estrutura ───────────────────────────────────────────────────────
    def section(self, num: str, title: str, desc: str = "", newpage: bool = False):
        self.sections.append((num, title, desc))
        self.parts.append(f'<h2 class="sec{" newpage" if newpage else ""}"><span class="num">{num}</span>{esc(title)}</h2>')

    def h3(self, text): self.parts.append(f"<h3>{inline(text)}</h3>")
    def h4(self, text): self.parts.append(f"<h4>{inline(text)}</h4>")
    def p(self, text): self.parts.append(f"<p>{inline(text)}</p>")
    def raw(self, html_text): self.parts.append(html_text)

    def ul(self, items, ordered=False):
        tag = "ol" if ordered else "ul"
        self.parts.append(f"<{tag}>" + "".join(f"<li>{inline(i)}</li>" for i in items) + f"</{tag}>")

    def note(self, title: str, text: str, tone: str = ""):
        self.parts.append(f'<div class="note {tone}"><b class="t">{esc(title)}</b>{inline(text)}</div>')

    def code(self, text: str):
        self.parts.append(f"<pre>{esc(text.strip(chr(10)))}</pre>")

    def kpis(self, items):
        self.parts.append('<div class="kpis">' + "".join(f"<div class='kpi'><b>{esc(str(v))}</b><span>{esc(l)}</span></div>" for v, l in items) + "</div>")

    def cards(self, items, two=False):
        cells = "".join(f"<div class='card'><div class='ic'>{ic}</div><h5>{esc(t)}</h5><p>{inline(d)}</p></div>" for ic, t, d in items)
        self.parts.append(f'<div class="cards{" two" if two else ""}">{cells}</div>')

    def table(self, headers, rows, classes=None):
        """rows: listas de células; célula pode ser str (inline) ou ('tag', 'ok|warn|bad|info|gray', 'texto') / ('raw', html)."""
        classes = classes or [""] * len(headers)
        head = "".join(f'<th class="{c}">{esc(h)}</th>' for h, c in zip(headers, classes))
        body = []
        for row in rows:
            tds = []
            for cell, c in zip(row, classes):
                if isinstance(cell, tuple) and cell[0] == "tag":
                    tds.append(f'<td class="{c}"><span class="tag {cell[1]}">{esc(cell[2])}</span></td>')
                elif isinstance(cell, tuple) and cell[0] == "raw":
                    tds.append(f'<td class="{c}">{cell[1]}</td>')
                else:
                    tds.append(f'<td class="{c}">{inline(str(cell))}</td>')
            body.append("<tr>" + "".join(tds) + "</tr>")
        keep = " class=\"keep\"" if len(rows) <= 8 else ""
        self.parts.append(f"<table{keep}><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>")

    def figure(self, svg_markup: str, caption: str):
        self.fig += 1
        self.parts.append(f"<figure>{svg_markup}<figcaption>Figura {self.fig} — {esc(caption)}</figcaption></figure>")

    # ── saída ───────────────────────────────────────────────────────────
    def html(self) -> str:
        chips = "".join(f'<span class="chip">{esc(c)}</span>' for c in self.chips)
        cover = f"""<section class="cover"><div class="kicker">{esc(self.kicker)}</div>
<h1>{self.cover_title}</h1><div class="bar"></div><div class="lead">{esc(self.lead)}</div><div class="chips">{chips}</div>
<div class="foot"><div><b>Gabriel da Silveira Pessoni · Lívia Portela Ferreira</b><br>FATEC Franca — Desenvolvimento de Software Multiplataforma · 6º semestre</div>
<div style="text-align:right"><b>Projeto Integrador VI</b><br>Computação em Nuvem II · Mineração de Dados</div></div></section>"""
        toc_rows = "".join(f'<div class="row"><span class="n">{n}</span><span class="t">{esc(t)}</span><span class="d">{esc(d)}</span></div>' for n, t, d in self.sections)
        toc = f'<section class="toc" style="break-after:page"><h1>Sumário</h1>{toc_rows}</section>'
        css = (HERE / "style.css").read_text(encoding="utf-8")
        return (f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>{esc(self.title)}</title><style>{css}</style>'
                f'<body><div class="doctitle">{esc(self.title)}</div>{cover}{toc}{"".join(self.parts)}</body></html>')

    def build(self) -> Path:
        out = OUT / self.filename
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "doc.html"
            src.write_text(self.html(), encoding="utf-8")
            subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                            f"--print-to-pdf={out}", f"file://{src}"], check=True, capture_output=True)
        return out


# ── SVG ─────────────────────────────────────────────────────────────────────
PALETTE = {
    "blue": ("#dbeafe", "#2563eb", "#1e3a8a"), "green": ("#dcfce7", "#16a34a", "#14532d"),
    "amber": ("#fef3c7", "#d97706", "#78350f"), "red": ("#fee2e2", "#dc2626", "#7f1d1d"),
    "violet": ("#ede9fe", "#7c3aed", "#4c1d95"), "slate": ("#f1f5f9", "#64748b", "#0f172a"),
    "cyan": ("#cffafe", "#0891b2", "#164e63"), "navy": ("#0f172a", "#0f172a", "#ffffff"),
}


def svg(w: int, h: int, body: str) -> str:
    return (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans, Liberation Sans, sans-serif">'
            '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            '<path d="M0 0L10 5L0 10z" fill="#64748b"/></marker></defs>' + body + "</svg>")


def box(x, y, w, h, title, sub="", color="blue", size=11):
    f, s, t = PALETTE[color]
    sub_svg = ""
    if sub:
        lines = sub.split("\n")
        sub_svg = "".join(f'<text x="{x + w / 2}" y="{y + h / 2 + 8 + i * 12}" text-anchor="middle" font-size="8.5" fill="{t}" opacity=".85">{esc(l)}</text>' for i, l in enumerate(lines))
    ty = y + h / 2 - (3 if sub else -4)
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{f}" stroke="{s}" stroke-width="1.3"/>'
            f'<text x="{x + w / 2}" y="{ty}" text-anchor="middle" font-size="{size}" font-weight="700" fill="{t}">{esc(title)}</text>{sub_svg}')


def arrow(x1, y1, x2, y2, label="", dashed=False, color="#64748b", dx=0, dy=-4):
    d = ' stroke-dasharray="4 3"' if dashed else ""
    lab = f'<text x="{(x1 + x2) / 2 + dx}" y="{(y1 + y2) / 2 + dy}" text-anchor="middle" font-size="8.5" fill="#475569">{esc(label)}</text>' if label else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.4"{d} marker-end="url(#ar)"/>{lab}'


def text(x, y, s, size=9, color="#475569", anchor="middle", weight="400"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" fill="{color}" font-weight="{weight}">{esc(s)}</text>'


def sequence(actors: list[str], messages: list[tuple], width=640, step=30, colors=None) -> str:
    """messages: (de, para, rótulo, tipo) tipo: 'call' | 'ret' | 'self'. Índices de atores."""
    n = len(actors)
    gap = width / n
    xs = [gap / 2 + i * gap for i in range(n)]
    height = 50 + step * (len(messages) + 1)
    out = []
    for i, a in enumerate(actors):
        c = (colors or ["blue"] * n)[i]
        out.append(box(xs[i] - gap / 2 + 8, 4, gap - 16, 26, a, color=c, size=9.5))
        out.append(f'<line x1="{xs[i]}" y1="30" x2="{xs[i]}" y2="{height - 6}" stroke="#cbd5e1" stroke-dasharray="3 3"/>')
    for j, m in enumerate(messages):
        a, b, label, kind = m
        y = 52 + j * step
        if kind == "self":
            out.append(f'<path d="M{xs[a]} {y} h22 v12 h-22" fill="none" stroke="#64748b" stroke-width="1.3" marker-end="url(#ar)"/>')
            out.append(text(xs[a] + 28, y + 9, label, 8.5, anchor="start"))
        else:
            out.append(arrow(xs[a], y, xs[b], y, "", dashed=(kind == "ret")))
            mid = (xs[a] + xs[b]) / 2
            out.append(text(mid, y - 5, label, 8.5))
    return svg(width, height, "".join(out))
