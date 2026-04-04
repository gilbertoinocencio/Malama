-- =====================================================
-- FOOD GUIDE - Alimentos SEM GLÚTEN
-- =====================================================
-- Execute este SQL se você tem usuários com doença celíaca
-- ou sensibilidade ao glúten
-- =====================================================

-- ═══════════════════════════════════════
-- CARBOIDRATOS SEM GLÚTEN - ECONÔMICO
-- ═══════════════════════════════════════
-- (Arroz e banana já existem, adicionando mais opções)
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Milho verde', 'carbs', 'budget', 86, '{"p":3,"c":19,"f":1}', 3, 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400'),
('Polvilho doce', 'carbs', 'budget', 350, '{"p":1,"c":87,"f":0}', 2, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400');

-- ═══════════════════════════════════════
-- CARBOIDRATOS SEM GLÚTEN - EQUILIBRADO
-- ═══════════════════════════════════════
-- (Batata doce e mandioca já existem, adicionando mais opções)
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Inhame', 'carbs', 'balanced', 118, '{"p":2,"c":28,"f":0}', 3, 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400'),
('Cará', 'carbs', 'balanced', 105, '{"p":2,"c":25,"f":0}', 3, 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400');

-- ═══════════════════════════════════════
-- CARBOIDRATOS SEM GLÚTEN - PREMIUM
-- ═══════════════════════════════════════
-- (Quinoa e arroz integral já existem, adicionando mais opções)
INSERT INTO food_guide_items (name, category, tier, calories, macros, quality_score, image_url) VALUES
('Amaranto', 'carbs', 'premium', 371, '{"p":14,"c":65,"f":7}', 5, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'),
('Buckwheat (trigo sarraceno)', 'carbs', 'premium', 343, '{"p":13,"c":72,"f":3}', 5, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400');

-- ═══════════════════════════════════════
-- PROTEÍNAS SEM GLÚTEN - ECONÔMICO
-- ═══════════════════════════════════════
-- (Todas as proteínas já são sem glúten, apenas confirmando)
-- Nenhuma adição necessária - Ovos, Sardinha, Fígado são naturalmente sem glúten

-- ═══════════════════════════════════════
-- PROTEÍNAS SEM GLÚTEN - EQUILIBRADO
-- ═══════════════════════════════════════
-- (Todas as proteínas já são sem glúten)
-- Nenhuma adição necessária - Frango, Carne, Tilápia são naturalmente sem glúten

-- ═══════════════════════════════════════
-- PROTEÍNAS SEM GLÚTEN - PREMIUM
-- ═══════════════════════════════════════
-- (Todas as proteínas já são sem glúten)
-- Nenhuma adição necessária - Salmão, Picanha, Camarão são naturalmente sem glúten

-- ═══════════════════════════════════════
-- GORDURAS SEM GLÚTEN
-- ═══════════════════════════════════════
-- (Todas as gorduras já são sem glúten)
-- Nenhuma adição necessária - Azeite, Abacate, Nozes são naturalmente sem glúten

-- ═══════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════
SELECT 
  category,
  tier,
  COUNT(*) as quantidade,
  array_agg(name) as alimentos
FROM food_guide_items
GROUP BY category, tier
ORDER BY category, tier;

-- =====================================================
-- RESULTADO PARA USUÁRIO SEM GLÚTEN:
-- =====================================================
-- 
-- CARBOIDRATOS disponíveis:
-- Budget: Arroz branco, Banana, Milho verde, Polvilho (4 opções)
-- Balanced: Batata doce, Mandioca, Inhame, Cará (4 opções)
-- Premium: Quinoa, Arroz integral, Amaranto, Buckwheat (4 opções)
--
-- PROTEÍNAS disponíveis (todas são naturalmente sem glúten):
-- Budget: Ovos, Sardinha, Fígado (3 opções)
-- Balanced: Frango, Carne, Tilápia (3 opções)
-- Premium: Salmão, Picanha, Camarão, Whey (4 opções)
--
-- GORDURAS disponíveis (todas são naturalmente sem glúten):
-- Budget: Azeite, Amendoim, Manteiga (3 opções)
-- Balanced: Abacate, Coco, Pasta de amendoim (3 opções)
-- Premium: Nozes, Castanha, Azeite trufado (3 opções)
--
-- REMOVIDOS automaticamente pelo filtro:
-- ❌ Macarrão (contém trigo)
-- ❌ Pão integral (contém trigo/centeio)
-- ❌ Aveia (contaminação cruzada comum)
--
-- TOTAL: ~27-29 alimentos compatíveis ✅
-- =====================================================
