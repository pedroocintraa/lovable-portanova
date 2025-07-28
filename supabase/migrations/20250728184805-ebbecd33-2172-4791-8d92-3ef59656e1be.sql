-- Remover a tabela datas_vencimento
DROP TABLE IF EXISTS public.datas_vencimento;

-- Alterar a tabela vendas para incluir dia_vencimento
ALTER TABLE public.vendas 
ADD COLUMN dia_vencimento INTEGER;

-- Remover a coluna data_vencimento se existir
ALTER TABLE public.vendas 
DROP COLUMN IF EXISTS data_vencimento;