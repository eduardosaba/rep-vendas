# OPTICAL_DISTRIBUTOR_FLOW.md - Fluxo de Vínculo Comercial Ótica - Distribuidora

## 1. Visão Geral

O fluxo comercial define como uma **Ótica** e uma **Distribuidora** se conectam para liberar catálogos, preços personalizados e emissão de pedidos.

---

## 2. Estados do Vínculo Comercial (`commercial_relationship_status`)

```typescript
export type RelationshipStatus =
  | 'pending'   // Solicitação realizada, aguardando aprovação comercial
  | 'approved'  // Vínculo ativo, catálogo e pedidos liberados
  | 'blocked'   // Bloqueado comercialmente ou por crédito
  | 'inactive'; // Vínculo inativo / encerrado
```

---

## 3. Modos de Iniciação do Vínculo

### A. Solicitação pela Ótica
1. A Ótica localiza a Distribuidora no diretório da plataforma.
2. Solicita acesso ao catálogo comercial.
3. O status é gravado como `pending`.
4. A Distribuidora analisa o CNPJ, atribui uma tabela de preço e um representante, e altera o status para `approved`.

### B. Convite pelo Representante / Distribuidora
1. O Representante ou Distribuidora insere o CNPJ da Ótica.
2. Envia um convite ou cadastra a Ótica na carteira.
3. A Ótica confirma o acesso no onboarding ou primeiro login.

---

## 4. Personalização do Catálogo por Ótica

Uma vez `approved`, a Distribuidora pode atribuir à Ótica:
- **Tabela de Preço Específica**: Descontos por grupo de cliente ou tabela negociada.
- **Representante Responsável**: Atribuição direta para comissionamento e atendimento.
- **Marcas Liberadas**: Filtragem de quais marcas a ótica pode visualizar e comprar.
- **Condições de Pagamento e Prazo**: Prazos de faturamento liberados para a ótica.
