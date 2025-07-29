import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Crown } from "lucide-react";
import { Venda } from "@/types/venda";
import { useAuth } from "@/contexts/AuthContext";

interface StatusSelectorProps {
  venda: Venda;
  onStatusChange: (newStatus: Venda["status"], extraData?: { dataInstalacao?: string; motivoPerda?: string }) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({ venda, onStatusChange }) => {
  const [selectedStatus, setSelectedStatus] = useState<Venda["status"] | "">(""); 
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dataInstalacao, setDataInstalacao] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const { usuario } = useAuth();

  // Verificar se o usuário tem permissão (admin geral ou supervisor)
  const hasPermission = usuario?.funcao === "ADMINISTRADOR_GERAL" || usuario?.funcao === "SUPERVISOR";

  if (!hasPermission) {
    return null;
  }

  const statusOptions = [
    { value: "pendente", label: "Pendente" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "auditada", label: "Auditada" },
    { value: "gerada", label: "Gerada" },
    { value: "aguardando_habilitacao", label: "Aguardando Habilitação" },
    { value: "habilitada", label: "Habilitada" },
    { value: "perdida", label: "Perdida" }
  ] as const;

  const handleStatusSelect = (status: Venda["status"]) => {
    setSelectedStatus(status);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (!selectedStatus) return;

    const extraData: { dataInstalacao?: string; motivoPerda?: string } = {};
    
    if (selectedStatus === "aguardando_habilitacao" || selectedStatus === "habilitada") {
      if (!dataInstalacao) {
        alert("Data de instalação é obrigatória para este status");
        return;
      }
      extraData.dataInstalacao = dataInstalacao;
    }
    
    if (selectedStatus === "perdida") {
      if (!motivoPerda.trim()) {
        alert("Motivo da perda é obrigatório");
        return;
      }
      extraData.motivoPerda = motivoPerda;
    }

    onStatusChange(selectedStatus, extraData);
    setShowConfirmDialog(false);
    setSelectedStatus("");
    setDataInstalacao("");
    setMotivoPerda("");
  };

  const isStatusDisabled = (status: Venda["status"]) => {
    return false; // Permitir qualquer mudança para admins/supervisores
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Crown className="h-4 w-4" />
          <span>Controle Administrativo</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={selectedStatus} 
            onValueChange={(value) => handleStatusSelect(value as Venda["status"])}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alterar status..." />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={isStatusDisabled(option.value) || option.value === venda.status}
                  className={option.value === venda.status ? "bg-muted" : ""}
                >
                  {option.label}
                  {option.value === venda.status && " (atual)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alterar Status da Venda
            </DialogTitle>
            <DialogDescription>
              Você está prestes a alterar o status desta venda para "{statusOptions.find(s => s.value === selectedStatus)?.label}".
              Esta é uma ação administrativa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {(selectedStatus === "aguardando_habilitacao" || selectedStatus === "habilitada") && (
              <div>
                <Label htmlFor="dataInstalacao">Data da Instalação *</Label>
                <Input
                  id="dataInstalacao"
                  type="date"
                  value={dataInstalacao}
                  onChange={(e) => setDataInstalacao(e.target.value)}
                  required
                />
              </div>
            )}
            
            {selectedStatus === "perdida" && (
              <div>
                <Label htmlFor="motivoPerda">Motivo da Perda *</Label>
                <Textarea
                  id="motivoPerda"
                  value={motivoPerda}
                  onChange={(e) => setMotivoPerda(e.target.value)}
                  placeholder="Descreva o motivo da perda..."
                  required
                />
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};