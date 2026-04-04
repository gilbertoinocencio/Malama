-- =====================================================
-- FOOD GUIDE - Adição de Proteínas Vegetarianas/Veganas
-- =====================================================
-- Execute este SQL se você tem usuários vegetarianos/veganos
-- Adiciona alternativas sem carne ao banco de dados
-- =====================================================

-- ═══════════════════════════════════════
-- PROTEÍNAS VEGETARIANAS - ECONÔMICO
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Tofu firme', 'protein', 'budget', 76, '{"p":8,"c":2,"f":5}', 4, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'),
('Grão de bico', 'protein', 'budget', 164, '{"p":9,"c":27,"f":3}', 4, 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400'),
('Lentilha', 'protein', 'budget', 116, '{"p":9,"c":20,"f":0}', 5, 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400');

-- ═══════════════════════════════════════
-- PROTEÍNAS VEGETARIANAS - EQUILIBRADO
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Tempeh', 'protein', 'balanced', 193, '{"p":20,"c":9,"f":11}', 5, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400'),
('Edamame', 'protein', 'balanced', 121, '{"p":11,"c":9,"f":5}', 4, 'https://images.unsplash.com/photo-1564834724105-918b73d168e0?w=400'),
('Seitan', 'protein', 'balanced', 370, '{"p":75,"c":14,"f":2}', 4, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');

-- ═══════════════════════════════════════
-- PROTEÍNAS VEGETARIANAS - PREMIUM
-- ═══════════════════════════════════════
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Queijo cottage', 'protein', 'premium', 98, '{"p":11,"c":3,"f":4}', 4, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400'),
('Proteína de ervilha', 'protein', 'premium', 120, '{"p":24,"c":2,"f":2}', 4, 'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?w=400'),
('Levedura nutricional', 'protein', 'premium', 325, '{"p":45,"c":35,"f":5}', 5, 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400');

-- ═══════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════
SELECT 
  category,
  tier,
  COUNT(*) as quantidade,
  array_agg(name) as alimentos
FROM food_guide_items
WHERE category = 'protein'
GROUP BY category, tier
ORDER BY tier;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Budget: 6 proteínas (3 carne + 3 vegetarianas)
-- Balanced: 6 proteínas (3 carne + 3 vegetarianas)
-- Premium: 7 proteínas (4 carne + 3 vegetarianas)
-- =====================================================
-- Para vegetarianos: verá apenas as 3-4 opções sem carne
-- Para veganos: tofu, grão de bico, lentilha, tempeh, edamame, seitan
-- =====================================================
