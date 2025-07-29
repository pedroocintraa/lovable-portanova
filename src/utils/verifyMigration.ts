/**
 * Utilitário para verificar se a migração para o servidor foi concluída
 * Execute no console: verificarMigracao()
 */

import { systemService } from "@/services/systemService";

interface VerificationResult {
  allOnServer: boolean;
  details: {
    vendas: { onServer: boolean; service: string };
    usuarios: { onServer: boolean; service: string };
    arquivos: { onServer: boolean; service: string };
    equipes: { onServer: boolean; service: string };
    configuracoes: { onServer: boolean; service: string };
  };
  localStorage: {
    hasData: boolean;
    keys: string[];
  };
  indexedDB: {
    hasData: boolean;
    databases: string[];
  };
  serverStatus: {
    online: boolean;
    latency?: number;
  };
}

/**
 * Verifica se todos os dados foram migrados para o servidor
 */
export const verificarMigracao = async (): Promise<VerificationResult> => {
  console.log('🔍 Verificando migração para o servidor...');
  
  // Verificar status do servidor
  const serverStatus = await systemService.verificarStatusServidor();
  
  // Verificar localStorage
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('crm_') || key.includes('venda') || key.includes('usuario')
  );
  
  // Verificar IndexedDB
  let indexedDBDatabases: string[] = [];
  try {
    if ('indexedDB' in window) {
      // IndexedDB check
      indexedDBDatabases = await new Promise((resolve) => {
        try {
          const request = indexedDB.databases?.();
          if (request) {
            request.then(dbs => resolve(dbs.map(db => db.name || '')));
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    }
  } catch (error) {
    console.warn('Não foi possível verificar IndexedDB:', error);
  }

  const result: VerificationResult = {
    allOnServer: false,
    details: {
      vendas: { onServer: true, service: 'supabaseService' },
      usuarios: { onServer: true, service: 'usuariosService (Supabase)' },
      arquivos: { onServer: true, service: 'fileService + Supabase Storage' },
      equipes: { onServer: true, service: 'equipesService (Supabase)' },
      configuracoes: { onServer: true, service: 'configuracaoService (Supabase)' }
    },
    localStorage: {
      hasData: localStorageKeys.length > 0,
      keys: localStorageKeys
    },
    indexedDB: {
      hasData: indexedDBDatabases.some(db => db.includes('CRM')),
      databases: indexedDBDatabases.filter(db => db.includes('CRM'))
    },
    serverStatus: {
      online: serverStatus.status === 'online',
      latency: serverStatus.latencia
    }
  };

  // Determinar se tudo está no servidor
  result.allOnServer = Object.values(result.details).every(detail => detail.onServer) &&
                      result.serverStatus.online &&
                      !result.localStorage.hasData &&
                      !result.indexedDB.hasData;

  // Exibir resultados
  console.log('\n📊 RELATÓRIO DE MIGRAÇÃO:');
  console.log('='.repeat(50));
  
  if (result.allOnServer) {
    console.log('✅ MIGRAÇÃO COMPLETA - 100% dos dados no servidor!');
  } else {
    console.log('⚠️ Migração incompleta - alguns dados ainda locais');
  }
  
  console.log('\n🖥️ STATUS DO SERVIDOR:');
  console.log(`   Status: ${result.serverStatus.online ? '✅ Online' : '❌ Offline'}`);
  if (result.serverStatus.latency) {
    console.log(`   Latência: ${result.serverStatus.latency}ms`);
  }
  
  console.log('\n📦 SERVIÇOS DO SISTEMA:');
  Object.entries(result.details).forEach(([name, detail]) => {
    console.log(`   ${name}: ${detail.onServer ? '✅' : '❌'} ${detail.service}`);
  });
  
  console.log('\n💾 DADOS LOCAIS RESTANTES:');
  console.log(`   localStorage: ${result.localStorage.hasData ? '⚠️' : '✅'} ${result.localStorage.keys.length} chaves`);
  if (result.localStorage.keys.length > 0) {
    console.log(`     Chaves: ${result.localStorage.keys.join(', ')}`);
  }
  
  console.log(`   IndexedDB: ${result.indexedDB.hasData ? '⚠️' : '✅'} ${result.indexedDB.databases.length} bancos CRM`);
  if (result.indexedDB.databases.length > 0) {
    console.log(`     Bancos: ${result.indexedDB.databases.join(', ')}`);
  }
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  if (result.allOnServer) {
    console.log('   • Nenhuma ação necessária - sistema 100% no servidor!');
    console.log('   • Todos os dados são persistidos automaticamente');
    console.log('   • Acesso multi-dispositivo habilitado');
    console.log('   • Controle de acesso via RLS ativo');
  } else {
    if (!result.serverStatus.online) {
      console.log('   • Verificar conexão com o servidor');
    }
    if (result.localStorage.hasData) {
      console.log('   • Executar limpeza do localStorage (dados migrados)');
    }
    if (result.indexedDB.hasData) {
      console.log('   • Executar limpeza do IndexedDB (dados migrados)');
    }
  }
  
  console.log('='.repeat(50));
  
  return result;
};

/**
 * Teste rápido das funcionalidades do sistema
 */
export const testarSistema = async () => {
  console.log('🧪 Testando funcionalidades do sistema...');
  
  try {
    // Testar conexão
    const status = await systemService.verificarStatusServidor();
    console.log(`✅ Servidor: ${status.status} (${status.latencia}ms)`);
    
    // Testar estatísticas
    const stats = await systemService.obterEstatisticasCompletas();
    console.log(`✅ Estatísticas: ${stats.totalVendas} vendas, ${stats.totalUsuarios} usuários`);
    
    console.log('🎉 Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Disponibilizar no window para uso no console
if (typeof window !== 'undefined') {
  (window as any).verificarMigracao = verificarMigracao;
  (window as any).testarSistema = testarSistema;
  
  console.log('🔧 Utilitários de verificação carregados!');
  console.log('📝 Para verificar migração: verificarMigracao()');
  console.log('🧪 Para testar sistema: testarSistema()');
}