create or replace function public.clone_catalog_products_v2(
    p_source_user_id uuid,
    p_target_user_id uuid,
    p_target_organization_id uuid,
    p_brands text[],
    p_cloned_by_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_source_org_id uuid;
    v_source_count integer := 0;
    v_inserted_count integer := 0;
begin

    if p_source_user_id is null then
        raise exception 'Usuário template não informado.';
    end if;

    if p_target_user_id is null then
        raise exception 'Usuário destino não informado.';
    end if;

    if p_target_organization_id is null then
        raise exception 'Organização destino não informada.';
    end if;

    if p_source_user_id = p_target_user_id then
        raise exception 'Origem e destino não podem ser o mesmo usuário.';
    end if;

    if p_brands is null or cardinality(p_brands) = 0 then
        raise exception 'Selecione pelo menos uma marca.';
    end if;


    /*
     * Organização principal do template.
     */
    select organization_id
      into v_source_org_id
    from public.products
    where user_id = p_source_user_id
      and organization_id is not null
    group by organization_id
    order by count(*) desc
    limit 1;


    if v_source_org_id is null then
        raise exception
            'Não foi possível identificar a organização do template.';
    end if;


    /*
     * Quantidade encontrada na origem.
     */
    select count(*)
      into v_source_count
    from public.products p
    where p.user_id = p_source_user_id
      and exists (
          select 1
          from unnest(p_brands) b
          where lower(trim(b)) = lower(trim(p.brand))
      );


    if v_source_count = 0 then
        raise exception
            'Nenhum produto encontrado no template para as marcas selecionadas.';
    end if;


    /*
     * CLONAGEM
     */
    with source_products as (

        select
            p.*,
            gen_random_uuid() as new_id

        from public.products p

        where p.user_id = p_source_user_id

          and exists (
              select 1
              from unnest(p_brands) b
              where lower(trim(b)) = lower(trim(p.brand))
          )

          /*
           * Evita duplicação.
           */
          and not exists (
              select 1
              from public.products d
              where d.user_id = p_target_user_id
                and (
                       d.source_product_id = p.id

                    or (
                        p.reference_code is not null
                        and d.reference_code = p.reference_code
                    )
                )
          )
    ),

    inserted as (

        insert into public.products (

            id,
            reference_code,
            name,
            description,
            brand,
            price,
            image_url,

            user_id,

            bestseller,
            created_at,
            updated_at,
            is_launch,

            category_id,
            images,
            is_best_seller,
            category,

            original_price,
            technical_specs,
            discount_percent,

            stock_quantity,
            track_stock,

            sku,
            barcode,
            color,

            is_active,

            external_image_url,
            image_path,
            short_id,

            last_import_id,
            sale_price,
            slug,

            min_stock_level,
            manage_stock,
            image_optimized,

            cost,
            original_product_id,
            image_is_shared,

            sync_status,
            sync_error,

            original_size_kb,
            optimized_size_kb,

            class_core,
            image_variants,
            gallery_images,

            gender,
            linked_images,
            reference_id,

            organization_id,
            is_destaque,
            company_id,

            material,
            fotocromatico,
            polarizado,
            material_haste,
            colecao,
            frame_formato,
            color_nome,
            tipo_montagem,

            source_product_id,
            source_organization_id,
            cloned_at,
            cloned_by_user_id,

            price_on_request
        )

        select

            sp.new_id,

            sp.reference_code,
            sp.name,
            sp.description,
            sp.brand,
            sp.price,
            sp.image_url,

            p_target_user_id,

            sp.bestseller,
            now(),
            now(),
            sp.is_launch,

            /*
             * IDs vinculados ao tenant/template não são herdados.
             */
            null,

            sp.images,
            sp.is_best_seller,
            sp.category,

            sp.original_price,
            sp.technical_specs,
            sp.discount_percent,

            sp.stock_quantity,
            sp.track_stock,

            sp.sku,
            sp.barcode,
            sp.color,

            sp.is_active,

            sp.external_image_url,
            sp.image_path,

            substr(
                replace(sp.new_id::text, '-', ''),
                1,
                12
            ),

            null,

            sp.sale_price,

            /*
             * Slug globalmente único.
             */
            regexp_replace(
                lower(
                    coalesce(
                        nullif(trim(sp.slug), ''),
                        trim(sp.name),
                        'produto'
                    )
                ),
                '[^a-z0-9]+',
                '-',
                'g'
            )
            || '-'
            || substr(
                replace(p_target_user_id::text, '-', ''),
                1,
                8
            )
            || '-'
            || substr(
                replace(sp.new_id::text, '-', ''),
                1,
                8
            ),

            sp.min_stock_level,
            sp.manage_stock,
            sp.image_optimized,

            sp.cost,

            /*
             * Compatibilidade + rastreabilidade.
             */
            sp.id,

            true,

            'synced',
            null,

            sp.original_size_kb,
            sp.optimized_size_kb,

            sp.class_core,
            sp.image_variants,
            sp.gallery_images,

            sp.gender,
            sp.linked_images,
            sp.reference_id,

            /*
             * Tenant do cliente.
             */
            p_target_organization_id,

            sp.is_destaque,

            /*
             * Nunca herdar company_id do template.
             */
            null,

            sp.material,
            sp.fotocromatico,
            sp.polarizado,
            sp.material_haste,
            sp.colecao,
            sp.frame_formato,
            sp.color_nome,
            sp.tipo_montagem,

            sp.id,

            coalesce(
                sp.organization_id,
                v_source_org_id
            ),

            now(),

            p_cloned_by_user_id,

            sp.price_on_request

        from source_products sp

        returning id
    )

    select count(*)
      into v_inserted_count
    from inserted;


    return jsonb_build_object(

        'success', true,

        'source_user_id',
        p_source_user_id,

        'source_organization_id',
        v_source_org_id,

        'target_user_id',
        p_target_user_id,

        'target_organization_id',
        p_target_organization_id,

        'source_count',
        v_source_count,

        'inserted_count',
        v_inserted_count,

        'skipped_count',
        v_source_count - v_inserted_count,

        'brands',
        p_brands
    );

end;
$$;


/*
 * Não deixar clientes chamarem essa função diretamente.
 * A API usa service_role.
 */
revoke all
on function public.clone_catalog_products_v2(
    uuid,
    uuid,
    uuid,
    text[],
    uuid
)
from public;

grant execute
on function public.clone_catalog_products_v2(
    uuid,
    uuid,
    uuid,
    text[],
    uuid
)
to service_role;
