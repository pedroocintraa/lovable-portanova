-- Limpar dados na ordem correta (dependências primeiro)
DELETE FROM public.security_audit;
DELETE FROM public.login_attempts;
DELETE FROM public.historico_vendas;
DELETE FROM public.documentos_venda;
DELETE FROM public.vendas;
DELETE FROM public.clientes;
DELETE FROM public.enderecos;
DELETE FROM public.usuarios;
DELETE FROM public.equipes;

-- Criar usuário administrador geral
INSERT INTO public.usuarios (
  id,
  nome,
  telefone,
  email,
  cpf,
  funcao,
  ativo,
  data_cadastro,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'PEDRO CINTRA',
  '62994736303',
  'pedroocintraa20@gmail.com',
  '04946609105',
  'ADMINISTRADOR_GERAL',
  true,
  now(),
  now(),
  now()
);