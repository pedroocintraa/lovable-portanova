/**
 * Serviço híbrido de armazenamento
 * localStorage para metadados, IndexedDB para arquivos grandes
 */

import { Venda, DocumentoAnexado } from "@/types/venda";

const VENDAS_KEY = "crm_vendas";
const DB_NAME = "CRMDatabase";
const DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";

interface VendaMetadata extends Omit<Venda, 'documentos'> {
  hasDocuments: boolean;
}

class StorageService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  // Comprimir imagem
  private async compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Redimensionar para máximo 800x600
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir para JPEG com qualidade 0.8
        const compressedData = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedData);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Processar arquivo para armazenamento
  async processFile(file: File): Promise<DocumentoAnexado> {
    let conteudo: string;

    if (file.type.startsWith('image/')) {
      conteudo = await this.compressImage(file);
    } else {
      // Para outros tipos, converter para base64
      conteudo = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size,
      dataUpload: new Date().toISOString(),
      conteudo
    };
  }

  // Salvar documentos no IndexedDB
  private async saveDocuments(vendaId: string, documentos: any): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([DOCUMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: vendaId, documentos });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Recuperar documentos do IndexedDB
  private async getDocuments(vendaId: string): Promise<any> {
    await this.initDB();
    if (!this.db) return null;

    const transaction = this.db.transaction([DOCUMENTS_STORE], 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(vendaId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.documentos : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Buscar dados da equipe do vendedor no Supabase
  private async buscarDadosEquipe(vendedorId: string): Promise<{ equipeId?: string; equipeNome?: string } | null> {
    try {
      console.log('🔍 Buscando dados da equipe para vendedor:', vendedorId);
      
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: vendedor, error: vendedorError } = await supabase
        .from('usuarios')
        .select('equipe_id')
        .eq('id', vendedorId)
        .single();

      if (vendedorError) {
        console.error('❌ Erro ao buscar vendedor:', vendedorError);
        return null;
      }

      if (!vendedor?.equipe_id) {
        console.log('⚠️ Vendedor sem equipe associada:', vendedorId);
        return null;
      }

      console.log('🔍 Buscando equipe:', vendedor.equipe_id);

      const { data: equipe, error: equipeError } = await supabase
        .from('equipes')
        .select('id, nome')
        .eq('id', vendedor.equipe_id)
        .single();

      if (equipeError) {
        console.error('❌ Erro ao buscar equipe:', equipeError);
        return null;
      }

      if (!equipe) {
        console.log('⚠️ Equipe não encontrada:', vendedor.equipe_id);
        return null;
      }

      console.log('✅ Dados da equipe encontrados:', equipe);
      return {
        equipeId: equipe.id,
        equipeNome: equipe.nome
      };
    } catch (error) {
      console.error('❌ Erro ao buscar dados da equipe:', error);
      return null;
    }
  }

  // Salvar venda
  async salvarVenda(venda: Venda): Promise<void> {
    try {
      console.log('💾 Salvando venda com vendedor:', venda.vendedorId, 'equipe atual:', venda.equipeId);
      
      // Enriquecer venda com dados da equipe se necessário
      let vendaEnriquecida = { ...venda };
      
      if (venda.vendedorId && !venda.equipeId) {
        console.log('🔄 Enriquecendo venda com dados da equipe...');
        const dadosEquipe = await this.buscarDadosEquipe(venda.vendedorId);
        if (dadosEquipe) {
          vendaEnriquecida.equipeId = dadosEquipe.equipeId;
          vendaEnriquecida.equipeNome = dadosEquipe.equipeNome;
          console.log('✅ Venda enriquecida com equipe:', dadosEquipe);
        } else {
          console.log('⚠️ Não foi possível enriquecer venda com dados da equipe');
        }
      }

      // Separar metadados dos documentos
      const { documentos, ...metadata } = vendaEnriquecida;
      const vendaMetadata: VendaMetadata = {
        ...metadata,
        hasDocuments: !!(documentos && Object.keys(documentos).length > 0)
      };

      // Salvar metadados no localStorage
      const vendas = this.obterVendasMetadata();
      vendas.push(vendaMetadata);
      localStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));

      // Salvar documentos no IndexedDB se existirem
      if (documentos && Object.keys(documentos).length > 0) {
        await this.saveDocuments(vendaEnriquecida.id, documentos);
      }

      console.log('✅ Venda salva com sucesso');
    } catch (error) {
      console.error("❌ Erro ao salvar venda:", error);
      throw new Error("Falha ao salvar venda");
    }
  }

  // Obter metadados das vendas
  obterVendasMetadata(): VendaMetadata[] {
    try {
      const vendas = localStorage.getItem(VENDAS_KEY);
      return vendas ? JSON.parse(vendas) : [];
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      return [];
    }
  }

  // Obter venda completa com documentos
  async obterVendaCompleta(vendaId: string): Promise<Venda | null> {
    try {
      const vendas = this.obterVendasMetadata();
      const vendaMetadata = vendas.find(v => v.id === vendaId);
      
      if (!vendaMetadata) return null;

      const venda: Venda = vendaMetadata as Venda;

      // Recuperar documentos se existirem
      if (vendaMetadata.hasDocuments) {
        const documentos = await this.getDocuments(vendaId);
        if (documentos) {
          venda.documentos = documentos;
        }
      }

      return venda;
    } catch (error) {
      console.error("Erro ao carregar venda completa:", error);
      return null;
    }
  }

  // Obter todas as vendas (apenas metadados para listagem)
  async obterVendas(): Promise<Venda[]> {
    const vendas = this.obterVendasMetadata();
    return vendas.map(v => {
      const { hasDocuments, ...venda } = v;
      return venda as Venda;
    });
  }

  // Atualizar status
  async atualizarStatusVenda(
    id: string, 
    novoStatus: Venda["status"],
    extraData?: { dataInstalacao?: string; motivoPerda?: string }
  ): Promise<void> {
    try {
      const vendas = this.obterVendasMetadata();
      const vendaIndex = vendas.findIndex(v => v.id === id);
      
      if (vendaIndex !== -1) {
        vendas[vendaIndex].status = novoStatus;
        if (extraData?.dataInstalacao) {
          (vendas[vendaIndex] as any).dataInstalacao = extraData.dataInstalacao;
        }
        if (extraData?.motivoPerda) {
          (vendas[vendaIndex] as any).motivoPerda = extraData.motivoPerda;
        }
        localStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
      }
    } catch (error) {
      console.error("Erro ao atualizar status da venda:", error);
      throw new Error("Falha ao atualizar status");
    }
  }

  // Migrar vendas existentes que não possuem dados de equipe
  async migrarVendasSemEquipe(): Promise<number> {
    try {
      console.log('🔄 Iniciando migração de vendas sem equipe...');
      
      const vendasMetadata = this.obterVendasMetadata();
      let vendasAtualizadas = 0;
      
      for (let i = 0; i < vendasMetadata.length; i++) {
        const venda = vendasMetadata[i];
        
        if (venda.vendedorId && !venda.equipeId) {
          console.log('🔄 Migrando venda:', venda.id, 'vendedor:', venda.vendedorNome);
          
          const dadosEquipe = await this.buscarDadosEquipe(venda.vendedorId);
          if (dadosEquipe) {
            venda.equipeId = dadosEquipe.equipeId;
            venda.equipeNome = dadosEquipe.equipeNome;
            vendasAtualizadas++;
            console.log('✅ Venda migrada com equipe:', dadosEquipe.equipeNome);
          } else {
            console.log('⚠️ Não foi possível obter dados da equipe para:', venda.vendedorNome);
          }
        }
      }
      
      if (vendasAtualizadas > 0) {
        localStorage.setItem(VENDAS_KEY, JSON.stringify(vendasMetadata));
        console.log(`✅ Migração concluída: ${vendasAtualizadas} vendas atualizadas`);
      } else {
        console.log('ℹ️ Nenhuma venda precisou ser migrada');
      }
      
      return vendasAtualizadas;
    } catch (error) {
      console.error('❌ Erro durante migração de vendas:', error);
      return 0;
    }
  }

  // Gerar estatísticas
  obterEstatisticasVendas() {
    const vendas = this.obterVendasMetadata();
    
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
      const vendedor = venda.vendedorNome || 'Vendedor Desconhecido';
      acc[vendedor] = (acc[vendedor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Vendas por equipe
    const vendasPorEquipe = vendas.reduce((acc, venda) => {
      const equipe = venda.equipeNome || 'Sem Equipe';
      acc[equipe] = (acc[equipe] || 0) + 1;
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
      vendasPorEquipe,
      taxaConversao: totalVendas > 0 ? (vendasHabilitadas / totalVendas) * 100 : 0
    };
  }

  // Verificar uso de armazenamento
  async checkStorageUsage(): Promise<{ used: number; available: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;
      
      return { used, available, percentage };
    }
    
    return { used: 0, available: 0, percentage: 0 };
  }
}

export const storageService = new StorageService();