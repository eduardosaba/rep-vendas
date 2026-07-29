# Roteiro Oficial de Homologação (UAT) — RepVendas

Este documento consolida o roteiro oficial de testes de homologação (User Acceptance Testing - UAT) para liberação da **Release Motor Universal de Atualização v1**.

---

### **Fase 1 — Banco de Dados**
- [ ] Migration executada via `npx supabase db push`.
- [ ] Tabela `product_update_jobs` criada com colunas e status corretos.
- [ ] Tabela `product_update_job_items` criada com RLS e FKs.
- [ ] Políticas RLS testadas para usuário administrador `master`.

---

### **Fase 2 — Preview & Parser**
- [ ] Upload de arquivo `.xlsx` de teste.
- [ ] Reconhecimento dinâmico das abas e colunas.
- [ ] Preservação de zeros à esquerda em referências (ex: `000123`).
- [ ] Emissão de aviso quando `sale_price > price`.
- [ ] Confirmar que nenhuma linha do banco foi modificada na etapa de preview.

---

### **Fase 3 — Execução Incremental em Lote**
- [ ] Seleção de filtro e ação de atualização.
- [ ] Processamento incremental em lotes de 200 itens.
- [ ] Barra de progresso exibindo porcentagem e métricas ao vivo.
- [ ] Confirmação de gravação do job e dos `product_update_job_items`.

---

### **Fase 4 — Dashboard Executivo**
- [ ] Acesso à rota `/admin/produtos/dashboard`.
- [ ] Atualização automática dos KPIs (produtos ativos, preço médio válido, volume em estoque).
- [ ] Exibição das métricas de jobs concluídos e revertidos.

---

### **Fase 5 — Central de Histórico e Auditoria**
- [ ] Acesso à rota `/admin/produtos/historico-alteracoes`.
- [ ] Filtro de status (`applied`, `rolled_back`, `conflict`).
- [ ] Inspeção no modal Diff (`old_value` vs `new_value`).

---

### **Fase 6 — Rollback Auditado Simples**
- [ ] Acionamento do botão de Rollback em um job concluído.
- [ ] Diálogo de confirmação com avisos de segurança.
- [ ] Restauração dos dados no banco para o valor `old_value`.

---

### **Fase 7 — Rollback com Detecção de Conflitos**
- [ ] Alteração manual prévia de um produto após a importação.
- [ ] Tentativa de execução do Rollback.
- [ ] Verificação de que o item alterado por terceiros é marcado como `conflict` e não é sobrescrito.

---

### **Fase 8 — Segurança e RLS**
- [ ] Acesso à rota administrativa por usuário não-administrador.
- [ ] Confirmação do bloqueio via RLS e Server Actions.
