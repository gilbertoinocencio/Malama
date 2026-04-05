-- =====================================================
-- FOOD GUIDE - Sistema de Email + Geolocalização
-- =====================================================
-- 1. Adiciona campo email ao perfil (copiado do auth)
-- 2. Adiciona campos de localização (estado, cidade, país)
-- 3. Cria trigger para auto-detectar país pelo domínio do email
-- 4. Permite personalização regional automática
-- =====================================================

-- ═══════════════════════════════════════
-- 1. ADICIONAR CAMPOS AO PERFIL
-- ═══════════════════════════════════════

-- Email (copiado do auth.users para fácil acesso)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Localização completa
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'BR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Região (calculada automaticamente pelo estado)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN (
  'norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'
));

-- Índice para buscas por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Índice para buscas por região
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);

-- ═══════════════════════════════════════
-- 2. TRIGGER PARA COPIAR EMAIL DO AUTH
-- ═══════════════════════════════════════

-- Função para copiar email do auth.users para profiles
CREATE OR REPLACE FUNCTION copy_email_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Copia email do auth.users para profiles
  UPDATE profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar email quando usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION copy_email_to_profile();

-- ═══════════════════════════════════════
-- 3. FUNÇÃO PARA DETECTAR PAÍS PELO EMAIL
-- ═══════════════════════════════════════

-- Função para detectar país pelo domínio do email
CREATE OR REPLACE FUNCTION detect_country_from_email(email_address TEXT)
RETURNS TEXT AS $$
DECLARE
  domain_part TEXT;
  tld TEXT;
BEGIN
  -- Extrai o domínio do email
  domain_part := split_part(email_address, '@', 2);
  
  -- Extrai o TLD (última parte do domínio)
  tld := split_part(domain_part, '.', array_length(string_to_array(domain_part, '.'), 1));
  
  -- Mapeamento de TLDs para países
  CASE lower(tld)
    WHEN 'br' THEN RETURN 'BR';
    WHEN 'pt' THEN RETURN 'PT';
    WHEN 'ar' THEN RETURN 'AR';
    WHEN 'mx' THEN RETURN 'MX';
    WHEN 'co' THEN RETURN 'CO';
    WHEN 'cl' THEN RETURN 'CL';
    WHEN 'pe' THEN RETURN 'PE';
    WHEN 'us' THEN RETURN 'US';
    WHEN 'es' THEN RETURN 'ES';
    WHEN 'fr' THEN RETURN 'FR';
    WHEN 'de' THEN RETURN 'DE';
    WHEN 'it' THEN RETURN 'IT';
    WHEN 'jp' THEN RETURN 'JP';
    WHEN 'cn' THEN RETURN 'CN';
    WHEN 'in' THEN RETURN 'IN';
    WHEN 'au' THEN RETURN 'AU';
    WHEN 'ca' THEN RETURN 'CA';
    WHEN 'uk' THEN RETURN 'GB';
    ELSE RETURN 'BR'; -- Default Brasil
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════
-- 4. TRIGGER PARA AUTO-DETECTAR PAÍS
-- ═══════════════════════════════════════

