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

import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <Dashboard />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/vendas" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <CadastroVenda />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/acompanhamento" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <AcompanhamentoVendas />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/venda/:id" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <DetalhesVenda />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredPermission="podeGerenciarUsuarios">
                    <Navbar />
                    <main className="container mx-auto px-4 py-8">
                      <GerenciamentoUsuarios />
                    </main>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              <Route path="/equipes" element={
                <ProtectedRoute>
                  <RoleProtectedRoute requiredPermission="podeGerenciarEquipes">
                    <Navbar />
                    <main className="container mx-auto px-4 py-8">
                      <GerenciamentoEquipes />
                    </main>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <Configuracoes />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="/change-password" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <ChangePassword />
                  </main>
                </ProtectedRoute>
              } />
              <Route path="*" element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    <NotFound />
                  </main>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
