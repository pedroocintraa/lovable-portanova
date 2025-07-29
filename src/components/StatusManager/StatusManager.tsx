import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, FileX } from "lucide-react";
import { Venda } from "@/types/venda";

interface StatusManagerProps {
  venda: Venda;
  onStatusChange: (newStatus: Venda["status"], extraData?: { dataInstalacao?: string; motivoPerda?: string }) => void;
}

export const StatusManager: React.FC<StatusManagerProps> = ({ venda, onStatusChange }) => {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [dataInstalacao, setDataInstalacao] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");

  const getNextActions = () => {
    switch (venda.status) {
      case "pendente":
        return [
          { action: "em_andamento", label: "Iniciar Processo", variant: "default" as const },
          { action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true }
        ];
      case "em_andamento":
        return [
          { action: "auditada", label: "Marcar como Auditada", variant: "default" as const },
          { action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true }
        ];
      case "auditada":
        return [
          { action: "gerada", label: "Marcar como Gerada", variant: "default" as const },
          { action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true }
        ];
      case "gerada":
        return [
          { action: "aguardando_habilitacao", label: "Aguardando Habilitação", variant: "default" as const, needsInstallDate: true },
          { action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true }
        ];
      case "aguardando_habilitacao":
        return [
          { action: "habilitada", label: "Marcar como Habilitada", variant: "default" as const }
        ];
      case "habilitada":
        return [];
      case "perdida":
        return [];
      default:
        return [];
    }
  };

  const handleAction = (action: Venda["status"], needsReason?: boolean, needsInstallDate?: boolean) => {
    if (needsReason) {
      setShowLostDialog(true);
    } else if (needsInstallDate) {
      setShowInstallDialog(true);
    } else {
      onStatusChange(action);
    }
  };

  const handleInstallConfirm = () => {
    if (dataInstalacao) {
      onStatusChange("aguardando_habilitacao", { dataInstalacao });
      setShowInstallDialog(false);
      setDataInstalacao("");
    }
  };

  const handleLostConfirm = () => {
    if (motivoPerda.trim()) {
      onStatusChange("perdida", { motivoPerda });
      setShowLostDialog(false);
      setMotivoPerda("");
    }
  };

  const actions = getNextActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.action}
            variant={action.variant}
            size="sm"
            onClick={() => handleAction(action.action, action.needsReason, action.needsInstallDate)}
            className="flex items-center gap-2"
          >
            {action.variant === "destructive" && <FileX className="h-4 w-4" />}
            {action.needsInstallDate && <Calendar className="h-4 w-4" />}
            {action.label}
          </Button>
        ))}
      </div>

      {/* Install Date Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Instalação</DialogTitle>
            <DialogDescription>
              Defina a data da instalação para continuar o processo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dataInstalacao">Data da Instalação</Label>
              <Input
                id="dataInstalacao"
                type="date"
                value={dataInstalacao}
                onChange={(e) => setDataInstalacao(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInstallConfirm} disabled={!dataInstalacao}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost Sale Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Marcar Venda como Perdida
            </DialogTitle>
            <DialogDescription>
              Informe o motivo pelo qual esta venda foi perdida. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivoPerda">Motivo da Perda</Label>
              <Textarea
                id="motivoPerda"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                placeholder="Descreva o motivo pelo qual esta venda foi perdida..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLostDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLostConfirm} 
                disabled={!motivoPerda.trim()}
              >
                Confirmar Perda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};