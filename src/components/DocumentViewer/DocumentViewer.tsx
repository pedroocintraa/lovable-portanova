import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentosVenda, DocumentoAnexado } from '@/types/venda';
import { Download, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentViewerProps {
  documentos: DocumentosVenda;
  trigger: React.ReactNode;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentos, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Flatten all documents into a single array
  const allDocuments: Array<{ categoria: string; documento: DocumentoAnexado }> = [];
  
  Object.entries(documentos).forEach(([categoria, docs]) => {
    if (docs && docs.length > 0) {
      docs.forEach(doc => {
        allDocuments.push({ categoria, documento: doc });
      });
    }
  });

  const currentDocument = allDocuments[currentDocumentIndex];

  const handlePrevious = () => {
    setCurrentDocumentIndex(prev => 
      prev === 0 ? allDocuments.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentDocumentIndex(prev => 
      prev === allDocuments.length - 1 ? 0 : prev + 1
    );
  };

  const handleDownload = async (doc: DocumentoAnexado) => {
    try {
      // Convert base64 to blob
      const base64Data = doc.conteudo.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.tipo });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
    }
  };

  const openViewer = () => {
    setCurrentDocumentIndex(0);
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    return '📎';
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      {/* Lista de documentos */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos Anexados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {Object.entries(documentos).map(([categoria, docs]) => {
              if (!docs || docs.length === 0) return null;
              
              return (
                <div key={categoria} className="space-y-2">
                  <h3 className="font-semibold text-lg capitalize">
                    {categoria.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {docs.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">
                            {getDocumentIcon(doc.tipo)}
                          </span>
                          <div className="flex gap-1">
                            {doc.tipo.startsWith('image/') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentDocumentIndex(allDocuments.findIndex(d => 
                                    d.categoria === categoria && d.documento.id === doc.id
                                  ));
                                  setIsViewerOpen(true);
                                  setIsOpen(false);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium truncate">{doc.nome}</p>
                          <p className="text-muted-foreground text-xs">
                            {(doc.tamanho / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visualizador de imagens */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={allDocuments.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentDocumentIndex + 1} de {allDocuments.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={allDocuments.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {currentDocument?.categoria.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeViewer}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Imagem */}
            <div className="flex items-center justify-center p-4">
              {currentDocument && currentDocument.documento.tipo.startsWith('image/') ? (
                <img
                  src={currentDocument.documento.conteudo}
                  alt={currentDocument.documento.nome}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Este tipo de arquivo não pode ser visualizado
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleDownload(currentDocument.documento)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivo
                  </Button>
                </div>
              )}
            </div>

            {/* Footer com informações */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentDocument?.documento.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {(currentDocument?.documento.tamanho / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(currentDocument.documento)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentViewer;