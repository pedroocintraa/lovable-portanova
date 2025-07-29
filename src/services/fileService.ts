/**
 * Serviço de processamento de arquivos
 * Apenas funções utilitárias para compressão e formatação
 */

import { DocumentoAnexado } from "@/types/venda";

class FileService {
  // Comprimir imagem
  async compressImage(file: File): Promise<string> {
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

  // Processar arquivo para upload
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

  // Função utilitária para formatar tamanho de arquivo
  formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const fileService = new FileService();