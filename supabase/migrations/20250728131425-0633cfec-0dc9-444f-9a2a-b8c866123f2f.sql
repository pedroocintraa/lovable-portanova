-- Criar usuário admin de teste no auth se não existir
-- Nota: Esta é uma abordagem para desenvolvimento, em produção seria diferente

-- Primeiro verificar se o usuário já existe na tabela usuarios
DO $$
DECLARE 
    user_exists boolean;
    auth_user_id uuid;
BEGIN
    -- Verificar se usuário admin já existe
    SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE email = 'admin@teste.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Criar um ID fixo para o usuário admin
        auth_user_id := '00000000-0000-0000-0000-000000000001'::uuid;
        
        -- Inserir na tabela usuarios
        INSERT INTO public.usuarios (
            id,
            nome, 
            telefone, 
            email, 
            cpf, 
            funcao,
            data_cadastro,
            ativo
        ) VALUES (
            auth_user_id,
            'ADMIN TESTE',
            '11999999999',
            'admin@teste.com',
            '11111111111',
            'ADMINISTRADOR_GERAL'::funcao_usuario,
            now(),
            true
        );
    END IF;
END$$;