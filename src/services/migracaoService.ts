import { supabase } from '@/integrations/supabase/client';
import { usuariosService } from './usuariosService';

interface MigrationResult {
  success: boolean;
  message: string;
  user_id?: string;
  error?: string;
}

export class MigracaoService {
  async migrarUsuariosExistentes(): Promise<{ sucessos: number; erros: string[] }> {
    console.log('Iniciando migração de usuários existentes para Supabase Auth');
    
    const sucessos: string[] = [];
    const erros: string[] = [];

    try {
      // Buscar todos os usuários da tabela usuarios
      const usuarios = await usuariosService.obterUsuarios();
      console.log(`Encontrados ${usuarios.length} usuários para migração`);

      for (const usuario of usuarios) {
        try {
          console.log(`Migrando usuário: ${usuario.nome} (${usuario.email})`);
          
          // Chamar edge function para migração
          const { data, error } = await supabase.functions.invoke('migrate-users', {
            body: {
              usuario_id: usuario.id,
              email: usuario.email,
              nome: usuario.nome,
              senha: 'senha123' // Senha temporária
            }
          });

          if (error) {
            console.error(`Erro ao migrar ${usuario.email}:`, error);
            erros.push(`${usuario.nome}: ${error.message}`);
          } else if (data?.success) {
            console.log(`Usuário ${usuario.email} migrado com sucesso`);
            sucessos.push(usuario.nome);
          } else {
            console.error(`Falha na migração de ${usuario.email}:`, data?.error);
            erros.push(`${usuario.nome}: ${data?.error || 'Erro desconhecido'}`);
          }
        } catch (error: any) {
          console.error(`Erro na migração de ${usuario.email}:`, error);
          erros.push(`${usuario.nome}: ${error.message}`);
        }
      }

      console.log(`Migração concluída: ${sucessos.length} sucessos, ${erros.length} erros`);
      return { sucessos: sucessos.length, erros };

    } catch (error: any) {
      console.error('Erro geral na migração:', error);
      return { sucessos: 0, erros: [`Erro geral: ${error.message}`] };
    }
  }

  async migrarUsuarioEspecifico(usuarioId: string): Promise<MigrationResult> {
    try {
      const usuario = await usuariosService.obterUsuarioPorId(usuarioId);
      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      console.log(`Migrando usuário específico: ${usuario.nome} (${usuario.email})`);

      const { data, error } = await supabase.functions.invoke('migrate-users', {
        body: {
          usuario_id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          senha: 'senha123'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as MigrationResult;
    } catch (error: any) {
      console.error('Erro na migração específica:', error);
      return {
        success: false,
        message: 'Erro na migração',
        error: error.message
      };
    }
  }

  async verificarStatusMigracao(): Promise<{ total: number; migrados: number; pendentes: string[] }> {
    try {
      // Buscar usuários da tabela usuarios
      const usuarios = await usuariosService.obterUsuarios();
      const pendentes: string[] = [];
      let migrados = 0;

      for (const usuario of usuarios) {
        try {
          // Verificar se existe no auth.users fazendo uma tentativa de busca
          const { data: authData } = await supabase.auth.admin.getUserById(usuario.id);
          
          if (authData.user) {
            migrados++;
          } else {
            pendentes.push(`${usuario.nome} (${usuario.email})`);
          }
        } catch (error) {
          // Se der erro, provavelmente não existe
          pendentes.push(`${usuario.nome} (${usuario.email})`);
        }
      }

      return {
        total: usuarios.length,
        migrados,
        pendentes
      };
    } catch (error: any) {
      console.error('Erro ao verificar status da migração:', error);
      return { total: 0, migrados: 0, pendentes: [] };
    }
  }
}

export const migracaoService = new MigracaoService();