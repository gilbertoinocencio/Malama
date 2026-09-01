# Auditoria de segurança — Malama

Relatório: [`relatorio-auditoria-seguranca.pdf`](./relatorio-auditoria-seguranca.pdf)
(30 páginas, A4, pt-BR). A última seção traz o texto completo de 8 issues em
Markdown, prontas para copiar e colar no GitHub.

## Arquivos

| Arquivo | O que é |
|---|---|
| `dados_auditoria.py` | Achados, pontos fortes, recomendações e issues. **É o único arquivo a editar numa reauditoria.** |
| `gerar_relatorio.py` | Layout e gráficos. Não contém dados. |
| `relatorio-auditoria-seguranca.pdf` | Saída. |
| `graficos/` | PNGs intermediários (rosca e barras), regerados a cada execução. |

## Regerar o PDF

O ambiente Python fica isolado em `.venv/` (não instala nada globalmente):

```bash
# primeira vez
python -m venv docs/security-audit/.venv
docs/security-audit/.venv/Scripts/python.exe -m pip install reportlab matplotlib

# a cada execução (a partir da raiz do repositório)
docs/security-audit/.venv/Scripts/python.exe docs/security-audit/gerar_relatorio.py
```

No Linux/macOS o interpretador fica em `docs/security-audit/.venv/bin/python`.

## Conferir a saída

```bash
docs/security-audit/.venv/Scripts/python.exe -m pip install pymupdf
docs/security-audit/.venv/Scripts/python.exe - <<'PY'
import pymupdf
d = pymupdf.open('docs/security-audit/relatorio-auditoria-seguranca.pdf')
print('páginas:', d.page_count)
for i, p in enumerate(d, 1):                      # texto fora da margem direita
    for b in p.get_text('blocks'):
        if b[2] > 540.5:
            print(f'pág {i}: {b[4][:60]!r}')
d[0].get_pixmap(dpi=105).save('/tmp/p1.png')      # rasteriza para conferir visual
PY
```

## Paleta de severidade

crítica `#B91C1C` · alta `#EA580C` · média `#D97706` · baixa `#2563EB` · ponto forte `#059669`
