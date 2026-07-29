# ADR-010: Governança Documental Enxuta e Prevenção ao Documentation Drift

- **Data**: 2026-07-29
- **Status**: Aceito

---

## Contexto

A proliferação de documentos manuais descrevendo schemas de tabelas, relacionamentos e SQL estático gera o fenômeno de *Documentation Drift*, onde a documentação fica desatualizada em relação ao código executável e introduz alucinações ou ruidos para ferramentas de IA (Antigravity IDE / Gemini CLI).

---

## Decisão

Estabelecer 3 níveis claros de fontes da verdade no projeto RepVendas:

1. **Nível 1 — Verdade Executiva Absoluta (Código & Migrations)**:
   - `supabase/migrations/`
   - `src/types/database.types.ts`
   - `src/domain/` e os componentes ativos.
   - *Regra*: Não reproduzir esquemas completos de colunas/tabelas em arquivos Markdown.

2. **Nível 2 — Índice de Estado Implementado (`docs/CURRENT_STATE.md`)**:
   - Serve exclusivamente como índice conciso do que está implementado no código.
   - Utiliza obrigatoriamente status de verificação (`Confirmado no código`, `Confirmado em migration`, `Inferido por uso`, `Não verificado`, `Planejado`) acompanhado de links diretos de arquivos.

3. **Nível 3 — Direção Estratégica (`docs/TARGET_ARCHITECTURE_3.0.md`)**:
   - Registra a arquitetura-alvo e o roadmap do produto.

---

## Estrutura da Documentação

- `AGENTS.md`: Diretrizes principais de IA na raiz.
- `docs/Constitution.md`: Princípios permanentes de engenharia.
- `docs/CURRENT_STATE.md`: Estado real verificado.
- `docs/TARGET_ARCHITECTURE_3.0.md`: Arquitetura-alvo.
- `docs/modules/`: Regras estáveis por Bounded Context (`01_COMMERCIAL.md`, `02_FULFILLMENT.md`, `03_AUTH_GOVERNANCE.md`, `04_NOTIFICATIONS_OUTBOX.md`).
- `docs/adr/`: Decisões arquiteturais.

---

## Consequências

- **Positivas**: Eliminação da "Lama de Documentação", precisão máxima das análises de IA, menor esforço de manutenção documental.
- **Negativas / Cuidados**: Exige disciplina para atualizar `CURRENT_STATE.md` apenas com ponteiros e status quando um novo recurso for concluído.