-- Função para auto-detectar país quando email é inserido/atualizado
CREATE OR REPLACE FUNCTION auto_detect_country()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem email e país não está definido, detecta pelo email
  IF NEW.email IS NOT NULL AND (NEW.country IS NULL OR NEW.country = 'BR') THEN
    NEW.country := detect_country_from_email(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-detectar país
DROP TRIGGER IF EXISTS auto_detect_country_trigger ON profiles;
CREATE TRIGGER auto_detect_country_trigger
  BEFORE INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_country();

-- ═══════════════════════════════════════
-- 5. FUNÇÃO PARA DETECTAR REGIÃO BRASILEIRA
-- ═══════════════════════════════════════

-- Função para converter UF em região brasileira
CREATE OR REPLACE FUNCTION uf_to_region(state_code TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE upper(state_code)
    -- Norte
    WHEN 'AC' THEN RETURN 'norte';
    WHEN 'AM' THEN RETURN 'norte';
    WHEN 'AP' THEN RETURN 'norte';
    WHEN 'PA' THEN RETURN 'norte';
    WHEN 'RO' THEN RETURN 'norte';
    WHEN 'RR' THEN RETURN 'norte';
    WHEN 'TO' THEN RETURN 'norte';
    
    -- Nordeste
    WHEN 'AL' THEN RETURN 'nordeste';
    WHEN 'BA' THEN RETURN 'nordeste';
    WHEN 'CE' THEN RETURN 'nordeste';
    WHEN 'MA' THEN RETURN 'nordeste';
    WHEN 'PB' THEN RETURN 'nordeste';
    WHEN 'PE' THEN RETURN 'nordeste';
    WHEN 'PI' THEN RETURN 'nordeste';
    WHEN 'RN' THEN RETURN 'nordeste';
    WHEN 'SE' THEN RETURN 'nordeste';
    
    -- Centro-Oeste
    WHEN 'DF' THEN RETURN 'centro-oeste';
    WHEN 'GO' THEN RETURN 'centro-oeste';
    WHEN 'MS' THEN RETURN 'centro-oeste';
    WHEN 'MT' THEN RETURN 'centro-oeste';
    
    -- Sudeste
    WHEN 'ES' THEN RETURN 'sudeste';
    WHEN 'MG' THEN RETURN 'sudeste';
    WHEN 'RJ' THEN RETURN 'sudeste';
    WHEN 'SP' THEN RETURN 'sudeste';
    
    -- Sul
    WHEN 'PR' THEN RETURN 'sul';
    WHEN 'RS' THEN RETURN 'sul';
    WHEN 'SC' THEN RETURN 'sul';
    
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════
-- 6. TRIGGER PARA AUTO-DETECTAR REGIÃO
-- ═══════════════════════════════════════

-- Função para auto-detectar região quando estado é inserido/atualizado
CREATE OR REPLACE FUNCTION auto_detect_region()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem estado, calcula a região automaticamente
  IF NEW.state IS NOT NULL THEN
    NEW.region := uf_to_region(NEW.state);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-detectar região
DROP TRIGGER IF EXISTS auto_detect_region_trigger ON profiles;
CREATE TRIGGER auto_detect_region_trigger
  BEFORE INSERT OR UPDATE OF state ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_region();

-- ═══════════════════════════════════════
-- 7. ATUALIZAR PERFIS EXISTENTES
-- ═══════════════════════════════════════

-- Copiar emails existentes do auth.users para profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- Detectar países para perfis existentes
UPDATE profiles
SET country = detect_country_from_email(email)
WHERE email IS NOT NULL
  AND (country IS NULL OR country = 'BR');

-- ═══════════════════════════════════════
-- 8. VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════

-- Verificar perfis com email e país detectado
SELECT 
  email,
  country,
  state,
  region,
  city
FROM profiles
WHERE email IS NOT NULL
LIMIT 10;

-- Contar usuários por país
SELECT 
  country,
  COUNT(*) as usuarios
FROM profiles
GROUP BY country
ORDER BY usuarios DESC;

-- Contar usuários brasileiros por região
SELECT 
  region,
  COUNT(*) as usuarios
FROM profiles
WHERE country = 'BR'
GROUP BY region
ORDER BY usuarios DESC;

-- =====================================================
-- RESUMO DO SISTEMA:
-- =====================================================
-- 
-- ✅ Email copiado automaticamente do auth.users
-- ✅ País detectado automaticamente pelo domínio (.br, .pt, etc.)
-- ✅ Região brasileira calculada automaticamente pelo estado (UF)
-- ✅ Triggers automáticos para novos usuários
-- ✅ Atualização de perfis existentes
-- 
-- COMO FUNCIONA NA PRÁTICA:
-- 
-- 1. Usuário se cadastra com email: joao@gmail.com
--    → country = 'BR' (default)
-- 
-- 2. Usuário se cadastra com email: maria@empresa.pt
--    → country = 'PT' (detectado pelo .pt)
-- 
-- 3. Usuário informa estado: 'SP'
--    → region = 'sudeste' (calculado automaticamente)
-- 
-- 4. Food Guide usa country + region para filtrar alimentos
--    → BR + sudeste = alimentos brasileiros do sudeste
--    → PT = alimentos portugueses (futuro)
-- 
-- =====================================================
