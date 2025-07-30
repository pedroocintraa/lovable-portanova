/**
 * Serviço principal para operações com Supabase
 * Substitui o storageService, usando apenas Supabase para persistência
 */

import { supabase } from "@/integrations/supabase/client";
import { Venda, VendaFormData, Cliente, Endereco, DocumentoAnexado, DocumentosVenda } from "@/types/venda";
import { ensureAuthenticated, ensureValidToken } from "@/utils/authUtils";

class SupabaseService {
  
  /**
   * Salva uma nova venda no Supabase
   */
  async salvarVenda(vendaData: VendaFormData): Promise<void> {
    try {
      // Verificar e garantir token JWT válido antes das operações
      const authData = await ensureValidToken();
      const { user, session } = authData;
      
      console.log('🔍 SupabaseService: Token JWT validado:', {
        userId: user.id,
        hasAccessToken: !!session.access_token,
        sessionExpiry: session.expires_at
      });

      // Verificar se o usuário existe na tabela usuarios
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('id', user.id)
        .single();
        
      console.log('🔍 SupabaseService: Verificando usuário na tabela', { usuarioData });
      
      if (!usuarioData) {
        throw new Error('Usuário não encontrado no sistema. Entre em contato com o administrador.');
      }

      // 1. Criar endereço
      console.log('📝 SupabaseService: Tentando criar endereço...');
      const { data: endereco, error: enderecoError } = await supabase
        .from('enderecos')
        .insert({
          cep: vendaData.cliente.endereco.cep,
          logradouro: vendaData.cliente.endereco.logradouro,
          numero: vendaData.cliente.endereco.numero,
          complemento: vendaData.cliente.endereco.complemento,
          bairro: vendaData.cliente.endereco.bairro,
          localidade: vendaData.cliente.endereco.localidade,
          uf: vendaData.cliente.endereco.uf
        })
        .select()
        .single();

      if (enderecoError) {
        console.error('❌ Erro ao criar endereço:', enderecoError);
        throw enderecoError;
      }
      
      console.log('✅ Endereço criado:', endereco.id);

      // 2. Criar cliente
      console.log('📝 SupabaseService: Tentando criar cliente...');
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: vendaData.cliente.nome.toUpperCase(),
          telefone: vendaData.cliente.telefone,
          email: vendaData.cliente.email,
          cpf: vendaData.cliente.cpf,
          data_nascimento: vendaData.cliente.dataNascimento,
          endereco_id: endereco.id
        })
        .select()
        .single();

      if (clienteError) {
        console.error('❌ Erro ao criar cliente:', clienteError);
        throw clienteError;
      }
      
      console.log('✅ Cliente criado:', cliente.id);

      // 3. Usar dados do usuário já verificados
      const { data: vendedor } = await supabase
        .from('usuarios')
        .select('nome, equipe_id')
        .eq('id', user.id)
        .single();

