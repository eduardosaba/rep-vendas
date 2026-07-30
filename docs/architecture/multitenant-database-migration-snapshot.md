# 📑 Snapshot Arquitetural — Migração de Banco Multitenant Soberano (Fase 1A & Fase 2)

**Data do Registro**: 30 de Julho de 2026  
**Branch**: `feature/optical-distributor-foundation`  
**Status**: 🟢 CONCLUÍDO E HOMOLOGADO EM BANCO

---

## 📌 Contexto e Resumo Executivo

O sistema Rep Vendas concluiu com sucesso a transição de um modelo de banco centrado em `user_id` para a **Arquitetura Multitenant Soberana baseada em `organization_id`**.

Nenhum dado legado foi excluído ou corrompido. O campo `user_id` foi mantido intacto em 100% das tabelas para prescrever autoria e histórico, enquanto o `organization_id` assumiu a autoridade de isolamento multi-tenant.

---

## 📊 Tabela de Reconciliação Total de Dados

### 1. Reconciliação do Catálogo de Produtos (`public.products`)
* **Produtos Migrados para Organizações Ativas**: 17.616 produtos
* **Produtos Preservados em Contas de Teste / Revisão**: 21 produtos (distribuídos entre `teste@repvendas.com.br` e `oticasaba@repvendas.com.br`)
* **TOTAL RECONCILIADO**: **17.637 produtos (100.00% do acervo)**

### 2. Reconciliação de Pedidos (`public.orders`)
* **Pedidos Migrados para Organizações Ativas**: 167 pedidos
* **Pedidos Preservados em Contas de Teste / Revisão**: 3 pedidos (distribuídos entre contas de teste e validação técnica)
* **TOTAL RECONCILIADO**: **170 pedidos (100.00% do histórico)**

---

## 🏛️ Mapa Geral das 24 Organizações Criadas

| Nome da Organização | Tipo (`organization_type`) | Produtos | Pedidos | Papel do Usuário (`organization_members`) |
| :--- | :--- | :--- | :--- | :--- |
| **Catálogo Mestre de Ótica** | `catalog_template` | **4.141** | 1 | `owner` (`template-otica@repvendas.com.br`) |
| **Jad Saba** | `independent_representative` | **1.366** | 11 | `owner` (`jadneto@uol.com.br`) |
| **Lucas Venâncio** | `independent_representative` | **1.233** | 1 | `owner` (`lucasvenanciocunha@gmail.com`) |
| **Eldro Souto** | `independent_representative` | **1.123** | 5 | `owner` (`eldrosouto@hotmail.com`) |
| **Lima Jr** | `independent_representative` | **1.122** | 0 | `owner` (`batista.limajunior@yahoo.com`) |
| **Itelson Rodrigues** | `independent_representative` | **1.082** | 3 | `owner` (`itelsonrep@gmail.com`) |
| **Rodrigo** | `independent_representative` | **1.082** | 2 | `owner` (`rodrigoreprj@gmail.com`) |
| **Carlos** | `independent_representative` | **1.082** | 5 | `owner` (`carlosrepresentantesafilo@gmail.com`) |
| **Renato Martino** | `independent_representative` | **1.074** | 6 | `owner` (`renatocmartino@yahoo.com.br`) |
| **Bruno Tepedino** | `independent_representative` | **996** | 0 | `owner` (`brunotepedino@hotmail.com`) |
| **Eduardo Saba Representações** | `independent_representative` | **949** | 120 | `owner` (`eduardopedro.fsa@gmail.com`) |
| **Marcelo Louzada** | `independent_representative` | **617** | 5 | `owner` (`marcelouzadacorre@gmail.com`) |
| **Ednei Gubert** | `independent_representative` | **617** | 0 | `owner` (`edneigubert@gmail.com`) |
| **Rogério Martino** | `independent_representative` | **543** | 3 | `owner` (`rogerioluxx@gmail.com`) |
| **Guto Tortola - Tommy Hilfiger** | `independent_representative` | **389** | 1 | `owner` (`guto.safilo@gmail.com`) |
| **Carlos Fitipaldi** | `independent_representative` | **200** | 2 | `owner` (`chfitti@gmail.com`) |
| **lojacasaconrado2** | `optical_store` | **1** | 0 | `owner` (`lojacasaconrado2@gmail.com`) |
| **Simulação Save Settings** | `independent_representative` | 0 | 1 | `owner` |
| **REp 1 Keeper** | `independent_representative` | 0 | 0 | `owner` |
| **Lucca Saba** | `independent_representative` | 0 | 0 | `owner` |
| **Eduardo Saba (Master)** | `independent_representative` | 0 | 0 | `owner` |
| **Distribuidora Alpha** | `distributor` | 0 | 0 | Organização Base B2B |
| **Distribuidora Beta** | `distributor` | 0 | 0 | Organização Base B2B |
| **Distribuidora Teste** | `distributor` | 0 | 0 | Organização Base B2B |

---

## 🛠️ Novas Tabelas e Colunas do Sistema

1. **`public.legacy_user_organization_map`**: Tabela de staging e auditoria permanente do backfill.
2. **`public.organization_members`**: Associação `(organization_id, user_id, role, status)` ativada com RLS.
3. **`public.organization_relationships`**: Vínculos B2B `(source_organization_id, target_organization_id, relationship_type)` ativada com RLS.
4. **Campos de Rastreabilidade em `public.products`**:
   * `organization_id`
   * `source_product_id`
   * `source_organization_id`
   * `cloned_at`
   * `cloned_by_user_id`

---

## 🔒 Regras da Próxima Fase (`feature/organization-context`)

1. **Validação Server-side**: Toda requisição validará o `organization_id` do usuário estritamente contra a tabela `public.organization_members`. O cliente **nunca** definirá arbitrariamente seu tenant.
2. **Tratamento de `catalog_template`**: Bloqueado no servidor para operações comerciais (`can_sell = false`, `can_buy = false`, `can_receive_orders = false`).
3. **Manutenção Transitória de RLS**: A regra RLS híbrida (`organization_id IN (...) OR user_id = auth.uid() OR is_master()`) será mantida até a homologação completa das Server Actions.
