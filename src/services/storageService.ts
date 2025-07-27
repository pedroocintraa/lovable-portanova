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

  // Salvar venda
  async salvarVenda(venda: Venda): Promise<void> {
    try {
      // Separar metadados dos documentos
      const { documentos, ...metadata } = venda;
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
        await this.saveDocuments(venda.id, documentos);
      }
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
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
  async atualizarStatusVenda(id: string, novoStatus: Venda["status"]): Promise<void> {
    try {
      const vendas = this.obterVendasMetadata();
      const vendaIndex = vendas.findIndex(v => v.id === id);
      
      if (vendaIndex !== -1) {
        vendas[vendaIndex].status = novoStatus;
        localStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
      }
    } catch (error) {
      console.error("Erro ao atualizar status da venda:", error);
      throw new Error("Falha ao atualizar status");
    }
  }

  // Gerar estatísticas
  obterEstatisticasVendas() {
    const vendas = this.obterVendasMetadata();
    
    const totalVendas = vendas.length;
    const vendasGeradas = vendas.filter(v => v.status === "gerada").length;
    const vendasEmAndamento = vendas.filter(v => v.status === "em_andamento").length;
    const vendasAprovadas = vendas.filter(v => v.status === "aprovada").length;
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

    return {
      totalVendas,
      vendasGeradas,
      vendasEmAndamento,
      vendasAprovadas,
      vendasPerdidas,
      vendasPorBairro,
      vendasPorCidade,
      taxaConversao: totalVendas > 0 ? (vendasAprovadas / totalVendas) * 100 : 0
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