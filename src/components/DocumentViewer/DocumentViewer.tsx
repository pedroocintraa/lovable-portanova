import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentoAnexado, DocumentosVenda } from "@/types/venda";
import { FileText, Image, Download, Eye } from "lucide-react";

interface DocumentViewerProps {
  documentos: DocumentosVenda;
  trigger?: React.ReactNode;
}

/**
 * Componente para visualizar documentos anexados
 */
const DocumentViewer = ({ documentos, trigger }: DocumentViewerProps) => {
  const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoAnexado | null>(null);

  /**
   * Conta total de documentos
   */
  const totalDocumentos = [
    ...(documentos.documentoClienteFrente || []),
    ...(documentos.documentoClienteVerso || []),
    ...(documentos.comprovanteEndereco || []),
    ...(documentos.fachadaCasa || [])
  ].length;

  /**
   * Baixa documento
   */
  const baixarDocumento = (documento: DocumentoAnexado) => {
    const link = document.createElement('a');
    link.href = documento.conteudo;
    link.download = documento.nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  /**
   * Renderiza lista de documentos por categoria
   */
  const renderizarCategoria = (titulo: string, docs: DocumentoAnexado[] = []) => {
    if (docs.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">{titulo}</h4>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
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
                    {formatarTamanho(doc.tamanho)} • {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocumentoSelecionado(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => baixarDocumento(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (totalDocumentos === 0) {
    return (
      <Badge variant="secondary" className="text-xs">
        Sem documentos
      </Badge>
    );
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Ver Documentos ({totalDocumentos})
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos Anexados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {renderizarCategoria("Documento Cliente - Frente", documentos.documentoClienteFrente)}
            {renderizarCategoria("Documento Cliente - Verso", documentos.documentoClienteVerso)}
            {renderizarCategoria("Comprovante de Endereço", documentos.comprovanteEndereco)}
            {renderizarCategoria("Fachada da Casa", documentos.fachadaCasa)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização individual */}
      {documentoSelecionado && (
        <Dialog open={!!documentoSelecionado} onOpenChange={() => setDocumentoSelecionado(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{documentoSelecionado.nome}</DialogTitle>
            </DialogHeader>
            
            <div className="flex justify-center">
              {documentoSelecionado.tipo.startsWith('image/') ? (
                <img 
                  src={documentoSelecionado.conteudo} 
                  alt={documentoSelecionado.nome}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center space-y-4 p-8">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Visualização não disponível para este tipo de arquivo
                  </p>
                  <Button onClick={() => baixarDocumento(documentoSelecionado)}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p>Tamanho: {formatarTamanho(documentoSelecionado.tamanho)}</p>
                <p>Enviado em: {new Date(documentoSelecionado.dataUpload).toLocaleString('pt-BR')}</p>
              </div>
              <Button onClick={() => baixarDocumento(documentoSelecionado)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DocumentViewer;