-- HOMOLOGACAO DISTRIBUIDORA (MULTI-TENANT)
-- Data: 2026-04-15
-- Objetivo: validar fluxo completo empresa + admin + carga + heranca + pedidos + isolamento
-- Observacao: no schema atual de products, a coluna de ownership individual e user_id (equivalente ao profile_id do plano).

-- =========================
-- 0) PARAMETROS DO TESTE
-- =========================
-- Ajuste estes valores para o seu teste real.
-- Sugestao inicial:
--   slug da empresa: saba-distrib
--   email admin: admin.saba.teste@exemplo.com

-- Use este bloco como referencia para copiar os valores para consultas abaixo.
-- Nao execute como SQL dinamico; apenas substitua manualmente quando necessario.


-- ============================================
-- 1) PREPARACAO (TORRE DE CONTROLE)
-- ============================================
-- 1.1 Validar empresa criada
select id, name, slug, cnpj, created_at
from companies
where slug = 'saba-distrib';

-- 1.1.1 (Opcional) Validar se o schema possui owner_user_id
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'companies'
  and column_name = 'owner_user_id';

-- 1.2 Validar profile do admin vinculado a company_id correta
select p.id, p.full_name, p.email, p.role, p.company_id, p.status, p.updated_at
from profiles p
join companies c on c.id = p.company_id
where c.slug = 'saba-distrib'
order by p.created_at desc nulls last;

-- 1.2.1 Descobrir roles realmente existentes no banco atual
-- (evita suposicoes quando o enum user_role diverge entre ambientes)
select distinct p.role::text as role
from profiles p
order by role;

-- 1.3 Validar se existe perfil administrador para a distribuidora
-- Usa cast para texto para nao quebrar se 'admin_company' nao existir no enum local.
select
  count(*) filter (where p.role::text = 'admin_company') as total_admin_company,
  count(*) filter (where p.role::text = 'admin') as total_admin,
  count(*) filter (where p.role::text = 'representative') as total_representative,
  count(*) filter (where p.role::text = 'master') as total_master
from profiles p
join companies c on c.id = p.company_id
where c.slug = 'saba-distrib'
;

-- 1.4 Diagnostico rapido (quando 1.2 ou 3.1 vier sem linhas)
-- 1.4.1 Totais por empresa (consulta corrigida: use count(*), nao count())
select
  c.id,
  c.slug,
  (select count(*) from profiles p where p.company_id = c.id) as total_perfis,
  (select count(*) from products pr where pr.company_id = c.id) as total_produtos
from companies c
where c.slug = 'saba-distrib';

-- 1.4.2 Encontrar perfil pelo e-mail do admin de teste
-- Substitua pelo e-mail real usado no login do admin.
select id, full_name, email, role, company_id, status
from profiles
where lower(email) = lower('admin.saba.teste@exemplo.com');

-- 1.4.3 Se o perfil existir, vincular a empresa e ativar acesso corporativo
-- IMPORTANTE: ajuste o e-mail antes de executar.
update profiles
set
  company_id = (select id from companies where slug = 'saba-distrib' limit 1),
  role = 'representative',
  status = 'active',
  can_manage_catalog = true,
  updated_at = now()
where lower(email) = lower('admin.saba.teste@exemplo.com')
returning id, full_name, email, role, company_id, status, can_manage_catalog;


-- ============================================
-- 2) CARGA DE DADOS (EXCEL/PROCV)
-- ============================================
-- 2.1 Resumo dos produtos da distribuidora
-- IMPORTANTE: neste schema, user_id em products e NOT NULL.
-- Portanto, o ownership corporativo e validado por company_id (nao por user_id nulo).
select
  c.slug,
  count(*) as total_produtos,
  sum(case when pr.company_id is not null then 1 else 0 end) as produtos_com_company_id,
  sum(case when pr.company_id is null then 1 else 0 end) as produtos_sem_company_id,
  count(distinct pr.user_id) as usuarios_origem_distintos
from products pr
join companies c on c.id = pr.company_id
where c.slug = 'saba-distrib'
group by c.slug;

-- Esperado apos import corporativo:
-- - total_produtos >= 10
-- - produtos_com_company_id = total_produtos
-- - produtos_sem_company_id = 0

-- 2.2 Lista dos 20 produtos mais recentes no escopo da distribuidora
select
  pr.id,
  pr.name,
  pr.sku,
  pr.reference_code,
  pr.company_id,
  pr.user_id,
  pr.image_url,
  pr.created_at
from products pr
join companies c on c.id = pr.company_id
where c.slug = 'saba-distrib'
order by pr.created_at desc
limit 20;

-- 2.3 Sanidade: detectar produtos da distribuidora sem user_id
-- (neste schema user_id e NOT NULL, inclusive para tenant corporativo)
select pr.id, pr.name, pr.company_id, pr.user_id
from products pr
join companies c on c.id = pr.company_id
where c.slug = 'saba-distrib'
  and pr.user_id is null
limit 50;


-- ============================================
-- 3) HERANCA MULTI-VENDEDORES
-- ============================================
-- 3.1 Listar vendedores da distribuidora
select p.id, p.full_name, p.email, p.role, p.company_id, p.status
from profiles p
join companies c on c.id = p.company_id
where c.slug = 'saba-distrib'
  and p.role::text in ('rep', 'representative', 'seller', 'user', 'rep_company', 'individual', 'admin_company', 'admin', 'master')
