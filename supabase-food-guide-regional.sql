-- =====================================================
-- FOOD GUIDE - Sistema de Localização Regional Brasil
-- =====================================================
-- 1. Adiciona campo de região/estado ao perfil do usuário
-- 2. Adiciona coluna de região aos alimentos
-- 3. Popula com alimentos típicos de cada região
-- =====================================================

-- ═══════════════════════════════════════
-- 1. ADICIONAR CAMPOS AO PERFIL
-- ═══════════════════════════════════════

-- Adicionar região ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN (
  'norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'
));

-- Adicionar estado ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;

-- Adicionar região ao food_guide_items
ALTER TABLE food_guide_items ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'nacional';
ALTER TABLE food_guide_items ADD COLUMN IF NOT EXISTS regions JSONB DEFAULT '["nacional"]'::jsonb;

-- Índice para filtrar por região
CREATE INDEX IF NOT EXISTS idx_food_guide_region ON food_guide_items USING GIN(regions);

-- ═══════════════════════════════════════
-- 2. ATUALIZAR ALIMENTOS EXISTENTES COM REGIÕES
-- ═══════════════════════════════════════

-- Alimentos NACIONAIS (disponíveis em todo Brasil)
UPDATE food_guide_items SET regions = '["nacional"]'::jsonb WHERE region IS NULL OR region = 'nacional';

-- Marcar alimentos típicos por região
-- Ovos - nacional
UPDATE food_guide_items SET regions = '["nacional"]'::jsonb WHERE name = 'Ovos';

-- Arroz - nacional
UPDATE food_guide_items SET regions = '["nacional"]'::jsonb WHERE name = 'Arroz branco' OR name = 'Arroz integral';

