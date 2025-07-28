import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserForm } from "@/components/UserForm/UserForm";
import { Usuario, FuncaoUsuario } from "@/types/usuario";
import { usuariosService } from "@/services/usuariosService";
import { equipesService } from "@/services/equipesService";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";

export default function GerenciamentoUsuarios() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState<string>("TODOS");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    filtrarUsuarios();
  }, [usuarios, busca, filtroFuncao]);

  const carregarUsuarios = async () => {
    try {
      const usuariosCarregados = await usuariosService.obterUsuarios();
      setUsuarios(usuariosCarregados);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    }
  };

  const filtrarUsuarios = () => {
    let resultado = usuarios;

    // Filtro por busca (nome ou email)
    if (busca) {
      resultado = resultado.filter(usuario =>
        usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
        usuario.email.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por função
    if (filtroFuncao !== "TODOS") {
      resultado = resultado.filter(usuario => usuario.funcao === filtroFuncao);
    }

    setUsuariosFiltrados(resultado);
  };

  const handleSalvarUsuario = async (usuario: Usuario) => {
    try {
      if (usuarioEditando) {
        await usuariosService.atualizarUsuario(usuarioEditando.id, usuario);
      } else {
        await usuariosService.salvarUsuario(usuario);
      }
      
      carregarUsuarios();
      setMostrarFormulario(false);
      setUsuarioEditando(undefined);
      
      toast({
        title: "Sucesso",
        description: `Usuário ${usuarioEditando ? "atualizado" : "cadastrado"} com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirUsuario = async (id: string) => {
    try {
      await usuariosService.excluirUsuario(id);
      carregarUsuarios();
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setMostrarFormulario(true);
  };

  const handleNovoUsuario = () => {
    setUsuarioEditando(undefined);
    setMostrarFormulario(true);
  };

  const obterCorFuncao = (funcao: FuncaoUsuario) => {
    switch (funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case FuncaoUsuario.SUPERVISOR:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case FuncaoUsuario.VENDEDOR:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const obterNomeFuncao = (funcao: FuncaoUsuario) => {
    switch (funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return "Administrador Geral";
      case FuncaoUsuario.SUPERVISOR:
        return "Supervisor";
      case FuncaoUsuario.VENDEDOR:
        return "Vendedor";
      default:
        return funcao;
    }
  };

  if (mostrarFormulario) {
    return (
      <div className="container mx-auto p-6">
        <UserForm
          usuario={usuarioEditando}
          onSubmit={handleSalvarUsuario}
          onCancel={() => {
            setMostrarFormulario(false);
            setUsuarioEditando(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
              <p className="text-muted-foreground">
                Gerencie usuários e suas permissões no sistema
              </p>
            </div>
          </div>
          <Button onClick={handleNovoUsuario} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as Funções</SelectItem>
                  <SelectItem value={FuncaoUsuario.ADMINISTRADOR_GERAL}>Administrador Geral</SelectItem>
                  <SelectItem value={FuncaoUsuario.SUPERVISOR}>Supervisor</SelectItem>
                  <SelectItem value={FuncaoUsuario.VENDEDOR}>Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuariosFiltrados.map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{usuario.nome}</CardTitle>
                    <Badge className={`mt-2 ${obterCorFuncao(usuario.funcao)}`}>
                      {obterNomeFuncao(usuario.funcao)}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditarUsuario(usuario)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {usuario.funcao !== FuncaoUsuario.ADMINISTRADOR_GERAL && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o usuário {usuario.nome}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleExcluirUsuario(usuario.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Email:</strong> {usuario.email}</p>
                  <p><strong>Telefone:</strong> {usuario.telefone}</p>
                  <p><strong>CPF:</strong> {usuario.cpf}</p>
                  <p><strong>Cadastro:</strong> {new Date(usuario.dataCadastro).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {usuariosFiltrados.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                {busca || filtroFuncao !== "TODOS"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando o primeiro usuário"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}