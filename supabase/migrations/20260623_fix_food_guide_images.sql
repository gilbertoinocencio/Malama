-- =====================================================================
-- Corrige image_url erradas na tabela food_guide_items.
-- Substitui URLs do Unsplash (apontavam para conteúdo incorreto) por
-- imagens verificadas do Wikimedia Commons ou geradas com IA (Higgsfield).
-- Aplicar via Supabase SQL Editor.
-- =====================================================================

-- ──────────────────────────────
-- PROTEÍNAS
-- ──────────────────────────────

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Pig%27s_liver_with_sauteed_onion.jpg/330px-Pig%27s_liver_with_sauteed_onion.jpg'
WHERE name = 'Fígado bovino';

UPDATE public.food_guide_items
SET image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3DJ7gA43yLLLhgCCX7cXcIAl932/hf_20260623_194404_64d42186-f67a-4107-93f6-5db40d309385.jpeg'
WHERE name = 'Atum em lata';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Pinto_Beans_Seeds.jpg/330px-Pinto_Beans_Seeds.jpg'
WHERE name = 'Feijão carioca';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Oreochromis-niloticus-Nairobi.JPG/330px-Oreochromis-niloticus-Nairobi.JPG'
WHERE name = 'Tilápia';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Ossobuco.jpg'
WHERE name = 'Músculo bovino';

UPDATE public.food_guide_items
SET image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3DJ7gA43yLLLhgCCX7cXcIAl932/hf_20260623_194401_b9ab6f46-945c-4aec-b873-45aafc395ad0.jpeg'
WHERE name = 'Queijo cottage';

UPDATE public.food_guide_items
SET image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3DJ7gA43yLLLhgCCX7cXcIAl932/hf_20260623_194404_64d42186-f67a-4107-93f6-5db40d309385.jpeg'
WHERE name = 'Atum em água';

-- ──────────────────────────────
-- CARBOIDRATOS
-- ──────────────────────────────

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Black_Beans_2.JPG/330px-Black_Beans_2.JPG'
WHERE name = 'Feijão preto';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tepung_casava.jpg/330px-Tepung_casava.jpg'
WHERE name = 'Tapioca';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Moroccan_cuscus%2C_from_Casablanca%2C_September_2018.jpg/330px-Moroccan_cuscus%2C_from_Casablanca%2C_September_2018.jpg'
WHERE name = 'Cuscuz de milho';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Ipomoea_batatas_006.JPG/330px-Ipomoea_batatas_006.JPG'
WHERE name = 'Batata doce';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Cassava_roots_for_peeling.jpg'
WHERE name = 'Mandioca';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yam_at_monday_market_kaduna_state_01.jpg/330px-Yam_at_monday_market_kaduna_state_01.jpg'
WHERE name = 'Inhame';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Quinoa.jpg/330px-Quinoa.jpg'
WHERE name = 'Quinoa';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Granola%2C_yogurt%2C_fruit._%2816696981528%29.jpg/330px-Granola%2C_yogurt%2C_fruit._%2816696981528%29.jpg'
WHERE name = 'Granola natural';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Yacon.jpg/330px-Yacon.jpg'
WHERE name = 'Batata yacon';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Rice_vermicelli.jpg/330px-Rice_vermicelli.jpg'
WHERE name = 'Macarrão de arroz';

-- ──────────────────────────────
-- GORDURAS
-- ──────────────────────────────

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Flaxseed.jpg'
WHERE name = 'Linhaça';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Sesame_seeds_closeup.jpg/330px-Sesame_seeds_closeup.jpg'
WHERE name = 'Gergelim';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Milk_heavy_cream.jpg/330px-Milk_heavy_cream.jpg'
WHERE name = 'Creme de leite';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Mexican_chia_seeds_%281%29.jpg'
WHERE name = 'Chia';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Walnuts_-_whole_and_open_with_halved_kernel.jpg'
WHERE name = 'Nozes';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/96/Macadamia_nuts_on_tree.JPG'
WHERE name = 'Macadâmia';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Pistachio_Nuts_%28Unsplash%29.jpg'
WHERE name = 'Pistache';

UPDATE public.food_guide_items
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Tahina.JPG/330px-Tahina.JPG'
WHERE name = 'Tahine';
