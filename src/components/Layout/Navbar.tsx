import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Menu, X, UserCog, Home, Plus, Eye, Settings, LogOut, Lock, ChevronDown } from "lucide-react";


/**
 * Componente de navegação principal do CRM
 * Responsivo com menu mobile
 */
export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const {
    usuario,
    permissoes,
    logout
  } = useAuth();
  const handleLogout = () => {
    logout();
  };
  const menuItems = [{
    path: "/",
    label: "Dashboard",
    icon: Home,
    permitido: permissoes?.podeAcessarDashboard
  }, {
    path: "/vendas",
    label: "Nova Venda",
    icon: Plus,
    permitido: true // Todos podem criar vendas
  }, {
    path: "/acompanhamento",
    label: "Vendas",
    icon: Eye,
    permitido: true // Todos podem ver vendas (filtro aplicado na página)
  }, {
    path: "/usuarios",
    label: "Usuários",
    icon: UserCog,
    permitido: permissoes?.podeGerenciarUsuarios
  }, {
    path: "/equipes",
    label: "Equipes",
    icon: Users,
    permitido: permissoes?.podeGerenciarEquipes
  }, {
    path: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    permitido: usuario?.funcao === "ADMINISTRADOR_GERAL"
  }].filter(item => item.permitido);
  const isActive = (path: string) => location.pathname === path;
  return <nav className="bg-card shadow-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <img src="/lovable-uploads/c25efcbd-b42b-48b3-9e82-db0628ef0cbc.png" alt="SA TELECOM" className="h-24 w-auto object-contain" />
              
            </Link>
          </div>

          {/* Menu Desktop e Usuário */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Menu de navegação */}
            <div className="flex items-center space-x-1">
              {menuItems.map(item => {
              const Icon = item.icon;
              return <Link key={item.path} to={item.path}>
                    <Button variant={isActive(item.path) ? "default" : "ghost"} className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>;
            })}
            </div>

            {/* Informações do usuário */}
            {usuario && <div className="flex items-center space-x-3 border-l border-border pl-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {usuario.nome}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {usuario.funcao.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/change-password" className="flex items-center w-full">
                        <Lock className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>}
          </div>

          {/* Botão Menu Mobile */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card border-t border-border">
              {/* Informações do usuário - Mobile */}
              {usuario && <div className="px-3 py-2 mb-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {usuario.nome}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {usuario.funcao.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>}
              
              {/* Menu de navegação */}
              {menuItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)}>
                    <Button variant={isActive(item.path) ? "default" : "ghost"} className="w-full justify-start space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>;
          })}
            </div>
          </div>}
      </div>
    </nav>;
};