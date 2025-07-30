import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Users, RefreshCw } from 'lucide-react';
import { migrateAllUsers, forceClearAuthSession, type MigrationResult } from '@/utils/userMigration';

export const MigrationPanel: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const handleMigration = async () => {
    setIsMigrating(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateAllUsers();
      setResult(migrationResult);
      
      if (migrationResult.success && migrationResult.migrados > 0) {
        // Aguardar um pouco para a migração ser processada
        setTimeout(() => {
          alert('Migração concluída! A página será recarregada para aplicar as mudanças.');
          forceClearAuthSession();
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        total: 0,
        migrados: 0,
        ja_existiam: 0,
        erros: [error.message],
        error: error.message
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearSession = () => {
    if (confirm('Isso irá limpar todas as sessões e recarregar a página. Continuar?')) {
      forceClearAuthSession();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Correção Crítica - Migração de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problema detectado:</strong> Usuários não sincronizados entre tabela 'usuarios' e Supabase Auth.
            Isso está impedindo o cadastro de vendas.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button 
            onClick={handleMigration}
            disabled={isMigrating}
            className="w-full"
            size="lg"
          >
            {isMigrating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migrando Usuários...</>
            ) : (
              <><Users className="mr-2 h-4 w-4" /> Migrar Todos os Usuários</>
            )}
          </Button>

          <Button 
            onClick={handleClearSession}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Limpar Sessões e Recarregar
          </Button>
        </div>

        {result && (
          <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
            <CardContent className="pt-4">
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Migração Concluída!</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Total de usuários: {result.total}</p>
                    <p>Migrados: {result.migrados}</p>
                    <p>Já existiam: {result.ja_existiam}</p>
                    {result.erros.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-600">
                          {result.erros.length} erro(s) encontrado(s)
                        </summary>
                        <ul className="mt-1 text-xs">
                          {result.erros.map((erro, index) => (
                            <li key={index} className="text-red-600">• {erro}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Erro na Migração</span>
                  </div>
                  <p className="text-sm text-red-600">{result.error}</p>
                  {result.erros.length > 0 && (
                    <ul className="text-xs text-red-600">
                      {result.erros.map((erro, index) => (
                        <li key={index}>• {erro}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};