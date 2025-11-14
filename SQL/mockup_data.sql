-- Script para inserir dados de teste (mockup)
-- Execute este script no SQL Editor do Supabase APÓS corrigir as políticas RLS

-- PASSO 1: Primeiro, obtenha o user_id executando apenas esta consulta:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- PASSO 2: Copie o ID do usuário desejado e substitua na linha abaixo
-- Exemplo: SET my_user_id = '550e8400-e29b-41d4-a716-446655440000';

DO $$
DECLARE
    my_user_id UUID;
    user_id_string TEXT;
BEGIN
    -- ============ CONFIGURAÇÃO: SUBSTITUA PELO SEU USER_ID ============
    -- Execute primeiro: SELECT id, email FROM auth.users;
    -- Depois copie o ID aqui:
    user_id_string := 'fe7ea2fc-afd4-4310-a080-266fca8186a7';  -- ← SUBSTITUA ESTE VALOR!

    -- Converter para UUID após validação
    BEGIN
        my_user_id := user_id_string::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO: O UUID fornecido "%" não é válido. Deve ter 36 caracteres no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.', user_id_string;
    END;

    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = my_user_id) THEN
        RAISE EXCEPTION 'ERRO: Usuário com ID % não encontrado. Verifique o ID na tabela auth.users.', my_user_id;
    END IF;

    RAISE NOTICE 'Inserindo dados de teste para o usuário: %', my_user_id;

