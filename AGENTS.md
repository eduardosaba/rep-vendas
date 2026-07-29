# AGENTS.md — Diretrizes Oficiais para IAs no RepVendas

Este arquivo contém regras obrigatórias para qualquer agente de IA que analise, planeje ou altere o ecossistema RepVendas.

---

## 1. Fontes Oficiais e Hierarquia da Verdade

A fonte da verdade executável do banco de dados é:
1. `supabase/migrations/`
2. `src/types/database.types.ts`

A fonte da verdade das regras de domínio é:
1. `src/domain/`
2. Serviços, hooks e componentes efetivamente utilizados em `src/`

A documentação possui as seguintes responsabilidades:
- `docs/CURRENT_STATE.md`: índice do que está efetivamente implementado (com links para o código e status de verificação);
- `docs/TARGET_ARCHITECTURE_3.0.md`: visão e metas da arquitetura futura;
- `docs/modules/`: regras estáveis dos Bounded Contexts;
- `docs/adr/`: registros de decisões arquiteturais e suas justificativas.

> [!IMPORTANT]
> Nunca trate um documento Markdown como prova de que uma tabela, campo, rota ou recurso está implementado. Confirme no código e nas migrations.

---

## 2. Verificação Obrigatória

Antes de sugerir ou implementar qualquer mudança:
1. Leia `docs/CURRENT_STATE.md`.
2. Leia as partes relevantes de `docs/TARGET_ARCHITECTURE_3.0.md`.
3. Leia o documento do módulo afetado em `docs/modules/`.
4. Inspecione `supabase/migrations/`.
5. Inspecione `src/types/database.types.ts`.
6. Pesquise implementações existentes no código.
7. Verifique ADRs relacionados em `docs/adr/`.

Nunca assuma que um recurso não existe apenas porque ele não foi encontrado na primeira busca.

---

## 3. Bounded Contexts

O RepVendas é dividido nos seguintes eixos principais de domínio:

### Comercial (`src/domain/commercial/` ou equivalentes em `src/`)
- Pricing engine, draft orders, orçamentos B2B, checkout, pedidos comerciais, aprovação comercial, condições de pagamento, comissões, `commercial_status`.

### Fulfillment (`src/domain/fulfillment/` ou equivalentes em `src/`)
- Separação, pick lists, reserva e baixa de estoque, notas fiscais, expedições, entregas, `operational_status`.

### Autorização e Governança (`src/domain/auth/` ou equivalentes em `src/`)
- Autenticação, memberships, organizações, empresas (`companies`), roles, categorias de usuários, permissões de negócio, feature flags, RLS multi-tenant, branding por organização.

### Comunicação e Eventos (`src/domain/notifications/` ou equivalentes em `src/`)
- Eventos de pedidos, transactional outbox, dispatcher, notificações, timeline, tentativas e falhas de envio.

*Não introduza dependências circulares entre os Bounded Contexts.*

---

## 4. Multi-Tenancy

Toda entidade pertencente a uma empresa deve possuir ou derivar de forma inequívoca um `organization_id` (ou `company_id`).

Nunca autorize acesso apenas por um identificador recebido no payload do cliente sem validação no servidor.

Toda operação deve validar:
- Usuário autenticado (`auth.uid()`);
- Membership ativa;
- Organização/Empresa correta;
- Permissão de negócio;
- Feature disponível para a organização;
- Status da organização quando aplicável.

Consultas multi-tenant não podem depender somente de filtros no frontend.

---

## 5. Operações Transacionais

Operações que alteram múltiplas tabelas e precisam ser atômicas devem preferencialmente utilizar funções transacionais no PostgreSQL.

Use `SECURITY DEFINER` somente quando necessário (ex: quando a operação precisar executar ações administrativas que não podem ser realizadas com as permissões RLS normais do usuário).

Toda função `SECURITY DEFINER` deve:
- Definir `search_path` explicitamente (`set search_path = public`);
- Validar `auth.uid()`;
- Validar a organização (`organization_id`/`company_id`);
- Validar as permissões de negócio;
- Restringir a permissão `EXECUTE` para perfis apropriados;
- Evitar SQL dinâmico inseguro;
- Registrar auditoria quando necessário.

---

## 6. Concorrência Otimista (OCC)

Operações sujeitas a edição ou processamento concorrente devem utilizar Concorrência Otimista (OCC) com `expected_version` ou mecanismo equivalente.

Isso se aplica especialmente a:
- Pedidos e orçamentos;
- Estoque e movimentações;
- Pick lists e separação;
- Faturamento e expedições;
- Transições de workflow de aprovação.

Conflitos de versão não devem sobrescrever dados silenciosamente.

---

## 7. Tipagem e Regras de Domínio

Não utilize magic strings ou magic numbers para:
- Status (comercial ou operacional);
- Permissões e roles;
- Categorias de usuários;
- Tipos de pedido;
- Regras de preço e comissão;
- Métodos de pagamento;
- Tipos de evento.

Utilize tipos, constantes e enums definidos na camada de domínio. Valores monetários não devem utilizar ponto flutuante para cálculos financeiros críticos.

---

## 8. Compatibilidade e Migração de Dados

Antes de remover ou renomear qualquer estrutura no banco ou no código, verifique:
- Imports, rotas, hooks e componentes React;
- RPCs, triggers, policies e views no banco;
- Índices, jobs e integrações externas;
- Registros existentes na base de dados.

Mudanças destrutivas devem ser realizadas em etapas (adicionar nova estrutura → manter compatibilidade → migrar dados → migrar consumidores → remover legado em migration posterior).

---

## 9. Protocolo Obrigatório de Resposta

Antes de propor qualquer alteração estrutural, apresente o diagnóstico:
- [ ] Objetivo da mudança
- [ ] Estado atual encontrado no código
- [ ] Módulos afetados
- [ ] Arquivos afetados
- [ ] Tabelas, views, triggers e RPCs afetadas
- [ ] Migrations necessárias
- [ ] Impacto nas RLS
- [ ] Compatibilidade com `organization_id`
- [ ] Riscos de regressão e estratégia de rollback
- [ ] Documentação a ser atualizada

---

## 10. Atualização Documental

Não copie schemas completos de tabelas para os arquivos Markdown.

Ao concluir uma feature:
- Atualize `CURRENT_STATE.md` apenas com referências objetivas, links de código e status de verificação;
- Atualize o documento do módulo em `docs/modules/` somente quando uma regra estável de negócio mudar;
- Crie ou altere ADR em `docs/adr/` somente quando houver decisão arquitetural relevante;
- Atualize a arquitetura-alvo `TARGET_ARCHITECTURE_3.0.md` quando a direção estratégica evoluir.
