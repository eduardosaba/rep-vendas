# Arquitetura-Alvo 3.0 (TARGET_ARCHITECTURE_3.0.md)

Este documento define a visão arquitetural futura do ecossistema **RepVendas SaaS**, direcionando a evolução multiempresa para atender com excelência tanto o módulo de **Distribuidora B2B** quanto o novo módulo de **Ótica**.

---

## 1. Visão Geral da Arquitetura Multi-Tenant

O RepVendas evoluirá para uma infraestrutura SaaS multi-tenant desacoplada e configurável por feature flags em nível de organização.

```text
               ┌─────────────────────────────────────────┐
               │         Plataforma RepVendas            │
               └────────────────────┬────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │    Fundação Multiempresa Compartilhada  │
               │ (organizations, companies, memberships) │
               └────────────────────┬────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌───────────────────────────┐                       ┌───────────────────────────┐
│     Módulo Distribuidora  │                       │       Módulo Ótica        │
├───────────────────────────┤                       ├───────────────────────────┤
│ • Fila de Orçamentos B2B  │                       │ • Modo Balcão B2C         │
│ • Gestão de Representantes│                       │ • Filtro Formato de Rosto │
│ • Carteira de Clientes    │                       │ • Agendamento de Prova    │
│ • Tabelas de Preço B2B    │                       │ • Contato Direct WhatsApp │
│ • Comissões e Metas       │                       │ • Catálogo Institucional  │
└───────────────────────────┘                       └───────────────────────────┘
```

---

## 2. O que é Compartilhado vs Específico

### Recursos Compartilhados (Base Plataforma)
- Cadastro de Organização / Empresa (`organization_id`, `company_id`);
- Gestão de Usuários e Memberships (`company_users` / `organization_members`);
- Branding visual (Logotipo, Cores Primária/Secundária, Fontes);
- Gestão de Banners (Desktop e Mobile);
- Domínios Próprios e Slugs Customizados;
- Informações Institucionais e Redes Sociais;
- Canal Principal de WhatsApp;
- Licenciamento, Status da Assinatura e Audit Logs;
- Motor Universal de Atualização em Lote de Produtos.

### Regras Específicas da Ótica (B2C / Balcão)
- **Modo Balcão**: Interface limpa para atendimento presencial rápido em loja física;
- **Preço B2C**: Exibição de preço de venda final ao consumidor;
- **Agendamento de Prova**: Solicitação de reserva de horário para provar armação na loja;
- **Formato de Rosto**: Filtro inteligente por formato de rosto (Oval, Redondo, Quadrado, etc.);
- **WhatsApp Direto por Produto**: Envio de dúvida sobre determinado produto específico.

### Regras Específicas da Distribuidora (B2B)
- **Fila de Orçamentos B2B**: Esteira de negociação com representantes e aprovação comercial;
- **Time de Representantes**: Vínculo de carteiras regionais de clientes por vendedor (`seller_id`);
- **Tabelas Comerciais & Comissões**: Regras de comissão por faturamento ou liquidez;
- **Reserva de Estoque e Crédito**: Validação de limite de crédito e reserva antes do faturamento.

---

## 3. Matriz de Feature Flags por Perfil

| Feature Flag | Distribuidora | Ótica |
| :--- | :---: | :---: |
| `distributor_dashboard` | **true** | false |
| `b2b_quotes` | **true** | false |
| `commercial_team` | **true** | false |
| `distributor_branding` | **true** | false |
| `optic_storefront` | false | **true** |
| `counter_mode` | false | **true** |
| `face_shape_filter` | false | **true** |
| `appointment_requests` | false | **true** |
| `whatsapp_product_inquiry` | false | **true** |

---

## 4. Roadmap de Desenvolvimento (5 Fases)

### Fase 0 — Inventário e Governança Documental (EM ANDAMENTO)
- Mapeamento completo da Distribuidora existente e criação da governança documental enxuta.
- Garantia de zero alteração de código e preservação do sistema em produção.

### Fase 1 — Fundação Multiempresa e Memberships
- Criação e consolidação das tabelas de `companies`, `company_users` e `company_settings`.
- Preservação integral dos acessos existentes (nenhum usuário ou distribuidora perde acesso).

### Fase 2 — Configurações Compartilhadas e Branding
- Desacoplamento da aba de personalização visual (`company_branding`).
- Gerenciamento unificado de banners, slugs e redes sociais.

### Fase 3 — Módulo Ótica (Experiência B2C)
- Implementação da vitrine da Ótica, Modo Balcão, Filtro de Formato de Rosto, Agendamento e Preços B2C.

### Fase 4 — Consolidação e Evolução da Distribuidora
- Refatoração da fila B2B para consumir a nova infraestrutura multiempresa.
- Suporte a catálogos abertos, fechados e híbridos.

### Fase 5 — B2B Avançado
- Tabelas de preço por cliente, metas comerciais, recompra inteligente e limites de crédito.