-- Inserir produtos de teste com diferentes marcas
INSERT INTO products (reference_code, name, description, brand, price, image_url, user_id) VALUES
-- Produtos da marca "Samsung"
('SAM-TV-55', 'Smart TV Samsung 55" 4K UHD', 'TV LED 4K UHD com HDR, Smart TV com Tizen OS, 3 HDMI, 2 USB, Wi-Fi integrado', 'Samsung', 3299.99, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', my_user_id),
('SAM-GAL-A54', 'Galaxy A54 5G 128GB', 'Smartphone Android com tela de 6.4", processador Exynos 1380, câmera tripla de 50MP, bateria de 5000mAh', 'Samsung', 1899.99, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400', my_user_id),
('SAM-WASH-12KG', 'Lavadora Samsung 12KG', 'Lavadora de roupas com 12kg de capacidade, 10 programas de lavagem, inverter motor, Wi-Fi', 'Samsung', 2499.99, 'https://images.unsplash.com/photo-1626806787426-5910811b6325?w=400', my_user_id),
('SAM-REF-400L', 'Refrigerador Samsung 400L', 'Refrigerador frost free 400L, dispenser de água, prateleiras ajustáveis, luz interna LED', 'Samsung', 3899.99, 'https://images.unsplash.com/photo-1584568694244-14e2c92a7d9c?w=400', my_user_id),

-- Produtos da marca "Apple"
('APL-IPH-14', 'iPhone 14 Pro 128GB', 'Smartphone iOS com Dynamic Island, câmera tripla profissional de 48MP, chip A16 Bionic', 'Apple', 6999.99, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400', my_user_id),
('APL-MAC-M2', 'MacBook Air M2 13"', 'Notebook com chip M2, 8GB RAM, SSD 256GB, tela Retina 13.6", bateria até 18h', 'Apple', 8999.99, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', my_user_id),
('APL-IPAD-PRO', 'iPad Pro 12.9" M2', 'Tablet profissional com chip M2, tela Liquid Retina XDR, Apple Pencil Pro, Magic Keyboard', 'Apple', 11999.99, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', my_user_id),
('APL-AIRPODS', 'AirPods Pro (2ª geração)', 'Fones de ouvido wireless com cancelamento ativo de ruído, modo transparência, estojo de carregamento', 'Apple', 1899.99, 'https://images.unsplash.com/photo-1606220945770-b5b6c2c9f188?w=400', my_user_id),

-- Produtos da marca "LG"
('LG-TV-65', 'Smart TV LG 65" OLED 4K', 'TV OLED 4K com webOS, α9 Gen5 AI Processor, Dolby Vision IQ, HDMI 2.1, Gaming Mode', 'LG', 7999.99, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', my_user_id),
('LG-GEL-450L', 'Geladeira LG 450L', 'Refrigerador InstaView Door-in-Door, Linear Compressor, NatureFRESH, Wi-Fi integrado', 'LG', 4599.99, 'https://images.unsplash.com/photo-1584568694244-14e2c92a7d9c?w=400', my_user_id),
('LG-WASH-14KG', 'Lavadora LG 14KG', 'Lavadora TurboWash 360°, 6 Motion DD, True Steam, TurboShot, Smart Diagnosis', 'LG', 3299.99, 'https://images.unsplash.com/photo-1626806787426-5910811b6325?w=400', my_user_id),
('LG-AIR-12K', 'Ar Condicionado LG 12.000 BTUs', 'Split Inverter Dual Inverter, Wi-Fi, Auto Clean, 4-Way Swing, Filtro Easy Filter', 'LG', 2899.99, 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400', my_user_id),

-- Produtos da marca "Sony"
('SONY-TV-55', 'Smart TV Sony 55" LED 4K', 'TV LED 4K UHD Android TV, Google Assistant, Chromecast integrado, 4K HDR, Motionflow XR', 'Sony', 3799.99, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', my_user_id),
('SONY-PS5', 'PlayStation 5 Digital Edition', 'Console de videogame com SSD ultra-rápido, Ray Tracing, 825GB, controles DualSense', 'Sony', 3999.99, 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400', my_user_id),
('SONY-WH-1000XM4', 'Fones Sony WH-1000XM4', 'Fones wireless com cancelamento de ruído líder da indústria, 30h bateria, Quick Charge', 'Sony', 1499.99, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', my_user_id),
('SONY-A7IV', 'Sony α7 IV Mirrorless', 'Câmera full-frame mirrorless, sensor 33MP, 4K 60p, autofocus em tempo real, estabilização 5-axis', 'Sony', 18999.99, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400', my_user_id),

-- Produtos da marca "Dell"
('DELL-XPS-13', 'Dell XPS 13 9310', 'Notebook ultrabook com Intel Core i7, 16GB RAM, SSD 512GB, tela InfinityEdge 13.4" 4K', 'Dell', 8999.99, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', my_user_id),
('DELL-27-4K', 'Monitor Dell S2721D 27" 4K', 'Monitor IPS 4K UHD, 60Hz, USB-C, HDR10, AMD FreeSync, VESA mount', 'Dell', 2299.99, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', my_user_id),
('DELL-MOUSE-WIRELESS', 'Dell Wireless Mouse MS5320W', 'Mouse wireless ergonômico, scroll óptico, bateria de longa duração, conexão USB', 'Dell', 89.99, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', my_user_id),
('DELL-KEYBOARD-KB216', 'Dell Keyboard KB216', 'Teclado membrana com numérico, layout ABNT2, USB, design compacto', 'Dell', 79.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', my_user_id),

-- Produtos da marca "Nike"
('NIK-AIR-MAX', 'Nike Air Max 270', 'Tênis lifestyle com amortecimento Air Max, cabedal em mesh respirável, sola Air de 32mm', 'Nike', 699.99, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', my_user_id),
('NIK-JORDAN-1', 'Nike Air Jordan 1 High OG', 'Tênis icônico com cabedal em couro premium, swoosh lateral, sola Air para amortecimento', 'Nike', 1299.99, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', my_user_id),
('NIK-TECH-FLEECE', 'Nike Tech Fleece Hoodie', 'Moletom com tecnologia de isolamento térmico, capuz ajustável, bolsos laterais', 'Nike', 399.99, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', my_user_id),
('NIK-BAG-BRASILIA', 'Nike Brasilia Training Duffel Bag', 'Mochila esportiva com compartimento principal, bolsos laterais, alças ajustáveis', 'Nike', 149.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', my_user_id),

-- Produtos da marca "Adidas"
('ADI-ULTRABOOST', 'Adidas Ultraboost 22', 'Tênis running com Boost midsole, cabedal Primeknit, Continental rubber outsole', 'Adidas', 899.99, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', my_user_id),
('ADI-STAN-SMITH', 'Adidas Stan Smith', 'Tênis clássico em couro branco, sola de borracha, design atemporal', 'Adidas', 499.99, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', my_user_id),
('ADI-TRACK-JACKET', 'Adidas Track Jacket', 'Jaqueta esportiva com zíper, punhos elásticos, logo 3-Stripes nas mangas', 'Adidas', 299.99, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', my_user_id),
('ADI-BACKPACK', 'Adidas Defender III Backpack', 'Mochila esportiva com compartimento principal, bolsos frontais, alças acolchoadas', 'Adidas', 199.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', my_user_id),

-- Produtos da marca "Electrolux"
('ELX-AIR-10K', 'Ar Condicionado Electrolux 10.000 BTUs', 'Split inverter, filtro antibacterial, timer, função sleep, controle remoto', 'Electrolux', 2199.99, 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400', my_user_id),
('ELX-VAC-1400W', 'Aspirador Electrolux 1400W', 'Aspirador ciclônico com filtro HEPA, potência de 1400W, depósito de 2L, acessórios inclusos', 'Electrolux', 349.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', my_user_id),
('ELX-MICROWAVE', 'Micro-ondas Electrolux 30L', 'Micro-ondas com 30L capacidade, 10 níveis de potência, grill, função descongelar', 'Electrolux', 599.99, 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400', my_user_id),
('ELX-BLENDER', 'Liquidificador Electrolux 2L', 'Liquidificador com jarra de 2L, 3 velocidades + pulsar, lâminas em aço inox, filtro anti-ruído', 'Electrolux', 199.99, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', my_user_id);

-- Inserir alguns clientes de teste (opcional)
INSERT INTO clients (name, email, phone, user_id) VALUES
('João Silva', 'joao.silva@email.com', '(11) 99999-0001', my_user_id),
('Maria Santos', 'maria.santos@email.com', '(11) 99999-0002', my_user_id),
('Pedro Oliveira', 'pedro.rodrigues@email.com', '(11) 99999-0003', my_user_id),
('Ana Costa', 'ana.costa@email.com', '(11) 99999-0004', my_user_id),
('Carlos Rodrigues', 'carlos.rodrigues@email.com', '(11) 99999-0005', my_user_id);

-- Inserir alguns pedidos de teste (opcional)
INSERT INTO orders (client_id, status, total_value, order_type, quick_brand, quick_quantity, user_id) VALUES
((SELECT id FROM clients WHERE name = 'João Silva' AND user_id = my_user_id LIMIT 1), 'Pendente', 3299.99, 'full_catalog', NULL, NULL, my_user_id),
(NULL, 'Completo', 5000.00, 'quick_brand', 'Samsung', 10, my_user_id),
((SELECT id FROM clients WHERE name = 'Maria Santos' AND user_id = my_user_id LIMIT 1), 'Pendente', 899.99, 'full_catalog', NULL, NULL, my_user_id);

-- Mensagem de confirmação
RAISE NOTICE 'Dados de teste inseridos com sucesso! Total de produtos: %', (SELECT COUNT(*) FROM products WHERE user_id = my_user_id);

END;
$$;