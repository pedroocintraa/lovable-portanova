/**
 * Utilitários para verificação de permissões de usuários
 */

import { Usuario } from '@/types/usuario';

/**
 * Verifica se o usuário pode modificar dados de vendas
 * Apenas ADMINISTRADOR_GERAL, SUPERVISOR e SUPERVISOR_EQUIPE podem modificar vendas
 */
export function podeModificarVendas(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  
  return usuario.funcao === 'ADMINISTRADOR_GERAL' ||
         usuario.funcao === 'SUPERVISOR' ||
         usuario.funcao === 'SUPERVISOR_EQUIPE';
}

/**
 * Verifica se o usuário é administrador geral
 */
export function isAdministradorGeral(usuario: Usuario | null): boolean {
  return usuario?.funcao === 'ADMINISTRADOR_GERAL' || false;
}

/**
 * Verifica se o usuário tem permissões de supervisão (qualquer tipo)
 */
export function isSupervisor(usuario: Usuario | null): boolean {
  if (!usuario) return false;
  
  return usuario.funcao === 'ADMINISTRADOR_GERAL' ||
         usuario.funcao === 'SUPERVISOR' ||
         usuario.funcao === 'SUPERVISOR_EQUIPE';
}