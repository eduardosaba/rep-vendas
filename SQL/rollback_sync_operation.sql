-- 1. Remove a função antiga (o parâmetro uuid é necessário para identificar qual função deletar)
DROP FUNCTION IF EXISTS rollback_sync_operation(uuid);

-- 2. Cria a nova versão com suporte a Mídias e retorno JSONB
CREATE OR REPLACE FUNCTION rollback_sync_operation(p_log_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_record RECORD;
    v_item RECORD;
    v_target_col TEXT;
    v_count INTEGER := 0;
BEGIN
    -- Busca os dados do log
    SELECT * INTO v_log_record FROM sync_logs WHERE id = p_log_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Log não encontrado';
    END IF;

    IF v_log_record.rolled_back THEN
        RAISE EXCEPTION 'Operação já desfeita';
    END IF;

    v_target_col := v_log_record.target_column;

    -- Itera sobre os dados de rollback salvos no JSONB
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_log_record.rollback_data) 
        AS x(id UUID, old_value TEXT) 
    LOOP
        -- Lógica específica para Rollback de Imagens
        IF v_target_col = 'image_url' THEN
            UPDATE products 
            SET 
                image_url = v_item.old_value,
                image_path = NULL,             -- Remove o arquivo otimizado (pois agora é antigo)
                image_optimized = FALSE,       -- Desativa o selo verde
                sync_status = 'pending',       -- Marca como pendente para o robô local
                updated_at = NOW()
            WHERE id = v_item.id;
            
            -- Limpa a galeria de fotos secundárias vinculadas
            DELETE FROM product_images WHERE product_id = v_item.id;
        ELSE
            -- Rollback para campos comuns (Preço, Estoque, SKU...)
            EXECUTE format('UPDATE products SET %I = $1, updated_at = NOW() WHERE id = $2', v_target_col)
            USING v_item.old_value, v_item.id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    -- Marca o log como processado para evitar rollback duplo
    UPDATE sync_logs SET rolled_back = TRUE WHERE id = p_log_id;

    RETURN jsonb_build_object(
        'success', true, 
        'affected_rows', v_count,
        'target_column', v_target_col
    );
END;
$$;
