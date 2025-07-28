import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { migracaoService } from '@/services/migracaoService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function MigrationHelper() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ sucessos: number; erros: string[] } | null>(null);

  const executarMigracao = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('Executando migração de usuários...');
      const resultado = await migracaoService.migrarUsuariosExistentes();
      setResult(resultado);
      console.log('Migração concluída:', resultado);
    } catch (error) {
      console.error('Erro na migração:', error);
      setResult({ sucessos: 0, erros: ['Erro geral na migração'] });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Migração para Supabase Auth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Este processo migra os usuários existentes para o sistema de autenticação integrado.
            <br />
            <strong>Senha temporária:</strong> senha123
          </AlertDescription>
        </Alert>

        <Button 
          onClick={executarMigracao} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Migrando usuários...
            </>
          ) : (
            'Executar Migração'
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            {result.sucessos > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ {result.sucessos} usuário(s) migrado(s) com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {result.erros.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  ❌ Erros encontrados:
                  <ul className="mt-2 list-disc list-inside">
                    {result.erros.map((erro, index) => (
                      <li key={index} className="text-sm">{erro}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>⚠️ Após a migração:</p>
          <p>• Usuários poderão fazer login com email + senha123</p>
          <p>• Emails de boas-vindas serão enviados automaticamente</p>
          <p>• Sistema funcionará com autenticação integrada</p>
        </div>
      </CardContent>
    </Card>
  );
}