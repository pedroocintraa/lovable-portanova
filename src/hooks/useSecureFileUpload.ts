import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecureFileUploadParams {
  file: File;
  vendaId: string;
  tipoDocumento: string;
}

interface UploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export const useSecureFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async ({ file, vendaId, tipoDocumento }: SecureFileUploadParams): Promise<UploadResult> => {
    setUploading(true);
    
    try {
      // Convert file to base64
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      // Call secure upload edge function
      const { data, error } = await supabase.functions.invoke('secure-file-upload', {
        body: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileData,
          vendaId,
          tipoDocumento
        }
      });

      if (error) {
        console.error('Secure upload error:', error);
        toast({
          title: "Erro no upload",
          description: "Falha na validação de segurança do arquivo",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      if (!data.success) {
        toast({
          title: "Erro no upload",
          description: data.error || "Falha no upload do arquivo",
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }

      toast({
        title: "Upload realizado",
        description: "Arquivo enviado com segurança",
      });

      return { 
        success: true, 
        documentId: data.documentId 
      };

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Erro interno no upload do arquivo",
        variant: "destructive",
      });
      return { success: false, error: 'Internal error' };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading
  };
};