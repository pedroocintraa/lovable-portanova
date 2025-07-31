import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, FileX, Play, Check, FileCheck, CheckCircle, X } from "lucide-react";
import { Venda } from "@/types/venda";
import { useAuth } from "@/contexts/AuthContext";

interface StatusManagerProps {
  venda: Venda;
  onStatusChange: (newStatus: Venda["status"], extraData?: { dataInstalacao?: string; motivoPerda?: string }) => void;
  showLostOption?: boolean; // Controla se exibe a opção "Marcar como Perdida"
}

export const StatusManager: React.FC<StatusManagerProps> = ({ venda, onStatusChange, showLostOption = true }) => {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [dataInstalacao, setDataInstalacao] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const { usuario } = useAuth();

  // Verificar se o usuário tem permissão para alterar status
  const hasPermission = usuario?.funcao === "ADMINISTRADOR_GERAL" || 
                       usuario?.funcao === "SUPERVISOR" || 
                       usuario?.funcao === "SUPERVISOR_EQUIPE";

  console.log('🔍 StatusManager Debug:', {
    usuario: usuario?.funcao,
    hasPermission,
    vendaStatus: venda.status,
    vendaId: venda.id
  });

  const getNextActions = () => {
    const actions = [];
    
    switch (venda.status) {
      case "pendente":
        actions.push({ action: "em_andamento", label: "Iniciar Processo", variant: "default" as const, icon: "play" });
        if (showLostOption) {
          actions.push({ action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true, icon: "x" });
        }
        break;
      case "em_andamento":
        actions.push({ action: "auditada", label: "Marcar como Auditada", variant: "default" as const, icon: "check" });
        if (showLostOption) {
          actions.push({ action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true, icon: "x" });
        }
        break;
      case "auditada":
        actions.push({ action: "gerada", label: "Marcar como Gerada", variant: "default" as const, icon: "file-check" });
        if (showLostOption) {
          actions.push({ action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true, icon: "x" });
        }
        break;
      case "gerada":
        actions.push({ action: "aguardando_habilitacao", label: "Aguardando Habilitação", variant: "secondary" as const, needsInstallDate: true, icon: "calendar" });
        if (showLostOption) {
          actions.push({ action: "perdida", label: "Marcar como Perdida", variant: "destructive" as const, needsReason: true, icon: "x" });
        }
        break;
      case "aguardando_habilitacao":
        actions.push({ action: "habilitada", label: "Marcar como Habilitada", variant: "default" as const, icon: "check-circle" });
        break;
    }
    
    console.log('🔍 Ações disponíveis:', actions);
    return actions;
  };

  const handleAction = (action: Venda["status"], needsReason?: boolean, needsInstallDate?: boolean) => {
    console.log('🔍 handleAction chamado:', { action, needsReason, needsInstallDate });
    
    if (needsReason) {
      setShowLostDialog(true);
    } else if (needsInstallDate) {
      setShowInstallDialog(true);
    } else {
      console.log('🔍 Chamando onStatusChange:', action);
      onStatusChange(action);
    }
  };

  const handleInstallConfirm = () => {
    console.log('🔍 handleInstallConfirm:', dataInstalacao);
    if (dataInstalacao) {
      onStatusChange("aguardando_habilitacao", { dataInstalacao });
      setShowInstallDialog(false);
      setDataInstalacao("");
    }
  };

  const handleLostConfirm = () => {
    console.log('🔍 handleLostConfirm:', motivoPerda);
    if (motivoPerda.trim()) {
      onStatusChange("perdida", { motivoPerda });
      setShowLostDialog(false);
      setMotivoPerda("");
    }
  };

  const actions = getNextActions();

  // Se não tem permissão ou não há ações, não renderiza nada
  if (!hasPermission || actions.length === 0) {
    console.log('🔍 StatusManager não renderizado:', { hasPermission, actionsLength: actions.length });
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const getIcon = () => {
            switch (action.icon) {
              case "play": return <Play className="h-4 w-4" />;
              case "check": return <Check className="h-4 w-4" />;
              case "file-check": return <FileCheck className="h-4 w-4" />;
              case "calendar": return <Calendar className="h-4 w-4" />;
              case "check-circle": return <CheckCircle className="h-4 w-4" />;
              case "x": return <X className="h-4 w-4" />;
              default: return null;
            }
          };

          return (
            <Button
              key={action.action}
              variant={action.variant}
              size="sm"
              onClick={() => handleAction(action.action, action.needsReason, action.needsInstallDate)}
              className="flex items-center gap-2"
            >
              {getIcon()}
              {action.label}
            </Button>
          );
        })}
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