import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentoAnexado } from "@/types/venda";
import { Upload, X, FileText, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  titulo: string;
  documentos: DocumentoAnexado[];
  onDocumentosChange: (documentos: DocumentoAnexado[]) => void;
  acceptTypes?: string;
  maxFiles?: number;
}

/**
 * Componente para upload múltiplo de documentos
 */
const DocumentUpload = ({ 
  titulo, 
  documentos, 
  onDocumentosChange, 
  acceptTypes = "image/*,.pdf",
  maxFiles = 3 
}: DocumentUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  /**
   * Converte arquivo para base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  /**
   * Processa arquivos selecionados
   */
  const processarArquivos = async (files: FileList) => {
    const novosDocumentos: DocumentoAnexado[] = [];

    for (let i = 0; i < Math.min(files.length, maxFiles - documentos.length); i++) {
      const file = files[i];
      
      // Validar tamanho (10MB máximo para IndexedDB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`,
          variant: "destructive",
        });
        continue;
      }

      try {
        // Usar fileService para processar o arquivo com compressão
        const { fileService } = await import("@/services/fileService");
        const documento = await fileService.processFile(file);
        novosDocumentos.push(documento);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({
          title: "Erro ao processar arquivo",
          description: `Não foi possível processar ${file.name}`,
          variant: "destructive",
        });
      }
    }

    if (novosDocumentos.length > 0) {
      onDocumentosChange([...documentos, ...novosDocumentos]);
      toast({
        title: "Arquivos carregados",
        description: `${novosDocumentos.length} arquivo(s) adicionado(s)`,
      });
    }
  };

  /**
   * Remove documento
   */
  const removerDocumento = (id: string) => {
    onDocumentosChange(documentos.filter(doc => doc.id !== id));
    toast({
      title: "Arquivo removido",
      description: "Documento removido com sucesso",
    });
  };

  /**
   * Formata tamanho do arquivo
   */
  const formatarTamanho = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5 text-primary" />
          <span>{titulo}</span>
          <span className="text-sm text-muted-foreground">
            ({documentos.length}/{maxFiles})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {documentos.length < maxFiles && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              processarArquivos(e.dataTransfer.files);
            }}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <Label htmlFor={`upload-${titulo}`}>
              <Button variant="outline" asChild>
                <span>Selecionar Arquivos</span>
              </Button>
            </Label>
            <Input
              id={`upload-${titulo}`}
              type="file"
              multiple
              accept={acceptTypes}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  processarArquivos(e.target.files);
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Máximo {maxFiles} arquivo(s), até 10MB cada
            </p>
          </div>
        )}

        {/* Lista de Documentos */}
        {documentos.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Arquivos anexados:</Label>
            {documentos.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {doc.tipo.startsWith('image/') ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {doc.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarTamanho(doc.tamanho)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerDocumento(doc.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;