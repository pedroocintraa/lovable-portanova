/**
 * Painel de debug para autenticação - mostra estado detalhado e permite correções
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Zap } from 'lucide-react';
import { debugAuthenticationAdvanced, validateAndFixAuth, forceTokenRefresh } from '@/utils/authFix';

interface AuthDebugResult {
  auth_uid: string | null;
  auth_email: string | null;
  jwt_claims: any;
  session_valid: boolean;
  usuario_encontrado: boolean;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_funcao: string | null;
  timestamp_check: string;
}

export function AuthDebugPanel() {
  const [debugResult, setDebugResult] = useState<AuthDebugResult | null>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebugAuth = async () => {
    setLoading(true);
    try {
      const result = await debugAuthenticationAdvanced();
      setDebugResult(result);
    } catch (error) {
      console.error('Erro no debug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixAuth = async () => {
    setLoading(true);
    try {
      const result = await validateAndFixAuth();
      setFixResult(result);
      
      // Atualizar debug após correção
      const debugResult = await debugAuthenticationAdvanced();
      setDebugResult(debugResult);
    } catch (error) {
      console.error('Erro na correção:', error);
      setFixResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const success = await forceTokenRefresh();
      if (success) {
        // Atualizar debug após refresh
        setTimeout(async () => {
          const debugResult = await debugAuthenticationAdvanced();
          setDebugResult(debugResult);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro no refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (valid: boolean, label: string) => {
    return (
      <Badge variant={valid ? "default" : "destructive"}>
        {valid ? "✓" : "✗"} {label}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Debug de Autenticação Avançado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleDebugAuth}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Debug Completo
          </Button>
          
          <Button
            onClick={handleRefreshToken}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Refresh Token
          </Button>
          
          <Button
            onClick={handleFixAuth}
            disabled={loading}
            variant="default"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Corrigir Autenticação
          </Button>
        </div>

        {debugResult && (
          <div className="space-y-4">
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Estado da Sessão</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(debugResult.session_valid)}
                    <span className="text-sm">
                      Sessão Válida: {debugResult.session_valid ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugResult.auth_uid)}
                    <span className="text-sm">
                      Auth UID: {debugResult.auth_uid || 'null'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugResult.auth_email)}
                    <span className="text-sm">
                      Auth Email: {debugResult.auth_email || 'null'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Dados do Usuário</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(debugResult.usuario_encontrado)}
                    <span className="text-sm">
                      Usuário Encontrado: {debugResult.usuario_encontrado ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  {debugResult.usuario_nome && (
                    <div className="text-sm">
                      <strong>Nome:</strong> {debugResult.usuario_nome}
                    </div>
                  )}
                  {debugResult.usuario_funcao && (
                    <div className="text-sm">
                      <strong>Função:</strong> {debugResult.usuario_funcao}
                    </div>
                  )}
                  {debugResult.usuario_id && (
                    <div className="text-sm text-xs text-muted-foreground">
                      <strong>ID:</strong> {debugResult.usuario_id}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {getStatusBadge(debugResult.session_valid, "Contexto Auth")}
              {getStatusBadge(debugResult.usuario_encontrado, "Usuário Local")}
              {getStatusBadge(!!debugResult.jwt_claims, "JWT Claims")}
            </div>

            {debugResult.jwt_claims && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold">JWT Claims (clique para expandir)</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(debugResult.jwt_claims, null, 2)}
                </pre>
              </details>
            )}

            <div className="text-xs text-muted-foreground">
              Última verificação: {new Date(debugResult.timestamp_check).toLocaleString()}
            </div>
          </div>
        )}

        {fixResult && (
          <Alert variant={fixResult.success ? "default" : "destructive"}>
            <AlertDescription>
              <strong>Resultado da Correção:</strong> {fixResult.message}
              {fixResult.authData && (
                <div className="mt-2 text-xs">
                  Debug atualizado: Sessão válida = {fixResult.authData.session_valid ? 'Sim' : 'Não'}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            Este painel mostra o estado detalhado da autenticação e pode ajudar a identificar 
            problemas de contexto JWT. Use "Corrigir Autenticação" se detectar inconsistências.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}