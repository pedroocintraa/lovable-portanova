/**
 * Serviço para integração com a API do ViaCEP
 * Busca automaticamente dados de endereço a partir do CEP
 */

import { sanitizeViaCEPData, isInputSafe } from '@/utils/inputSanitizer';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Busca endereço pelo CEP na API do ViaCEP
 * @param cep - CEP para busca (formato: 00000-000 ou 00000000)
 * @returns Promise com dados do endereço ou null se não encontrado
 */
export const buscarEnderecoPorCep = async (cep: string): Promise<ViaCepResponse | null> => {
  try {
    // Validate input safety first
    const safety = isInputSafe(cep);
    if (!safety.safe) {
      throw new Error('CEP contém caracteres inválidos');
    }
    
    // Remove caracteres não numéricos do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    
    // Valida formato do CEP
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos');
    }
    
    // Additional validation - CEP should only contain numbers
    if (!/^\d{8}$/.test(cepLimpo)) {
      throw new Error('CEP deve conter apenas números');
    }

    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro na requisição para ViaCEP');
    }

    const rawData: ViaCepResponse = await response.json();
    
    // Verifica se o CEP foi encontrado
    if (rawData.erro) {
      return null;
    }

    // Sanitize the response data before returning
    const sanitizedData = sanitizeViaCEPData(rawData);
    
    if (!sanitizedData) {
      throw new Error('Dados do endereço contêm informações inválidas');
    }

    return sanitizedData as ViaCepResponse;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw new Error('Falha ao buscar endereço. Verifique o CEP informado.');
  }
};

/**
 * Formata CEP para exibição (00000-000)
 */
export const formatarCep = (cep: string): string => {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Valida se o CEP tem formato válido
 */
export const validarCep = (cep: string): boolean => {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
};