# Guia de Correção - Anúncios de Adoção no Dashboard

## Problema Identificado

Os anúncios da página `adocao.html` não estavam aparecendo no dashboard (`dashboard.html`) na seção **Adoções > Gerenciar Adoções** por causa de:

1. **Código JavaScript Faltando**: As funções para carregar e gerenciar os anúncios no dashboard não estavam sendo chamadas
2. **Possível Problema de Permissões no Banco de Dados**: As políticas RLS (Row Level Security) do Supabase podem estar bloqueando o acesso

## Correções Aplicadas

### 1. Código JavaScript (✅ Já Corrigido)

As seguintes funcionalidades foram adicionadas ao arquivo `js/adocao.js`:

- ✅ Função para carregar anúncios no dashboard
- ✅ Botão "Atualizar" funcional
- ✅ Botão "Editar" - abre modal para edição
- ✅ Botão "Marcar como Adotado/Disponível" - alterna status
- ✅ Botão "Excluir" - remove anúncio com confirmação
- ✅ Modal de edição funcional

### 2. Verificar Políticas do Banco de Dados

Se após as correções do código os anúncios ainda não aparecerem, o problema pode estar nas políticas de acesso do banco de dados.

## Como Verificar e Corrigir Políticas no Supabase

### Opção 1: Via Interface do Supabase (Mais Fácil)

1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral, clique em **Database**
4. Selecione a aba **Tables**
5. Encontre a tabela `pets_adocao`
6. Clique na tabela e vá para a aba **RLS (Row Level Security)**
7. Verifique se existem políticas habilitadas
8. Se necessário, desabilite temporariamente o RLS para testar (botão "Disable RLS")

### Opção 2: Via SQL Editor (Mais Completo)

1. No painel do Supabase, vá em **SQL Editor** no menu lateral
2. Clique em **New Query**
3. Abra o arquivo `database_check_and_fix.sql` (incluído neste repositório)
4. Copie e cole o conteúdo no editor SQL
5. Execute as consultas na ordem:

#### Passo a Passo:

**Passo 1: Verificar estrutura da tabela**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pets_adocao'
ORDER BY ordinal_position;
```

**Passo 2: Verificar políticas existentes**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pets_adocao';
```

**Passo 3: Criar políticas corretas**
```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Permitir leitura pública de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir inserção pública de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir atualização autenticada de pets_adocao" ON public.pets_adocao;
DROP POLICY IF EXISTS "Permitir exclusão autenticada de pets_adocao" ON public.pets_adocao;

-- Habilitar RLS
ALTER TABLE public.pets_adocao ENABLE ROW LEVEL SECURITY;

-- Criar novas políticas
CREATE POLICY "Permitir leitura pública de pets_adocao"
ON public.pets_adocao FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de pets_adocao"
ON public.pets_adocao FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização autenticada de pets_adocao"
ON public.pets_adocao FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusão autenticada de pets_adocao"
ON public.pets_adocao FOR DELETE
USING (auth.role() = 'authenticated');
```

**Passo 4: Testar acesso**
```sql
SELECT id, nome_pet, cidade, adotado, created_at
FROM public.pets_adocao
ORDER BY created_at DESC
LIMIT 5;
```

### Opção 3: Solução Rápida (Para Testes) ⚠️ ALTO RISCO

**⚠️ ATENÇÃO CRÍTICA**: Esta solução remove TODA a segurança da tabela e expõe dados sensíveis (telefones, emails dos tutores) publicamente na internet. 

**NUNCA use isto em produção!**

Se você só quer testar rapidamente em ambiente de desenvolvimento local:

```sql
-- Desabilitar RLS (APENAS PARA TESTES)
ALTER TABLE public.pets_adocao DISABLE ROW LEVEL SECURITY;
```

**IMPORTANTE: Após testar, RE-HABILITE IMEDIATAMENTE executando:**

```sql
-- 1. Re-habilitar RLS
ALTER TABLE public.pets_adocao ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas corretas (copie da seção "Opção 2" acima)
-- Execute todos os comandos CREATE POLICY da Opção 2
```

## Como Testar se Está Funcionando

1. Faça login no dashboard (`dashboard.html`)
2. No menu lateral, clique em **Adoções**
3. Clique em **Gerenciar Anúncios** no submenu
4. Você deverá ver a tabela com todos os anúncios de adoção
5. Teste os botões:
   - **Atualizar**: recarrega a lista
   - **Editar**: abre modal para edição
   - **✓/↻**: marca como adotado ou disponível
   - **🗑️**: exclui o anúncio (com confirmação)

## Funcionalidades Disponíveis

Agora você pode:

- ✅ **Visualizar** todos os anúncios de adoção no dashboard
- ✅ **Editar** informações do pet e tutor
- ✅ **Marcar como adotado** quando um pet for adotado
- ✅ **Marcar como disponível** se o status mudar
- ✅ **Excluir** anúncios (com confirmação)
- ✅ **Atualizar** a lista a qualquer momento

## Estrutura da Tabela `pets_adocao`

A tabela suporta tanto nomes de colunas em snake_case quanto camelCase:

- `nome_pet` / `nomePet`: Nome do pet
- `idade_pet` / `idadePet`: Idade do pet
- `tutor_nome` / `tutorNome`: Nome do tutor
- `tutor_telefone` / `tutorTelefone`: Telefone do tutor
- `tutor_email` / `tutorEmail`: Email do tutor
- `cidade`: Cidade
- `observacoes`: Observações sobre o pet
- `imagens_url` / `imagensURL`: Array de URLs das fotos
- `adotado`: Status de adoção (boolean)

## Problemas Comuns e Soluções

### Problema: "Erro ao carregar anúncios de adoção"

**Causa**: Políticas RLS bloqueando acesso  
**Solução**: Execute as consultas SQL acima para corrigir as políticas

### Problema: Consigo ver mas não consigo editar/excluir

**Causa**: Políticas RLS permitindo apenas leitura  
**Solução**: Certifique-se de que está logado e que as políticas de UPDATE e DELETE estão corretas

### Problema: Modal de edição não abre

**Causa**: JavaScript não carregado corretamente  
**Solução**: Limpe o cache do navegador (Ctrl+F5 ou Cmd+Shift+R)

## Contato

Se o problema persistir após seguir este guia, forneça:
1. Screenshot do console do navegador (F12 > Console)
2. Screenshot das políticas RLS da tabela `pets_adocao`
3. Resultado da consulta SQL de verificação

## Considerações de Segurança

### Riscos de Segurança Identificados

A tabela `pets_adocao` contém informações sensíveis (telefones e emails dos tutores). As políticas sugeridas neste guia têm os seguintes riscos:

1. **Inserção Anônima**: Qualquer pessoa pode criar anúncios, o que pode levar a spam
2. **Leitura Pública**: Todos os dados são visíveis publicamente (necessário para o site funcionar)

### Recomendações para Produção

Para um ambiente de produção mais seguro, considere:

1. **Rate Limiting**: Implemente limites de taxa para prevenir spam
2. **Validação de Dados**: Valide telefones e emails no backend
3. **Moderação**: Adicione um sistema de aprovação de anúncios antes de publicar
4. **CAPTCHA**: Adicione verificação CAPTCHA no formulário de anúncio
5. **Monitoramento**: Configure alertas para detecção de abuso

### Política Alternativa (Mais Segura)

Se preferir maior segurança, exija autenticação para inserir anúncios:

```sql
CREATE POLICY "Permitir inserção autenticada de pets_adocao"
ON public.pets_adocao
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

**Nota**: Isso exigirá que usuários façam login antes de anunciar pets.
