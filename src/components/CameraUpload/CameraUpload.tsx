import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentoAnexado } from "@/types/venda";
import { Camera, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraUploadProps {
  titulo: string;
  documentos: DocumentoAnexado[];
  onDocumentosChange: (documentos: DocumentoAnexado[]) => void;
}

/**
 * Componente para captura de selfie exclusivamente pela câmera
 */
const CameraUpload = ({ 
  titulo, 
  documentos, 
  onDocumentosChange
}: CameraUploadProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /**
   * Processa arquivo capturado pela câmera
   */
  const processarArquivoCamera = async (file: File) => {
    try {
      // Validar se é imagem
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Apenas imagens são permitidas para selfie",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem excede o limite de 10MB",
          variant: "destructive",
        });
        return;
      }

      setIsCapturing(true);

      // Usar fileService para processar o arquivo com compressão
      const { fileService } = await import("@/services/fileService");
      const documento = await fileService.processFile(file);
      
      // Substituir documento existente (máximo 1 selfie)
      onDocumentosChange([documento]);
      
      toast({
        title: "Selfie capturada",
        description: "Selfie do cliente capturada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao processar selfie:", error);
      toast({
        title: "Erro ao capturar selfie",
        description: "Não foi possível processar a imagem",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Remove selfie
   */
  const removerSelfie = () => {
    onDocumentosChange([]);
    toast({
      title: "Selfie removida",
      description: "Selfie do cliente removida com sucesso",
    });
  };

  /**
   * Abre a câmera para captura
   */
  const abrirCamera = () => {
    fileInputRef.current?.click();
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

  const selfie = documentos[0];

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-primary" />
          <span>{titulo}</span>
          {selfie && (
            <span className="text-sm text-success">✓ Capturada</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selfie ? (
          // Área de captura
          <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center">
            <Camera className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Capturar Selfie do Cliente
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Use a câmera do dispositivo para capturar a selfie do cliente
            </p>
            <Button 
              onClick={abrirCamera}
              disabled={isCapturing}
              className="mb-4"
            >
              {isCapturing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Selfie
                </>
              )}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processarArquivoCamera(e.target.files[0]);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              * Obrigatório - Apenas câmera frontal permitida
            </p>
          </div>
        ) : (
          // Selfie capturada
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
                  <Camera className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selfie.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarTamanho(selfie.tamanho)} • {new Date(selfie.dataUpload).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abrirCamera}
                  disabled={isCapturing}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Refazer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removerSelfie}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Preview da imagem se possível */}
            {selfie.conteudo && (
              <div className="relative max-w-xs mx-auto">
                <img 
                  src={selfie.conteudo} 
                  alt="Selfie do cliente"
                  className="w-full h-auto rounded-lg border border-border shadow-sm"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CameraUpload;