-- Feijão - nacional (adicionar se não existir)
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Feijão preto', 'protein', 'budget', 132, '{"p":9,"c":24,"f":1}', 5, 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400', '["nacional","sudeste"]'),
('Feijão carioca', 'protein', 'budget', 130, '{"p":9,"c":23,"f":1}', 5, 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400', '["nacional","sudeste"]');

-- ═══════════════════════════════════════
-- 3. ALIMENTOS REGIONAIS - NORTE
-- ═══════════════════════════════════════
-- Amazônia: Açaí, Tucumã, Pato, Pirarucu, Castanha, Tapioca
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Açaí (sem açúcar)', 'carbs', 'balanced', 58, '{"p":1,"c":6,"f":4}', 5, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400', '["norte","nacional"]'),
('Tucumã', 'fats', 'balanced', 235, '{"p":2,"c":28,"f":14}', 4, 'https://images.unsplash.com/photo-1523049673856-356ccc615d82?w=400', '["norte"]'),
('Pirarucu', 'protein', 'premium', 100, '{"p":22,"c":0,"f":1}', 5, 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400', '["norte"]'),
('Tapioca', 'carbs', 'budget', 130, '{"p":0,"c":32,"f":0}', 3, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', '["norte","nordeste","nacional"]'),
('Castanha-do-pará', 'fats', 'premium', 656, '{"p":14,"c":12,"f":66}', 5, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400', '["norte","nacional"]'),
('Farinha de mandioca', 'carbs', 'budget', 357, '{"p":1,"c":86,"f":0}', 3, 'https://images.unsplash.com/photo-1599839575338-31b11ae53f8a?w=400', '["norte","nordeste","nacional"]');

-- ═══════════════════════════════════════
-- 4. ALIMENTOS REGIONAIS - NORDESTE
-- ═══════════════════════════════════════
-- Jerk, Carne de sol, Baião, Tapioca, Macaxeira
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Carne de sol', 'protein', 'balanced', 180, '{"p":28,"c":0,"f":7}', 4, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400', '["nordeste","nacional"]'),
('Baião de dois', 'carbs', 'budget', 180, '{"p":8,"c":28,"f":4}', 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', '["nordeste"]'),
('Macaxeira (Aipim)', 'carbs', 'budget', 160, '{"p":1,"c":38,"f":0}', 3, 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400', '["nordeste","nacional"]'),
('Peixe seco', 'protein', 'budget', 290, '{"p":63,"c":0,"f":3}', 4, 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400', '["nordeste"]'),
('Goiaba', 'carbs', 'budget', 68, '{"p":3,"c":14,"f":1}', 4, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', '["nordeste","nacional"]'),
('Queijo coalho', 'protein', 'balanced', 280, '{"p":22,"c":2,"f":20}', 4, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400', '["nordeste","nacional"]');

-- ═══════════════════════════════════════
-- 5. ALIMENTOS REGIONAIS - CENTRO-OESTE
-- ═══════════════════════════════════════
-- Pequi, Arroz carreteiro, Empadão goiano
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Pequi', 'fats', 'balanced', 250, '{"p":2,"c":5,"f":25}', 4, 'https://images.unsplash.com/photo-1523049673856-356ccc615d82?w=400', '["centro-oeste"]'),
('Arroz carreteiro', 'carbs', 'balanced', 180, '{"p":8,"c":28,"f":4}', 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', '["centro-oeste"]'),
('Guariroba', 'fats', 'budget', 180, '{"p":3,"c":8,"f":15}', 3, 'https://images.unsplash.com/photo-1580984969071-a8da8c4e7b17?w=400', '["centro-oeste"]'),
('Milho verde', 'carbs', 'budget', 86, '{"p":3,"c":19,"f":1}', 3, 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400', '["centro-oeste","nacional"]'),
('Pacu', 'protein', 'balanced', 120, '{"p":20,"c":0,"f":4}', 4, 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400', '["centro-oeste"]');

-- ═══════════════════════════════════════
-- 6. ALIMENTOS REGIONAIS - SUDESTE
-- ═══════════════════════════════════════
-- Feijoada, Virado, Pão de queijo, Cupuaçu
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Pão de queijo', 'carbs', 'balanced', 362, '{"p":6,"c":48,"f":16}', 4, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', '["sudeste","nacional"]'),
('Feijoada completa', 'protein', 'premium', 350, '{"p":22,"c":25,"f":18}', 4, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400', '["sudeste"]'),
('Virado à paulista', 'carbs', 'premium', 280, '{"p":12,"c":35,"f":10}', 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', '["sudeste"]'),
('Cupuaçu', 'carbs', 'balanced', 65, '{"p":2,"c":13,"f":1}', 4, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', '["norte","sudeste"]'),
('Mandioca frita', 'carbs', 'budget', 300, '{"p":2,"c":45,"f":12}', 3, 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400', '["sudeste","nacional"]'),
('Linguiça Toscana', 'protein', 'balanced', 300, '{"p":15,"c":2,"f":26}', 3, 'https://images.unsplash.com/photo-1558030006-450675393462?w=400', '["sudeste","sul","nacional"]');

-- ═══════════════════════════════════════
-- 7. ALIMENTOS REGIONAIS - SUL
-- ═══════════════════════════════════════
-- Churrasco, Pinhão, Chimarrão, Barreado
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url, regions) VALUES
('Pinhão', 'carbs', 'budget', 180, '{"p":3,"c":38,"f":1}', 4, 'https://images.unsplash.com/photo-1599839575338-31b11ae53f8a?w=400', '["sul"]'),
('Chimarrão (erva-mate)', 'carbs', 'budget', 5, '{"p":0,"c":1,"f":0}', 5, 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400', '["sul","nacional"]'),
('Carne de churrasco', 'protein', 'premium', 280, '{"p":26,"c":0,"f":20}', 4, 'https://images.unsplash.com/photo-1558030006-450675393462?w=400', '["sul","nacional"]'),
('Barreado', 'protein', 'premium', 250, '{"p":24,"c":8,"f":14}', 4, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400', '["sul"]'),
('Cuca', 'carbs', 'balanced', 320, '{"p":6,"c":45,"f":13}', 3, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', '["sul"]'),
('Polenta', 'carbs', 'budget', 120, '{"p":3,"c":24,"f":1}', 3, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', '["sul","sudeste","nacional"]');

-- ═══════════════════════════════════════
-- 8. VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════

-- Contar alimentos por região
SELECT 
  jsonb_array_elements_text(regions) as regiao,
  COUNT(*) as quantidade
FROM food_guide_items
GROUP BY regiao
ORDER BY quantidade DESC;

-- Verificar distribuição por região e categoria
SELECT 
  region,
  category,
  COUNT(*) as alimentos
FROM food_guide_items
GROUP BY region, category
ORDER BY region, category;

-- =====================================================
-- RESUMO:
-- =====================================================
-- 
-- Alimentos NACIONAIS (todas as regiões):
-- - Ovos, Arroz, Feijão, Banana, Batata doce, etc.
-- 
-- Alimentos REGIONAIS adicionados:
-- 
-- NORTE (6):
-- - Açaí, Tucumã, Pirarucu, Tapioca, Castanha-do-pará, Farinha de mandioca
-- 
-- NORDESTE (6):
-- - Carne de sol, Baião de dois, Macaxeira, Peixe seco, Goiaba, Queijo coalho
-- 
-- CENTRO-OESTE (5):
-- - Pequi, Arroz carreteiro, Guariroba, Milho verde, Pacu
-- 
-- SUDESTE (6):
-- - Pão de queijo, Feijoada, Virado, Cupuaçu, Mandioca frita, Linguiça
-- 
-- SUL (6):
-- - Pinhão, Chimarrão, Carne de churrasco, Barreado, Cuca, Polenta
-- 
-- TOTAL DE ALIMENTOS REGIONAIS: ~35 novos alimentos
-- =====================================================