order by p.role, p.full_name;

-- 3.2 Confirmar que catalogo da empresa tem os mesmos produtos base
select c.slug, count(*) as total_produtos_catalogo
from products pr
join companies c on c.id = pr.company_id
where c.slug = 'saba-distrib'
group by c.slug;

-- Validacao funcional manual no browser:
-- - abrir /vendedor-a e /vendedor-b
-- - ambos devem enxergar os mesmos produtos da distribuidora


-- ============================================
-- 4) PEDIDO, FATURAMENTO E COMISSAO
-- ============================================
-- 4.1 Ultimos pedidos da distribuidora
select
  o.id,
  o.display_id,
  o.created_at,
  o.status,
  o.total_value,
  o.user_id,
  o.customer_id,
  o.company_id
from orders o
join companies c on c.id = o.company_id
where c.slug = 'saba-distrib'
order by o.created_at desc
limit 30;

-- 4.2 Pedido com representante e cliente (visao expandida)
select
  o.display_id,
  o.status,
  o.total_value,
  o.created_at,
  rp.full_name as representante,
  coalesce(cu.name, o.client_name_guest) as cliente
from orders o
join companies c on c.id = o.company_id
left join profiles rp on rp.id = o.user_id
left join customers cu on cu.id = o.customer_id
where c.slug = 'saba-distrib'
order by o.created_at desc
limit 30;

-- 4.3 Se existir tabela de comissoes, validar geracao (ajuste nome/colunas se necessario)
-- select *
-- from commissions cm
-- join companies c on c.id = cm.company_id
-- where c.slug = 'saba-distrib'
-- order by cm.created_at desc
-- limit 30;


-- ============================================
-- 5) ISOLAMENTO (SEGURANCA SAAS)
-- ============================================
-- 5.1 Conferir se produtos da distribuidora nao estao sem owner
-- Observacao: para itens da distribuidora, company_id deve estar preenchido.
-- Esta consulta mede produtos sem owner no sistema inteiro (deve ser 0).
select count(*) as produtos_sem_owner_global
from products pr
where pr.company_id is null
  and pr.user_id is null;

-- 5.2 Conferir distribuicao de produtos por tenant (top 20)
select
  coalesce(c.slug, 'tenant_individual') as tenant,
  count(*) as total_produtos
from products pr
left join companies c on c.id = pr.company_id
group by coalesce(c.slug, 'tenant_individual')
order by total_produtos desc
limit 20;

-- 5.3 Investigar colisao de referencia/sku entre tenants (nao e erro por si so,
--     mas ajuda a validar se os endpoints estao devidamente escopados)
select
  pr.reference_code,
  pr.sku,
  count(*) as ocorrencias,
  count(distinct pr.company_id) as empresas_envolvidas,
  count(distinct pr.user_id) as usuarios_envolvidos
from products pr
where pr.reference_code is not null or pr.sku is not null
group by pr.reference_code, pr.sku
having count(*) > 1
order by ocorrencias desc
limit 50;

-- 5.4 Validacao anti-update cruzado (company x individual)
-- Objetivo: confirmar que o import da distribuidora nao sobrescreveu produtos de usuarios individuais
-- com mesmo reference_code/sku.

-- 5.4.1 Quantos produtos da distribuidora colidem por chave comercial com produtos individuais
-- (colisao pode existir; nao e falha por si so).
with target_company as (
  select id
  from companies
  where slug = 'saba-distrib'
  limit 1
)
select count(*) as colisoes_company_vs_individual
from products cp
join target_company tc on tc.id = cp.company_id
join products ip on ip.company_id is null
  and ip.user_id is not null
  and (
    (cp.reference_code is not null and ip.reference_code = cp.reference_code)
    or (cp.sku is not null and ip.sku = cp.sku)
  );

-- 5.4.2 Amostra das colisoes para auditoria manual de timestamps e ownership.
with target_company as (
  select id
  from companies
  where slug = 'saba-distrib'
  limit 1
)
select
  cp.id as company_product_id,
  cp.reference_code as company_reference_code,
  cp.sku as company_sku,
  cp.company_id as company_owner,
  cp.user_id as company_user_id,
  cp.updated_at as company_updated_at,
  ip.id as individual_product_id,
  ip.company_id as individual_company_id,
  ip.user_id as individual_owner_user_id,
  ip.updated_at as individual_updated_at
from products cp
join target_company tc on tc.id = cp.company_id
join products ip on ip.company_id is null
  and ip.user_id is not null
  and (
    (cp.reference_code is not null and ip.reference_code = cp.reference_code)
    or (cp.sku is not null and ip.sku = cp.sku)
  )
order by cp.updated_at desc nulls last, ip.updated_at desc nulls last
limit 50;

-- 5.4.3 Regra de ouro do tenant corporativo (schema atual):
-- item da distribuidora deve ter company_id preenchido e user_id tambem preenchido.
select count(*) as produtos_company_com_user_id_nulo
from products pr
join companies c on c.id = pr.company_id
where c.slug = 'saba-distrib'
  and pr.user_id is null;

-- FIM
