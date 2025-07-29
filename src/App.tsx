import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Layout/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CadastroVenda from "./pages/CadastroVenda";
import AcompanhamentoVendas from "./pages/AcompanhamentoVendas";
import DetalhesVenda from "./pages/DetalhesVenda";
import GerenciamentoUsuarios from "./pages/GerenciamentoUsuarios";
import GerenciamentoEquipes from "./pages/GerenciamentoEquipes";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/vendas" element={<CadastroVenda />} />
                      <Route path="/acompanhamento" element={<AcompanhamentoVendas />} />
                      <Route path="/venda/:id" element={<DetalhesVenda />} />
                      <Route path="/usuarios" element={
                        <RoleProtectedRoute requiredPermission="podeGerenciarUsuarios">
                          <GerenciamentoUsuarios />
                        </RoleProtectedRoute>
                      } />
                      <Route path="/equipes" element={
                        <RoleProtectedRoute requiredPermission="podeGerenciarEquipes">
                          <GerenciamentoEquipes />
                        </RoleProtectedRoute>
                      } />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/change-password" element={<ChangePassword />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