      // 4. Criar venda
      console.log('📝 SupabaseService: Tentando criar venda...');
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          cliente_id: cliente.id,
          vendedor_id: user.id,
          vendedor_nome: vendedor?.nome || 'VENDEDOR',
          plano_id: vendaData.planoId,
          dia_vencimento: vendaData.diaVencimento,
          data_instalacao: vendaData.dataInstalacao,
          observacoes: vendaData.observacoes,
          status: 'pendente'
        })
        .select()
        .single();

      if (vendaError) {
        console.error('❌ Erro ao criar venda:', vendaError);
        throw vendaError;
      }
      
      console.log('✅ Venda criada:', venda.id);

      // 5. Salvar documentos (se existirem)
      if (vendaData.documentos) {
        await this.salvarDocumentos(venda.id, vendaData.documentos);
      }

      console.log('✅ Venda salva com sucesso no Supabase:', venda.id);
    } catch (error) {
      console.error('❌ Erro ao salvar venda:', error);
      throw new Error('Falha ao salvar venda');
    }
  }

  /**
   * Salva documentos no Supabase Storage e registra na tabela
   */
  private async salvarDocumentos(vendaId: string, documentos: DocumentosVenda): Promise<void> {
    for (const [tipo, docs] of Object.entries(documentos)) {
      if (!docs || docs.length === 0) continue;

      for (const doc of docs) {
        try {
          // Converter base64 para blob
          const base64Data = doc.conteudo.split(',')[1];
          const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], {
            type: doc.tipo
          });

          // Upload para Storage
          const fileName = `${vendaId}/${tipo}/${doc.id}_${doc.nome}`;
          const { error: uploadError } = await supabase.storage
            .from('documentos-vendas')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          // Registrar na tabela documentos_venda
          const { error: dbError } = await supabase
            .from('documentos_venda')
            .insert({
              venda_id: vendaId,
              tipo: tipo as any,
              nome_arquivo: doc.nome,
              tipo_mime: doc.tipo,
              tamanho: doc.tamanho,
              storage_path: fileName
            });

          if (dbError) throw dbError;
        } catch (error) {
          console.error(`❌ Erro ao salvar documento ${doc.nome}:`, error);
        }
      }
    }
  }

  /**
   * Obtém vendas baseado na função do usuário
   */
  async obterVendas(): Promise<Venda[]> {
    try {
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          *,
          clientes!inner (
            *,
            enderecos!inner (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar dados do Supabase para o formato da interface Venda
      return vendas.map(venda => ({
        id: venda.id,
        cliente: {
          nome: venda.clientes.nome,
          telefone: venda.clientes.telefone,
          email: venda.clientes.email || '',
          cpf: venda.clientes.cpf,
          dataNascimento: venda.clientes.data_nascimento || '',
          endereco: {
            cep: venda.clientes.enderecos.cep,
            logradouro: venda.clientes.enderecos.logradouro,
            numero: venda.clientes.enderecos.numero,
            complemento: venda.clientes.enderecos.complemento || '',
            bairro: venda.clientes.enderecos.bairro,
            localidade: venda.clientes.enderecos.localidade,
            uf: venda.clientes.enderecos.uf
          }
        },
        status: venda.status,
        dataVenda: venda.data_venda,
        dataGeracao: venda.created_at,
        observacoes: venda.observacoes || '',
        vendedorId: venda.vendedor_id,
        vendedorNome: venda.vendedor_nome,
        planoId: venda.plano_id || '',
        diaVencimento: venda.dia_vencimento || undefined,
        dataInstalacao: venda.data_instalacao || undefined,
        motivoPerda: venda.motivo_perda || undefined
      }));
    } catch (error) {
      console.error('❌ Erro ao obter vendas:', error);
      return [];
    }
  }

  /**
   * Obtém uma venda específica com todos os documentos
   */
  async obterVendaCompleta(vendaId: string): Promise<Venda | null> {
    try {
      const { data: venda, error } = await supabase
        .from('vendas')
        .select(`
          *,
          clientes!inner (
            *,
            enderecos!inner (*)
          ),
          documentos_venda (*)
        `)
        .eq('id', vendaId)
        .single();

      if (error) throw error;

      // Carregar documentos do Storage
      const documentos: DocumentosVenda = {};
      for (const doc of venda.documentos_venda) {
        const { data } = await supabase.storage
          .from('documentos-vendas')
          .download(doc.storage_path);

        if (data) {
          const base64 = await this.blobToBase64(data);
          const documentoAnexado: DocumentoAnexado = {
            id: doc.id,
            nome: doc.nome_arquivo,
            tipo: doc.tipo_mime,
            tamanho: doc.tamanho,
            dataUpload: doc.data_upload,
            conteudo: base64
          };

          if (!documentos[doc.tipo as keyof DocumentosVenda]) {
            documentos[doc.tipo as keyof DocumentosVenda] = [];
          }
          documentos[doc.tipo as keyof DocumentosVenda]?.push(documentoAnexado);
        }
      }

      return {
        id: venda.id,
        cliente: {
          nome: venda.clientes.nome,
          telefone: venda.clientes.telefone,
          email: venda.clientes.email || '',
          cpf: venda.clientes.cpf,
          dataNascimento: venda.clientes.data_nascimento || '',
          endereco: {
            cep: venda.clientes.enderecos.cep,
            logradouro: venda.clientes.enderecos.logradouro,
            numero: venda.clientes.enderecos.numero,
            complemento: venda.clientes.enderecos.complemento || '',
            bairro: venda.clientes.enderecos.bairro,
            localidade: venda.clientes.enderecos.localidade,
            uf: venda.clientes.enderecos.uf
          }
        },
        documentos,
        status: venda.status,
        dataVenda: venda.data_venda,
        dataGeracao: venda.created_at,
        observacoes: venda.observacoes || '',
        vendedorId: venda.vendedor_id,
        vendedorNome: venda.vendedor_nome,
        planoId: venda.plano_id || '',
        diaVencimento: venda.dia_vencimento || undefined,
        dataInstalacao: venda.data_instalacao || undefined,
        motivoPerda: venda.motivo_perda || undefined
      };
    } catch (error) {
      console.error('❌ Erro ao obter venda completa:', error);
      return null;
    }
  }

  /**
   * Atualiza o status de uma venda
   */
  async atualizarStatusVenda(
    id: string, 
    novoStatus: Venda["status"], 
    extraData?: { dataInstalacao?: string; motivoPerda?: string }
  ): Promise<void> {
    try {
      const updateData: any = { status: novoStatus };
      
      if (extraData?.dataInstalacao) {
        updateData.data_instalacao = extraData.dataInstalacao;
      }
      
      if (extraData?.motivoPerda) {
        updateData.motivo_perda = extraData.motivoPerda;
      }

      const { error } = await supabase
        .from('vendas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Status da venda atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar status da venda:', error);
      throw new Error('Falha ao atualizar status');
    }
  }

  /**
   * Gera estatísticas das vendas baseado na função do usuário
   */
  async obterEstatisticasVendas(): Promise<any> {
    try {
      const vendas = await this.obterVendas();
      
      const totalVendas = vendas.length;
      const vendasPendentes = vendas.filter(v => v.status === "pendente").length;
      const vendasEmAndamento = vendas.filter(v => v.status === "em_andamento").length;
      const vendasAuditadas = vendas.filter(v => v.status === "auditada").length;
      const vendasGeradas = vendas.filter(v => v.status === "gerada").length;
      const vendasAguardandoHabilitacao = vendas.filter(v => v.status === "aguardando_habilitacao").length;
      const vendasHabilitadas = vendas.filter(v => v.status === "habilitada").length;
      const vendasPerdidas = vendas.filter(v => v.status === "perdida").length;

      // Vendas por bairro
      const vendasPorBairro = vendas.reduce((acc, venda) => {
        const bairro = venda.cliente.endereco.bairro;
        acc[bairro] = (acc[bairro] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Vendas por cidade
      const vendasPorCidade = vendas.reduce((acc, venda) => {
        const cidade = venda.cliente.endereco.localidade;
        acc[cidade] = (acc[cidade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Vendas por vendedor
      const vendasPorVendedor = vendas.reduce((acc, venda) => {
        const vendedor = venda.vendedorNome || 'Vendedor';
        acc[vendedor] = (acc[vendedor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalVendas,
        vendasPendentes,
        vendasEmAndamento,
        vendasAuditadas,
        vendasGeradas,
        vendasAguardandoHabilitacao,
        vendasHabilitadas,
        vendasPerdidas,
        vendasPorBairro,
        vendasPorCidade,
        vendasPorVendedor,
        taxaConversao: totalVendas > 0 ? (vendasHabilitadas / totalVendas) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        totalVendas: 0,
        vendasPendentes: 0,
        vendasEmAndamento: 0,
        vendasAuditadas: 0,
        vendasGeradas: 0,
        vendasAguardandoHabilitacao: 0,
        vendasHabilitadas: 0,
        vendasPerdidas: 0,
        vendasPorBairro: {},
        vendasPorCidade: {},
        vendasPorVendedor: {},
        taxaConversao: 0
      };
    }
  }

  /**
   * Converte Blob para Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const supabaseService = new SupabaseService();