-- RPC: get_dashboard_clients_count
-- Calcula a quantidade de clientes únicos a partir dos pedidos (registrados + guests)
CREATE OR REPLACE FUNCTION get_dashboard_clients_count(
  p_owner_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT (
      CASE
        WHEN client_id IS NOT NULL THEN 'reg_' || client_id::text
        WHEN client_phone_guest IS NOT NULL AND client_phone_guest <> '' THEN 'ph_' || regexp_replace(client_phone_guest, '\\D', '', 'g')
        WHEN client_email_guest IS NOT NULL AND client_email_guest <> '' THEN 'em_' || lower(trim(client_email_guest))
        ELSE 'unknown_' || id::text
      END
    ))
    FROM orders
    WHERE user_id = p_owner_id
      AND created_at >= p_start_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
