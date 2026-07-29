# Constituição de Engenharia — RepVendas Platform

Este documento define os princípios permanentes de engenharia, padrões de arquitetura e diretrizes de desenvolvimento para o ecossistema **RepVendas**.

---

### **1. Princípios Fundamentais**

1. **Evolução Sustentável sobre Velocidade Cega**: Todo módulo deve ser projetado priorizando a facilidade de manutenção, desacoplamento e capacidade de evolução a longo prazo.
2. **Domínio Independente da Interface**: A lógica de negócios, normalizações e regras de validação devem residir no Domínio/Aplicação, nunca misturadas ou duplicadas dentro de componentes React de UI.
3. **Auditoria por Padrão (Audit-First)**: Operações em lote, alterações de dados críticos ou movimentações financeiras/estoque devem obrigatoriamente registrar o estado anterior (`old_value`) e o novo estado (`new_value`) para permitir rastreabilidade e rollback.
4. **Segurança por Whitelist e Validação em Camadas**: Nenhuma entrada arbitrária do cliente é confiada. Toda escrita no banco deve passar por Whitelist estrita de campos e validação de permissões no servidor.

---

### **2. Padrões de Arquitetura e Código**

- **Server Actions**: Atuam como ponto único de entrada para mutações de dados administrativas. Devem validar autenticação e permissão (`master`/`admin`) antes de invocar a infraestrutura.
- **Supabase SSR**: 
  - **Servidor**: Usar o cliente SSR Server-Side em layouts e Server Components.
  - **Navegador**: Usar a instância Singleton (`createClient()`) persistida em `globalThis`, preservando o mecanismo de lock nativo do Supabase.
- **Serialização Limpa (RSC Boundary)**: Objetos que cruzam a fronteira do servidor para o cliente devem ser serializáveis puros (Plain JSON Objects).

---

### **3. Governança e Processo de Liberação**

1. **Decisões Registradas (ADRs)**: Mudanças estruturais de arquitetura exigem a criação de um documento no diretório `docs/adr/`.
2. **Milestones e Feature Freeze**: Ao concluir o escopo de uma Milestone, institui-se o **Feature Freeze**. Nenhuma funcionalidade nova é adicionada durante esta janela.
3. **UAT Gate (Gate de Homologação)**: A liberação para produção requer a aprovação integral das fases de homologação registradas no `docs/operations/uat-checklist.md`.
