# -*- coding: utf-8 -*-
"""
Gera docs/security-audit/relatorio-auditoria-seguranca.pdf.

Uso (a partir da raiz do repositório):
    docs/security-audit/.venv/Scripts/python.exe docs/security-audit/gerar_relatorio.py

Dependências (já instaladas no venv local): reportlab, matplotlib.
Os dados vivem em dados_auditoria.py — edite lá para regerar após uma
reauditoria, sem tocar no layout.
"""

import os
import sys
import textwrap
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether, HRFlowable,
)

import dados_auditoria as D

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "relatorio-auditoria-seguranca.pdf")
GRAF = os.path.join(AQUI, "graficos")
os.makedirs(GRAF, exist_ok=True)

NOME_RELATORIO = f"Relatório de Auditoria de Segurança — {D.PROJETO}"

# ── Paleta ───────────────────────────────────────────────────────────────────
C = {k: colors.HexColor(v) for k, v in D.CORES.items()}
TINTA = colors.HexColor("#1C1917")
GRAFITE = colors.HexColor("#44403C")
CINZA = colors.HexColor("#78716C")
LINHA = colors.HexColor("#E7E5E4")
PAPEL = colors.HexColor("#FDFBF9")
MARCA = colors.HexColor("#8c473e")
CODEBG = colors.HexColor("#F5F5F4")

MARGEM = 2 * cm
LARGURA_UTIL = A4[0] - 2 * MARGEM

# ── Estilos ──────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()


def st(nome, **kw):
    base = kw.pop("parent", ss["BodyText"])
    return ParagraphStyle(nome, parent=base, **kw)


S = {
    "capa_titulo": st("capa_titulo", fontName="Helvetica-Bold", fontSize=27, leading=33,
                      textColor=TINTA, alignment=TA_CENTER, spaceAfter=6),
    "capa_projeto": st("capa_projeto", fontName="Helvetica-Bold", fontSize=40, leading=46,
                       textColor=MARCA, alignment=TA_CENTER, spaceAfter=18),
    "capa_sub": st("capa_sub", fontName="Helvetica", fontSize=12, leading=18,
                   textColor=CINZA, alignment=TA_CENTER),
    "h1": st("h1", fontName="Helvetica-Bold", fontSize=18, leading=23, textColor=TINTA,
             spaceBefore=4, spaceAfter=10),
    "h2": st("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=MARCA,
             spaceBefore=14, spaceAfter=6),
    "h3": st("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=TINTA,
             spaceBefore=9, spaceAfter=3),
    "p": st("p", fontName="Helvetica", fontSize=9.6, leading=14.4, textColor=GRAFITE,
            alignment=TA_JUSTIFY, spaceAfter=7),
    "p_compact": st("p_compact", fontName="Helvetica", fontSize=9.2, leading=13,
                    textColor=GRAFITE, alignment=TA_JUSTIFY, spaceAfter=3),
    "lead": st("lead", fontName="Helvetica", fontSize=11, leading=16.5, textColor=GRAFITE,
               alignment=TA_JUSTIFY, spaceAfter=10),
    "cel": st("cel", fontName="Helvetica", fontSize=8.4, leading=11.6, textColor=GRAFITE),
    "cel_b": st("cel_b", fontName="Helvetica-Bold", fontSize=8.4, leading=11.6, textColor=TINTA),
    "cel_h": st("cel_h", fontName="Helvetica-Bold", fontSize=8.4, leading=11.6, textColor=colors.white),
    "mono": st("mono", fontName="Courier", fontSize=7.4, leading=10.2, textColor=TINTA),
    "mono_path": st("mono_path", fontName="Courier-Bold", fontSize=7.8, leading=11,
                    textColor=MARCA),
    "chip": st("chip", fontName="Helvetica-Bold", fontSize=7.6, leading=10,
               textColor=colors.white, alignment=TA_CENTER),
    "legenda": st("legenda", fontName="Helvetica-Oblique", fontSize=8.2, leading=11,
                  textColor=CINZA, alignment=TA_CENTER, spaceBefore=3),
    "issue_mono": st("issue_mono", fontName="Courier", fontSize=7.6, leading=10.6,
                     textColor=TINTA),
}


