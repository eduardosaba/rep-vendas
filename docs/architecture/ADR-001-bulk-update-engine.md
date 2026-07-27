# ADR-001: Bulk Update Engine (Motor de Atualizações em Massa)

* **Status:** Aceito / Marco 2 — Desenvolvimento concluído; homologação pendente (Modo 1)
* **Data:** 2026-07-27
* **Autor:** Antigravity / Time de Engenharia
* **Contexto:** Atualização de Linha da Fábrica na Torre de Controle

---

## 1. Contexto & Problema

As distribuidoras do RepVendas necessitam inativar/atualizar com frequência milhares de referências de produtos enviadas periodicamente pelas fábricas. Executar esse processo manualmente ou via scripts diretos sem validação prévia trazia riscos de:
- Inativação acidental de catálogo legado.
- Concorrência de edições manuais feitas simultaneamente por administradores.
- Falta de auditoria e impossibilidade de desfazer (*rollback*) uma operação em massa incorreta.

---

## 2. Decisão Arquitetural

Em vez de criar uma funcionalidade isolada e engessada apenas para inativação de catálogo, a solução foi projetada desde o início como o **Modo 1** de um **Bulk Update Engine (Motor de Atualizações em Massa)** universal.

### Princípios Adotados:
1. **Pipeline Desacoplado:** `Parser -> Normalizer -> Matcher -> Validator -> Preview -> RPC Apply -> Audit -> Smart Rollback`.
2. **Defesa em Profundidade nas RPCs:** Funções PostgreSQL com `SECURITY DEFINER`, `SET search_path = public, pg_temp`, checagem de permissão por `profiles.role` via `IF NOT EXISTS` e bloqueio pessimista de registros com `FOR UPDATE`.
3. **Smart Rollback Restritivo:** Rollback seguro por ID de histórico, apenas para registros efetivamente alterados (`UPDATED`) e com detecção de `CONFLICT` se houver alteração manual posterior.
4. **Isolamento por Escopo:** Restrições rigorosas no SQL para escopos `GLOBAL`, `ORGANIZATION` e `COMPANY`, garantindo que papéis como `admin_company` atuem exclusivamente sobre seus dados.
5. **Evolução Não-Destrutiva:** O motor inicia focado exclusivamente em `is_active` no Marco 2. Modos futuros (Preço, Custo, Estoque, Dados Fiscais) serão adicionados estendendo o schema com `before_data jsonb` e `after_data jsonb` sem quebrar a compatibilidade do modelo atual.

---

## 3. Consequências & Ganhos

- **Reaproveitamento de Engenharia:** Uma parcela significativa da infraestrutura poderá ser reutilizada nos próximos modos, especialmente upload, idempotência, controle de escopo, auditoria, concorrência e rollback.
- **Rastreabilidade Total:** Nenhuma alteração é feita sem registro histórico em `factory_line_import_rows`.
- **Risco Reduzido:** Impossibilidade de exclusão física dos produtos do banco de dados (`products`).

---

## 4. Evolução Prevista (Roadmap de Modos)

- **Marco 2:** Modo 1 — Linha da Fábrica (`is_active`) — Desenvolvimento concluído; homologação pendente.
- **Marco 3:** Observabilidade, Dashboard Operacional, Alertas, Health Check e Testes Automatizados.
- **Marco 4:** Modo 2 — Preços e Custos (`price`, `cost_price` com `PriceValidator`).
- **Marco 5:** Modo 3 — Estoque (movimentação absoluta vs incremental).
- **Marco 6:** Modo 4 — Dados Fiscais e Comerciais (NCM / GTIN).
- **Marco 7:** Modo 5 — Conteúdo e Mídia.
