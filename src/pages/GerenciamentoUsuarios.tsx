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
import { Plus, Search, Edit, Trash2, Users, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


export default function GerenciamentoUsuarios() {
  const { toast } = useToast();
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<string>("ATIVOS");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>();
  const [usuariosInconsistentes, setUsuariosInconsistentes] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    filtrarUsuarios();
  }, [usuarios, busca, filtroFuncao, filtroStatus]);

  useEffect(() => {
    verificarConsistenciaUsuarios();
  }, [usuarios]);

  const carregarUsuarios = async () => {
    try {
      const usuariosAtivos = await usuariosService.obterUsuarios();
      const usuariosInativos = await usuariosService.obterUsuariosInativos();
      setUsuarios([...usuariosAtivos, ...usuariosInativos]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    }
  };

  const verificarConsistenciaUsuarios = async () => {
    try {
      const inconsistentes = new Set<string>();

      for (const usuario of usuarios) {
        try {
          const consistencia = await usuariosService.verificarConsistenciaUsuario(usuario.id);
          if (!consistencia.consistente) {
            inconsistentes.add(usuario.id);
          }
        } catch (error) {
          console.error(`Erro ao verificar consistência do usuário ${usuario.nome}:`, error);
        }
      }

      setUsuariosInconsistentes(inconsistentes);
    } catch (error) {
      console.error('Erro ao verificar consistência dos usuários:', error);
    }
  };

  const filtrarUsuarios = () => {
    let resultado = usuarios;

    // Filtro por status
    if (filtroStatus === "ATIVOS") {
      resultado = resultado.filter(usuario => usuario.ativo);
    } else if (filtroStatus === "INATIVOS") {
      resultado = resultado.filter(usuario => !usuario.ativo);
    }

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

  const handleSalvarUsuario = async (usuario: any) => {
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
    } catch (error: any) {
      // Verificar se é erro de usuário já existente
      if (error.message && error.message.includes('já existe um usuário')) {
        toast({
          title: "Usuário já cadastrado",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: error.message || "Erro ao salvar usuário. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDesativarUsuario = async (id: string) => {
    // Verificar se é administrador geral
    if (usuarioLogado?.funcao !== FuncaoUsuario.ADMINISTRADOR_GERAL) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores gerais podem desativar usuários",
        variant: "destructive"
      });
      return;
    }

    try {
      await usuariosService.desativarUsuario(id);
      carregarUsuarios();
      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desativar usuário",
        variant: "destructive"
      });
    }
  };

  const handleExcluirPermanentemente = async (id: string, nome: string) => {
    // Verificar se é administrador geral
    if (usuarioLogado?.funcao !== FuncaoUsuario.ADMINISTRADOR_GERAL) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores gerais podem excluir usuários permanentemente",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nTem certeza que deseja excluir permanentemente o usuário "${nome}"?\n\nTodos os dados serão perdidos definitivamente.`)) {
      return;
    }

    if (!window.confirm("Confirme novamente: Esta exclusão é PERMANENTE e não pode ser desfeita!")) {
      return;
    }

    try {
      await usuariosService.excluirUsuarioPermanentemente(id);
      carregarUsuarios();
      toast({
        title: "Sucesso",
        description: "Usuário excluído permanentemente!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const handleReativarUsuario = async (id: string) => {
    // Verificar se é administrador geral
    if (usuarioLogado?.funcao !== FuncaoUsuario.ADMINISTRADOR_GERAL) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores gerais podem reativar usuários",
        variant: "destructive"
      });
      return;
    }

    try {
      await usuariosService.reativarUsuario(id);
      carregarUsuarios();
      toast({
        title: "Sucesso",
        description: "Usuário reativado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao reativar usuário",
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
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ATIVOS">Ativos</SelectItem>
                  <SelectItem value="INATIVOS">Inativos</SelectItem>
                </SelectContent>
              </Select>
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
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{usuario.nome}</CardTitle>
                      {!usuario.ativo && (
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                     <div className="flex items-center gap-2 mt-2">
                       <Badge className={obterCorFuncao(usuario.funcao)}>
                         {obterNomeFuncao(usuario.funcao)}
                       </Badge>
                       {usuariosInconsistentes.has(usuario.id) && (
                         <Badge variant="destructive" className="text-xs">
                           Inconsistente
                         </Badge>
                       )}
                     </div>
                  </div>
                  <div className="flex gap-2">
                    {usuario.ativo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditarUsuario(usuario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {usuarioLogado?.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL && (
                      <>
                        {usuario.ativo ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja desativar o usuário {usuario.nome}?
                                  O usuário não conseguirá mais acessar o sistema, mas poderá ser reativado posteriormente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDesativarUsuario(usuario.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Desativar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <div className="flex gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <RotateCcw className="h-4 w-4 text-green-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Reativação</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja reativar o usuário {usuario.nome}?
                                    O usuário voltará a ter acesso ao sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReativarUsuario(usuario.id)}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                  >
                                    Reativar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-red-800" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>⚠️ EXCLUSÃO PERMANENTE</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <strong>ATENÇÃO: Esta ação é IRREVERSÍVEL!</strong><br/><br/>
                                    Você está prestes a excluir permanentemente o usuário <strong>{usuario.nome}</strong>.<br/><br/>
                                    Todos os dados serão perdidos definitivamente e não poderão ser recuperados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleExcluirPermanentemente(usuario.id, usuario.nome)}
                                    className="bg-red-800 text-white hover:bg-red-900"
                                  >
                                    Excluir Permanentemente
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </>
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