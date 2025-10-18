-- ========================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO
-- Tabela: pets_adocao
-- ========================================
-- Este script verifica e corrige políticas de acesso (RLS) 
-- para a tabela pets_adocao no Supabase

-- ========================================
-- 1. VERIFICAR ESTRUTURA DA TABELA
-- ========================================
-- Execute esta consulta para ver as colunas da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pets_adocao'
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFICAR POLÍTICAS RLS EXISTENTES
-- ========================================
-- Execute esta consulta para ver as políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pets_adocao';

-- ========================================
-- 3. VERIFICAR SE RLS ESTÁ HABILITADO
-- ========================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'pets_adocao';

-- ========================================
-- 4. DESABILITAR RLS (SE NECESSÁRIO)
-- ========================================
-- ATENÇÃO: Execute apenas se você quiser desabilitar completamente o RLS
-- (não recomendado para produção, mas pode ser usado para testes)
-- ALTER TABLE public.pets_adocao DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CRIAR/RECRIAR POLÍTICAS DE ACESSO
-- ========================================
-- Estas políticas permitem acesso completo para usuários autenticados
-- e acesso de leitura para usuários anônimos

-- Primeiro, remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Permitir leitura pública de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir inserção pública de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir atualização autenticada de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir exclusão autenticada de pets_adocao" ON public.pets_adocao;

-- Habilitar RLS na tabela
ALTER TABLE public.pets_adocao ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que todos (incluindo anônimos) possam LER os anúncios
CREATE POLICY "Permitir leitura pública de pets_adocao"
ON public.pets_adocao
FOR SELECT
USING (true);

-- Política 2: Permitir que todos (incluindo anônimos) possam INSERIR anúncios
CREATE POLICY "Permitir inserção pública de pets_adocao"
ON public.pets_adocao
FOR INSERT
WITH CHECK (true);

-- Política 3: Permitir que usuários autenticados possam ATUALIZAR anúncios
CREATE POLICY "Permitir atualização autenticada de pets_adocao"
ON public.pets_adocao
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política 4: Permitir que usuários autenticados possam EXCLUIR anúncios
CREATE POLICY "Permitir exclusão autenticada de pets_adocao"
ON public.pets_adocao
FOR DELETE
USING (auth.role() = 'authenticated');

-- ========================================
-- 6. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
-- ========================================
-- Execute novamente para confirmar
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pets_adocao';

-- ========================================
-- 7. TESTAR ACESSO À TABELA
-- ========================================
-- Execute esta consulta para ver se você consegue ler os dados
SELECT id, nome_pet, cidade, adotado, created_at
FROM public.pets_adocao
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- OBSERVAÇÕES IMPORTANTES:
-- ========================================
-- 1. Execute os comandos na ordem apresentada
-- 2. As consultas SELECT (seções 1, 2, 3, 6, 7) são seguras e podem ser executadas a qualquer momento
-- 3. Os comandos DROP POLICY e CREATE POLICY (seção 5) modificam o banco de dados
-- 4. Se você preferir políticas mais restritivas, modifique as condições USING e WITH CHECK
-- 5. Para testes locais, você pode desabilitar o RLS temporariamente (seção 4)
--
-- ========================================
-- ALTERNATIVA: POLÍTICAS MAIS PERMISSIVAS
-- ========================================
-- Se as políticas acima não funcionarem, você pode usar esta alternativa
-- que dá acesso completo a todos (autenticados e anônimos):
--
-- DROP POLICY IF EXISTS "Acesso completo a pets_adocao" ON public.pets_adocao;
-- 
-- CREATE POLICY "Acesso completo a pets_adocao"
-- ON public.pets_adocao
-- FOR ALL
-- USING (true)
-- WITH CHECK (true);
--
-- ========================================
