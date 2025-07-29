-- Criar o usuário administrador único: PEDRO CINTRA
INSERT INTO public.usuarios (
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
  'PEDRO CINTRA',
  '62994736303',
  'pedroocintraa20@gmail.com',
  '04946609105',
  'ADMINISTRADOR_GERAL',
  true,
  now(),
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;