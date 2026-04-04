-- =====================================================
-- FOOD GUIDE - Setup Completo do Banco de Dados
-- =====================================================
-- Este script cria a tabela e popula com 27 alimentos
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela food_guide_items
CREATE TABLE IF NOT EXISTS food_guide_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('protein', 'carbs', 'fats')),
  tier TEXT NOT NULL CHECK (tier IN ('budget', 'balanced', 'premium')),
  calories INTEGER,
  macros JSONB,
  image_url TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desativar RLS (dados públicos de referência)
ALTER TABLE food_guide_items DISABLE ROW LEVEL SECURITY;

-- 3. Criar índice para consultas filtradas
CREATE INDEX IF NOT EXISTS idx_food_guide_category_tier 
ON food_guide_items(category, tier);

-- 4. Limpar dados existentes (para evitar duplicatas)
DELETE FROM food_guide_items;

-- =====================================================
-- INSERÇÃO DE DADOS
-- =====================================================

-- ═══════════════════════════════════════
-- PROTEÍNAS - ECONÔMICO (Budget)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Ovos', 'protein', 'budget', 155, '{"p":13,"c":1,"f":11}', 3, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400'),
('Sardinha em lata', 'protein', 'budget', 208, '{"p":25,"c":0,"f":11}', 3, 'https://images.unsplash.com/photo-1611171711912-e3f6b536f532?w=400'),
('Fígado bovino', 'protein', 'budget', 135, '{"p":20,"c":4,"f":4}', 4, 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400');

-- ═══════════════════════════════════════
-- PROTEÍNAS - EQUILIBRADO (Balanced)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Frango (peito)', 'protein', 'balanced', 165, '{"p":31,"c":0,"f":4}', 3, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400'),
('Carne moída', 'protein', 'balanced', 250, '{"p":26,"c":0,"f":15}', 3, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400'),
('Tilápia', 'protein', 'balanced', 128, '{"p":26,"c":0,"f":3}', 3, 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400');

-- ═══════════════════════════════════════
-- PROTEÍNAS - PREMIUM
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Salmão', 'protein', 'premium', 208, '{"p":20,"c":0,"f":13}', 4, 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=400'),
('Picanha', 'protein', 'premium', 250, '{"p":25,"c":0,"f":16}', 3, 'https://images.unsplash.com/photo-1558030006-450675393462?w=400'),
('Camarão', 'protein', 'premium', 99, '{"p":24,"c":0,"f":1}', 4, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400'),
('Whey Protein', 'protein', 'premium', 120, '{"p":25,"c":3,"f":1}', 3, 'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?w=400');

-- ═══════════════════════════════════════
-- CARBOIDRATOS - ECONÔMICO (Budget)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Arroz branco', 'carbs', 'budget', 130, '{"p":3,"c":28,"f":0}', 2, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'),
('Macarrão', 'carbs', 'budget', 131, '{"p":5,"c":25,"f":1}', 2, 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400'),
('Banana', 'carbs', 'budget', 89, '{"p":1,"c":23,"f":0}', 3, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400');

-- ═══════════════════════════════════════
-- CARBOIDRATOS - EQUILIBRADO (Balanced)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Batata doce', 'carbs', 'balanced', 86, '{"p":2,"c":20,"f":0}', 3, 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400'),
('Aveia', 'carbs', 'balanced', 389, '{"p":17,"c":66,"f":7}', 4, 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400'),
('Mandioca', 'carbs', 'balanced', 160, '{"p":1,"c":38,"f":0}', 2, 'https://images.unsplash.com/photo-1599839575338-31b11ae53f8a?w=400');

-- ═══════════════════════════════════════
-- CARBOIDRATOS - PREMIUM
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Quinoa', 'carbs', 'premium', 120, '{"p":4,"c":21,"f":2}', 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'),
('Arroz integral', 'carbs', 'premium', 111, '{"p":3,"c":23,"f":1}', 3, 'https://images.unsplash.com/photo-1536304993881-460587544b2b?w=400'),
('Pão integral artesanal', 'carbs', 'premium', 247, '{"p":13,"c":41,"f":4}', 3, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400');

-- ═══════════════════════════════════════
-- GORDURAS - ECONÔMICO (Budget)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Azeite de oliva', 'fats', 'budget', 884, '{"p":0,"c":0,"f":100}', 4, 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400'),
('Amendoim', 'fats', 'budget', 567, '{"p":26,"c":16,"f":49}', 3, 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400'),
('Manteiga', 'fats', 'budget', 717, '{"p":1,"c":0,"f":81}', 2, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400');

-- ═══════════════════════════════════════
-- GORDURAS - EQUILIBRADO (Balanced)
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Abacate', 'fats', 'balanced', 160, '{"p":2,"c":9,"f":15}', 4, 'https://images.unsplash.com/photo-1523049673856-356ccc615d82?w=400'),
('Coco ralado', 'fats', 'balanced', 354, '{"p":3,"c":15,"f":33}', 3, 'https://images.unsplash.com/photo-1580984969071-a8da8c4e7b17?w=400'),
('Pasta de amendoim', 'fats', 'balanced', 588, '{"p":25,"c":20,"f":50}', 3, 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400');

-- ═══════════════════════════════════════
-- GORDURAS - PREMIUM
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Nozes', 'fats', 'premium', 654, '{"p":15,"c":14,"f":65}', 4, 'https://images.unsplash.com/photo-1533230678252-c65f97371131?w=400'),
('Castanha-do-pará', 'fats', 'premium', 656, '{"p":14,"c":12,"f":66}', 4, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400'),
('Azeite trufado', 'fats', 'premium', 884, '{"p":0,"c":0,"f":100}', 4, 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400');

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Contar total de registros
SELECT COUNT(*) as total_alimentos FROM food_guide_items;

-- Verificar distribuição por categoria e tier
SELECT 
  category,
  tier,
  COUNT(*) as quantidade
FROM food_guide_items
GROUP BY category, tier
ORDER BY category, tier;

-- =====================================================
-- SUCESSO! ✅
-- =====================================================
-- A tabela foi criada e populada com 27 alimentos.
-- Agora recarregue a página do Food Guide no app.
-- =====================================================