def pe(txt):
    """Escapa prosa vinda de dados_auditoria.py para o mini-HTML do reportlab.

    Os campos de texto do arquivo de dados são prosa pura e contêm coisas como
    <em>, <strong> e '<' literais. Sem isto o parser do Paragraph aborta.
    """
    return str(txt).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def chip(sev):
    """Chip colorido de severidade para dentro de célula de tabela."""
    t = Table([[Paragraph(D.ROTULO_SEV[sev], S["chip"])]], colWidths=[1.75 * cm],
              rowHeights=[0.52 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C[sev]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return t


# O código-fonte deste projeto usa divisores de comentário em box-drawing
# (──, ═, │...). A fonte Courier padrão do PDF (WinAnsi, base-14) não tem
# esses glifos: cada ocorrência rende como um bloco preto ilegível — visto
# nas evidências de F4, que citam "// ── POST: ... ───" verbatim. Sanitiza
# antes de desenhar, sem alterar o Python-string original em dados_auditoria.
_BOX_DRAWING = str.maketrans({
    "─": "-", "━": "-", "═": "=", "│": "|", "┃": "|",
    "┌": "+", "┐": "+", "└": "+", "┘": "+", "├": "+", "┤": "+",
    "┬": "+", "┴": "+", "┼": "+", "╌": "-", "╍": "-",
    "╔": "+", "╗": "+", "╚": "+", "╝": "+", "╠": "+", "╣": "+",
})


def bloco_codigo(rotulo, codigo, largura=LARGURA_UTIL):
    """Caixa de evidência: caminho:linha em destaque + trecho monoespaçado."""
    linhas = codigo.translate(_BOX_DRAWING).replace("\t", "    ").split("\n")
    corpo = "<br/>".join(
        l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
        or "&nbsp;" for l in linhas
    )
    t = Table(
        [[Paragraph(rotulo.replace("&", "&amp;").replace("<", "&lt;"), S["mono_path"])],
         [Paragraph(corpo, S["mono"])]],
        colWidths=[largura],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EDE9E6")),
        ("BACKGROUND", (0, 1), (0, 1), CODEBG),
        ("BOX", (0, 0), (-1, -1), 0.5, LINHA),
        ("LINEBELOW", (0, 0), (0, 0), 0.5, LINHA),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def quebra_caminho(caminho):
    """Insere uma quebra antes do nome do arquivo, para coluna estreita."""
    if "/" not in caminho:
        return caminho
    pasta, _, arquivo = caminho.rpartition("/")
    return f"{pasta}/<br/>{arquivo}"


def rotulo_valor(rotulo, texto):
    """Linha 'Rótulo — texto' com o rótulo em negrito."""
    return Paragraph(f"<b>{rotulo}</b> &nbsp;{texto}", S["p"])


# ── Gráficos ─────────────────────────────────────────────────────────────────
def grafico_rosca(contagem, caminho):
    ordem = ["critica", "alta", "media", "baixa"]
    itens = [(s, contagem.get(s, 0)) for s in ordem if contagem.get(s, 0) > 0]
    valores = [v for _, v in itens]
    rotulos = [f"{D.ROTULO_SEV[s]}\n{v}" for s, v in itens]
    cores = [D.CORES[s] for s, _ in itens]

    fig, ax = plt.subplots(figsize=(4.3, 3.5), dpi=220)
    wedges, textos = ax.pie(
        valores, labels=rotulos, colors=cores, startangle=90, counterclock=False,
        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2.2),
        labeldistance=1.16,
        textprops=dict(fontsize=9.5, color="#44403C", fontweight="normal"),
    )
    total = sum(valores)
    ax.text(0, 0.1, str(total), ha="center", va="center", fontsize=27,
            fontweight="bold", color="#1C1917")
    ax.text(0, -0.24, "achados", ha="center", va="center", fontsize=9.5, color="#78716C")
    ax.set_aspect("equal")
    fig.patch.set_alpha(0)
    plt.tight_layout(pad=0.3)
    fig.savefig(caminho, transparent=True, bbox_inches="tight")
    plt.close(fig)


def grafico_barras(por_cat, caminho):
    chaves = [k for k in D.CATEGORIAS if por_cat.get(k)]
    nomes = [D.CATEGORIAS[k] for k in chaves]
    valores = [len(por_cat[k]) for k in chaves]
    # Cor da barra = severidade mais grave da categoria.
    peso = {"critica": 0, "alta": 1, "media": 2, "baixa": 3}
    cores = []
    for k in chaves:
        pior = sorted(por_cat[k], key=lambda a: peso[a["sev"]])[0]["sev"]
        cores.append(D.CORES[pior])

    fig, ax = plt.subplots(figsize=(5.4, 3.5), dpi=220)
    y = range(len(nomes))
    ax.barh(list(y), valores, color=cores, height=0.56, zorder=3)
    ax.set_yticks(list(y))
    ax.set_yticklabels(nomes, fontsize=9, color="#44403C")
    ax.invert_yaxis()
    ax.set_xlabel("achados", fontsize=8.5, color="#78716C")
    ax.set_xticks(range(0, max(valores) + 2))
    ax.tick_params(axis="x", labelsize=8.5, colors="#78716C")
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#E7E5E4")
    ax.grid(axis="x", color="#EDE9E6", linewidth=0.8, zorder=0)
    for i, v in enumerate(valores):
        ax.text(v + 0.09, i, str(v), va="center", fontsize=9.5,
                fontweight="bold", color="#1C1917")
    ax.set_xlim(0, max(valores) + 0.85)
    fig.patch.set_alpha(0)
    plt.tight_layout(pad=0.3)
    fig.savefig(caminho, transparent=True, bbox_inches="tight")
    plt.close(fig)


# ── Cabeçalho / rodapé ───────────────────────────────────────────────────────
def moldura(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFont("Helvetica", 7.6)
        canvas.setFillColor(CINZA)
        canvas.drawString(MARGEM, A4[1] - 1.28 * cm, NOME_RELATORIO)
        canvas.drawRightString(A4[0] - MARGEM, A4[1] - 1.28 * cm, D.DATA_AUDITORIA)
        canvas.setStrokeColor(LINHA)
        canvas.setLineWidth(0.5)
        canvas.line(MARGEM, A4[1] - 1.48 * cm, A4[0] - MARGEM, A4[1] - 1.48 * cm)

        canvas.line(MARGEM, 1.42 * cm, A4[0] - MARGEM, 1.42 * cm)
        canvas.setFont("Helvetica", 7.6)
        canvas.drawString(MARGEM, 1.05 * cm, f"{D.PROJETO} · confidencial")
        canvas.setFont("Helvetica-Bold", 8.2)
        canvas.setFillColor(GRAFITE)
        canvas.drawRightString(A4[0] - MARGEM, 1.05 * cm, f"{doc.page}")
    else:
        canvas.setFillColor(PAPEL)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setFillColor(MARCA)
        canvas.rect(0, A4[1] - 0.55 * cm, A4[0], 0.55 * cm, fill=1, stroke=0)
        canvas.setFillColor(TINTA)
        canvas.rect(0, 0, A4[0], 0.35 * cm, fill=1, stroke=0)
    canvas.restoreState()


# ── Construção do documento ──────────────────────────────────────────────────
def construir():
    contagem = Counter(a["sev"] for a in D.ACHADOS)
    por_cat = {}
    for a in D.ACHADOS:
        por_cat.setdefault(a["cat"], []).append(a)

    p_rosca = os.path.join(GRAF, "severidade.png")
    p_barras = os.path.join(GRAF, "categorias.png")
    grafico_rosca(contagem, p_rosca)
    grafico_barras(por_cat, p_barras)

    story = []

    # ── a) Capa ──────────────────────────────────────────────────────────────
    story.append(Spacer(1, 3.4 * cm))
    story.append(Paragraph("Relatório de Auditoria de Segurança", S["capa_titulo"]))
    story.append(Paragraph(D.PROJETO, S["capa_projeto"]))
    story.append(HRFlowable(width="38%", thickness=1.1, color=MARCA, spaceAfter=16,
                            hAlign="CENTER"))
    story.append(Paragraph(D.DATA_AUDITORIA, S["capa_sub"]))
    story.append(Paragraph(
        f"branch <font face='Courier'>{D.BRANCH}</font> · "
        f"commit <font face='Courier'>{D.COMMIT}</font>", S["capa_sub"]))
    story.append(Spacer(1, 1.5 * cm))

    resumo_capa = [
        [Paragraph("Achados", S["cel_h"]), Paragraph("Alta", S["cel_h"]),
         Paragraph("Média", S["cel_h"]), Paragraph("Baixa", S["cel_h"]),
         Paragraph("Pontos fortes", S["cel_h"])],
        [Paragraph(f"<font size=15><b>{len(D.ACHADOS)}</b></font>", S["cel"]),
         Paragraph(f"<font size=15 color='{D.CORES['alta']}'><b>{contagem.get('alta',0)}</b></font>", S["cel"]),
         Paragraph(f"<font size=15 color='{D.CORES['media']}'><b>{contagem.get('media',0)}</b></font>", S["cel"]),
         Paragraph(f"<font size=15 color='{D.CORES['baixa']}'><b>{contagem.get('baixa',0)}</b></font>", S["cel"]),
         Paragraph(f"<font size=15 color='{D.CORES['forte']}'><b>{len(D.PONTOS_FORTES)}</b></font>", S["cel"])],
    ]
    t = Table(resumo_capa, colWidths=[3.2 * cm] * 5, hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("BACKGROUND", (0, 1), (-1, 1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, LINHA),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t)
    story.append(Spacer(1, 1.3 * cm))

    story.append(Paragraph("Escopo auditado", S["h3"]))
    for item in D.ESCOPO:
        story.append(Paragraph(f"•&nbsp;&nbsp;{pe(item)}", S["p_compact"]))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Nota metodológica", S["h3"]))
    story.append(Paragraph(
        "A stack foi detectada antes da auditoria e cada uma das cinco categorias foi "
        "traduzida para o equivalente desta arquitetura. Não há ORM nem servidor HTTP "
        "próprio: o backend é PostgreSQL com Row Level Security mais Edge Functions em Deno, "
        "então &#8220;query de listagem sem filtro de tenant&#8221; vira &#8220;policy ausente "
        "ou permissiva&#8221; e &#8220;handler de rota&#8221; vira &#8220;Edge Function ou RPC "
        "SECURITY DEFINER&#8221;. Todo achado abaixo foi verificado no código real, com "
        "arquivo e linha; nada é inferido.", S["p_compact"]))

    story.append(PageBreak())

    # ── Stack + mapeamento ───────────────────────────────────────────────────
    story.append(Paragraph("Stack detectada e mapeamento das categorias", S["h1"]))
    linhas = [[Paragraph("Camada", S["cel_h"]), Paragraph("O que o projeto usa", S["cel_h"])]]
    for k, v in D.STACK:
        linhas.append([Paragraph(pe(k), S["cel_b"]), Paragraph(pe(v), S["cel"])])
    t = Table(linhas, colWidths=[4.2 * cm, LARGURA_UTIL - 4.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F6")]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINHA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)

    story.append(Paragraph("Como cada categoria foi investigada", S["h2"]))
    for titulo, texto in D.MAPEAMENTO:
        story.append(Paragraph(f"<b>{pe(titulo)}</b>", S["h3"]))
        story.append(Paragraph(pe(texto), S["p"]))

    story.append(PageBreak())

    # ── b) Resumo executivo ──────────────────────────────────────────────────
    story.append(Paragraph("Resumo executivo", S["h1"]))
    story.append(Paragraph(
        f"Foram identificados <b>{len(D.ACHADOS)} achados</b> — "
        f"<b><font color='{D.CORES['alta']}'>{contagem.get('alta',0)} de severidade alta</font></b>, "
        f"<b><font color='{D.CORES['media']}'>{contagem.get('media',0)} média</font></b> e "
        f"<b><font color='{D.CORES['baixa']}'>{contagem.get('baixa',0)} baixa</font></b>. "
        "Nenhum achado crítico: não há tabela sem RLS, não há vazamento entre empresas e "
        "nenhum segredo de servidor chega ao bundle do cliente. A base é sólida, e a "
        "migration 20260815_security_hardening.sql mostra que o endurecimento já foi feito "
        "com método uma vez.", S["lead"]))
    story.append(Paragraph(
        "Os achados se concentram em três lugares. O primeiro é o padrão "
        "<font face='Courier'>WITH CHECK (true)</font>, escrito como se significasse "
        "&#8220;sem restrição extra&#8221; e que na prática libera a linha inteira depois da "
        "escrita — é a raiz do IDOR de exames clínicos (F1) e da caixa de notificações aberta "
        "(F6). O segundo é a camada de permissões por módulo do portal RH, introduzida em "
        "agosto e aplicada ao servidor em apenas quatro superfícies: nas demais, o bloqueio "
        "existe só no navegador (F2, F3). O terceiro é o webhook do Strava, único endpoint "
        "que escreve no banco com service_role sem identificar quem chamou (F4).", S["p"]))

    story.append(Spacer(1, 0.35 * cm))
    g1 = Image(p_rosca, width=7.3 * cm, height=5.95 * cm, kind="proportional")
    g2 = Image(p_barras, width=8.6 * cm, height=5.6 * cm, kind="proportional")
    tg = Table([[g1, g2],
                [Paragraph("Achados por severidade", S["legenda"]),
                 Paragraph("Achados por categoria (cor = severidade mais grave)", S["legenda"])]],
               colWidths=[7.6 * cm, LARGURA_UTIL - 7.6 * cm])
    tg.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
    ]))
    story.append(tg)

    story.append(Spacer(1, 0.4 * cm))
    linhas = [[Paragraph("Categoria", S["cel_h"]), Paragraph("Achados", S["cel_h"]),
               Paragraph("Severidade máxima", S["cel_h"]), Paragraph("IDs", S["cel_h"])]]
    peso = {"critica": 0, "alta": 1, "media": 2, "baixa": 3}
    for k, nome in D.CATEGORIAS.items():
        lista = por_cat.get(k, [])
        if not lista:
            linhas.append([Paragraph(nome, S["cel"]), Paragraph("0", S["cel"]),
                           Paragraph("<font color='#059669'><b>sem achados</b></font>", S["cel"]),
                           Paragraph("—", S["cel"])])
            continue
        pior = sorted(lista, key=lambda a: peso[a["sev"]])[0]["sev"]
        linhas.append([
            Paragraph(nome, S["cel"]),
            Paragraph(str(len(lista)), S["cel"]),
            Paragraph(f"<font color='{D.CORES[pior]}'><b>{D.ROTULO_SEV[pior]}</b></font>", S["cel"]),
            Paragraph(", ".join(a["id"] for a in lista), S["cel"]),
        ])
    t = Table(linhas, colWidths=[7.6 * cm, 2.0 * cm, 3.4 * cm, LARGURA_UTIL - 13.0 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F6")]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINHA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (2, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)

    story.append(PageBreak())

    # ── c) Pontos fortes ─────────────────────────────────────────────────────
    story.append(Paragraph("Pontos fortes", S["h1"]))
    story.append(Paragraph(
        f"Os {len(D.PONTOS_FORTES)} itens abaixo foram verificados no código e estão "
        "corretos. Servem tanto como registro do que está protegido quanto como prova da "
        "cobertura da auditoria.", S["p"]))
    for titulo, texto in D.PONTOS_FORTES:
        bloco = Table(
            [[Paragraph("&#10003;", ParagraphStyle("ok", fontName="Helvetica-Bold",
                                                   fontSize=11, textColor=C["forte"])),
              Paragraph(f"<b>{pe(titulo)}</b><br/><font size=9 color='#44403C'>{pe(texto)}</font>",
                        S["p_compact"])]],
            colWidths=[0.75 * cm, LARGURA_UTIL - 0.75 * cm])
        bloco.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (0, 0), 2),
            ("LEFTPADDING", (1, 0), (1, 0), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(bloco)

    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Pontos fracos — os riscos centrais", S["h1"]))
    for titulo, texto in D.PONTOS_FRACOS:
        bloco = Table(
            [[Paragraph("!", ParagraphStyle("warn", fontName="Helvetica-Bold", fontSize=11,
                                            textColor=C["alta"], alignment=TA_CENTER)),
              Paragraph(f"<b>{pe(titulo)}</b><br/><font size=9 color='#44403C'>{pe(texto)}</font>",
                        S["p_compact"])]],
            colWidths=[0.75 * cm, LARGURA_UTIL - 0.75 * cm])
        bloco.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (0, 0), 2),
            ("LEFTPADDING", (1, 0), (1, 0), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(bloco)

    story.append(PageBreak())

    # ── d) Tabela-resumo dos achados ─────────────────────────────────────────
    story.append(Paragraph("Achados — visão geral", S["h1"]))
    linhas = [[Paragraph("Severidade", S["cel_h"]), Paragraph("ID", S["cel_h"]),
               Paragraph("Arquivo:linha", S["cel_h"]), Paragraph("Descrição", S["cel_h"])]]
    estilos_extra = []
    for i, a in enumerate(D.ACHADOS, start=1):
        # Quebra o caminho antes do nome do arquivo: sem isso a coluna estreita
        # corta o identificador no meio ("...doctor_pane" / "l_v2.sql").
        arquivos = "<br/>".join(
            f"<font face='Courier' size=7.2>{quebra_caminho(f)}</font>"
            for f in a["arquivos"][:3])
        if len(a["arquivos"]) > 3:
            arquivos += f"<br/><font size=7 color='#78716C'>+{len(a['arquivos'])-3} arquivo(s)</font>"
        linhas.append([
            chip(a["sev"]),
            Paragraph(f"<b>{a['id']}</b>", S["cel_b"]),
            Paragraph(arquivos, S["cel"]),
            Paragraph(f"{pe(a['titulo'])}<br/><font size=7.6 color='#78716C'>"
                      f"{D.CATEGORIAS[a['cat']]}</font>", S["cel"]),
        ])
    t = Table(linhas, colWidths=[2.05 * cm, 1.0 * cm, 6.6 * cm, LARGURA_UTIL - 9.65 * cm],
              repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F6")]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINHA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ] + estilos_extra))
    story.append(t)

    story.append(PageBreak())

    # ── Achados detalhados, por categoria ────────────────────────────────────
    story.append(Paragraph("Achados detalhados", S["h1"]))
    story.append(Paragraph(
        "Agrupados pela categoria da auditoria. Cada achado traz o trecho exato do código, "
        "por que é explorável, o impacto, as condições de explorabilidade e a correção "
        "sugerida.", S["p"]))

    for k, nome in D.CATEGORIAS.items():
        lista = por_cat.get(k, [])
        story.append(Paragraph(nome, S["h2"]))
        if not lista:
            story.append(Paragraph(
                "<i>Nenhum achado nesta categoria.</i>", S["p"]))
            continue
        for a in lista:
            partes = [
                Table([[chip(a["sev"]),
                        Paragraph(f"<b>{a['id']} — {pe(a['titulo'])}</b>",
                                  ParagraphStyle("ft", parent=S["p"], fontSize=11,
                                                 leading=15, textColor=TINTA,
                                                 spaceAfter=0, alignment=0))]],
                      colWidths=[2.05 * cm, LARGURA_UTIL - 2.05 * cm],
                      style=TableStyle([
                          ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                          ("LEFTPADDING", (0, 0), (0, 0), 0),
                          ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                      ])),
                Paragraph("<b>Localização</b>", S["h3"]),
            ]
            for f in a["arquivos"]:
                partes.append(Paragraph(f"<font face='Courier' size=8>{f}</font>",
                                        S["p_compact"]))
            partes.append(Spacer(1, 4))
            partes.append(Paragraph("<b>Evidência</b>", S["h3"]))
            story.append(KeepTogether(partes))

            for rotulo, codigo in a["evidencia"]:
                story.append(bloco_codigo(rotulo, codigo))
                story.append(Spacer(1, 5))

            story.append(Paragraph("<b>Por que é explorável</b>", S["h3"]))
            for par in a["porque"].split("\n\n"):
                story.append(Paragraph(pe(par).replace("\n", "<br/>"), S["p"]))

            story.append(Paragraph("<b>Impacto</b>", S["h3"]))
            story.append(Paragraph(pe(a["impacto"]), S["p"]))

            story.append(Paragraph("<b>Condições de explorabilidade</b>", S["h3"]))
            story.append(Paragraph(pe(a["explorabilidade"]), S["p"]))

            story.append(Paragraph("<b>Correção sugerida</b>", S["h3"]))
            story.append(Paragraph(pe(a["correcao"]), S["p"]))

            story.append(HRFlowable(width="100%", thickness=0.5, color=LINHA,
                                    spaceBefore=8, spaceAfter=12))

    story.append(PageBreak())

    # ── e) Recomendações priorizadas ─────────────────────────────────────────
    story.append(Paragraph("Recomendações priorizadas", S["h1"]))
    story.append(Paragraph(
        "P1 é o que deve ser corrigido antes de qualquer outra coisa: exposição de dado "
        "clínico de terceiros e escrita não autenticada. P2 restaura garantias que o produto "
        "já promete na interface. P3 é endurecimento e prevenção de regressão.", S["p"]))

    cor_p = {"P1": D.CORES["critica"], "P2": D.CORES["alta"], "P3": D.CORES["baixa"],
             "Feito": D.CORES["forte"]}
    linhas = [[Paragraph("Prio", S["cel_h"]), Paragraph("Ação", S["cel_h"]),
               Paragraph("Detalhe", S["cel_h"])]]
    for prio, acao, detalhe in D.RECOMENDACOES:
        linhas.append([
            Paragraph(f"<font color='{cor_p[prio]}'><b>{prio}</b></font>", S["cel_b"]),
            Paragraph(f"<b>{pe(acao)}</b>", S["cel_b"]),
            Paragraph(pe(detalhe), S["cel"]),
        ])
    t = Table(linhas, colWidths=[1.2 * cm, 5.2 * cm, LARGURA_UTIL - 6.4 * cm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F6")]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINHA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(PageBreak())

    # ── f) Issues para o GitHub ──────────────────────────────────────────────
    story.append(Paragraph("Issues para o GitHub", S["h1"]))
    story.append(Paragraph(
        "Cada bloco abaixo é o texto completo de uma issue em Markdown, pronto para copiar e "
        "colar. Achados relacionados foram agrupados numa issue só quando compartilham a "
        "mesma correção. Delimitadores: <font face='Courier'>--- ISSUE n ---</font> e "
        "<font face='Courier'>--- FIM ISSUE n ---</font>.", S["p"]))

    por_id = {a["id"]: a for a in D.ACHADOS}

    for n, issue in enumerate(D.ISSUES, start=1):
        achados = [por_id[i] for i in issue["achados"]]
        md = montar_markdown(n, issue, achados)
        story.append(bloco_issue(n, md))
        story.append(Spacer(1, 10))

    doc = BaseDocTemplate(
        SAIDA, pagesize=A4,
        leftMargin=MARGEM, rightMargin=MARGEM,
        topMargin=MARGEM, bottomMargin=MARGEM,
        title=NOME_RELATORIO, author="Auditoria de segurança",
        subject=f"Auditoria de segurança do projeto {D.PROJETO}",
    )
    frame = Frame(MARGEM, MARGEM, LARGURA_UTIL, A4[1] - 2 * MARGEM, id="corpo",
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="padrao", frames=[frame], onPage=moldura)])
    doc.build(story)
    return SAIDA


def montar_markdown(n, issue, achados):
    """Texto completo da issue, em Markdown."""
    sev = achados[0]["sev"]
    L = []
    L.append(f"## {issue['titulo']}")
    L.append("")
    L.append(f"**Labels:** `{'`, `'.join(issue['labels'])}`")
    L.append(f"**Severidade:** {D.ROTULO_SEV[sev]}")
    L.append(f"**Categoria:** {D.CATEGORIAS[achados[0]['cat']]}")
    L.append("")
    L.append("### Problema")
    L.append("")
    for a in achados:
        if len(achados) > 1:
            L.append(f"**{a['id']} — {a['titulo']}**")
            L.append("")
        for par in a["porque"].split("\n\n"):
            L.append(par.replace("\n", "  \n"))
            L.append("")
    L.append("### Evidência")
    L.append("")
    for a in achados:
        for rotulo, codigo in a["evidencia"]:
            L.append(f"`{rotulo}`")
            L.append("")
            L.append("```sql" if rotulo.endswith(".sql") or ".sql:" in rotulo else "```ts")
            L.extend(codigo.split("\n"))
            L.append("```")
            L.append("")
    L.append("### Impacto")
    L.append("")
    for a in achados:
        L.append(a["impacto"])
        L.append("")
    L.append("### Condições de explorabilidade")
    L.append("")
    for a in achados:
        L.append(a["explorabilidade"])
        L.append("")
    L.append("### Correção sugerida")
    L.append("")
    for a in achados:
        L.append(a["correcao"])
        L.append("")
    L.append("### Critérios de aceite")
    L.append("")
    vistos = set()
    for a in achados:
        for c in a["aceite"]:
            if c not in vistos:
                vistos.add(c)
                L.append(f"- [ ] {c}")
    L.append("")
    L.append(f"_Origem: auditoria de segurança de {D.DATA_AUDITORIA} "
             f"(commit `{D.COMMIT}`), achado(s) "
             f"{', '.join(a['id'] for a in achados)}._")
    return "\n".join(L)


LINHAS_POR_BLOCO = 6   # granularidade da quebra de página dentro de uma issue
COLUNAS_ISSUE = 97     # cabe na largura útil em Courier 7.6pt sem quebrar palavra


def quebrar_linhas(linhas):
    """Quebra as linhas longas do Markdown na coluna certa.

    Sem isto o reportlab quebra no meio da palavra (Courier não tem espaço
    elástico), e o bloco fica ilegível: 'profissional' vira 'pro' + 'fissional'.
    A quebra preserva a indentação de listas e nunca parte um identificador.
    """
    saida = []
    for linha in linhas:
        if len(linha) <= COLUNAS_ISSUE:
            saida.append(linha)
            continue
        recuo = len(linha) - len(linha.lstrip(" "))
        extra = " " * (recuo + (2 if linha.lstrip().startswith(("-", "*", "•")) else 0))
        partes = textwrap.wrap(
            linha, width=COLUNAS_ISSUE, break_long_words=False,
            break_on_hyphens=False, subsequent_indent=extra,
            initial_indent=" " * recuo, drop_whitespace=True,
        )
        saida.extend(partes or [linha])
    return saida


def bloco_issue(n, md):
    """Bloco delimitado, monoespaçado, com o Markdown completo da issue.

    O corpo é fatiado em várias linhas de tabela porque uma Table do reportlab
    só quebra ENTRE linhas: com o Markdown inteiro numa célula só, uma issue
    maior que a página derruba o build com LayoutError.
    """
    def esc(txt):
        return (txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace(" ", "&nbsp;")) or "&nbsp;"

    linhas_md = quebrar_linhas(md.translate(_BOX_DRAWING).split("\n"))
    pedacos = [linhas_md[i:i + LINHAS_POR_BLOCO]
               for i in range(0, len(linhas_md), LINHAS_POR_BLOCO)]

    dados = [[Paragraph(f"--- ISSUE {n} ---", S["mono_path"])]]
    for pedaco in pedacos:
        dados.append([Paragraph("<br/>".join(esc(l) for l in pedaco), S["issue_mono"])])
    dados.append([Paragraph(f"--- FIM ISSUE {n} ---", S["mono_path"])])

    ultimo = len(dados) - 1
    t = Table(dados, colWidths=[LARGURA_UTIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EDE9E6")),
        ("BACKGROUND", (0, 1), (0, ultimo - 1), CODEBG),
        ("BACKGROUND", (0, ultimo), (0, ultimo), colors.HexColor("#EDE9E6")),
        ("BOX", (0, 0), (-1, -1), 0.7, MARCA),
        ("LINEBELOW", (0, 0), (0, 0), 0.5, LINHA),
        ("LINEABOVE", (0, ultimo), (0, ultimo), 0.5, LINHA),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (0, 0), 6),
        ("BOTTOMPADDING", (0, ultimo), (0, ultimo), 6),
        ("TOPPADDING", (0, 1), (0, ultimo - 1), 0),
        ("BOTTOMPADDING", (0, 1), (0, ultimo - 1), 0),
    ]))
    return t


if __name__ == "__main__":
    caminho = construir()
    print(f"PDF gerado: {caminho}")
