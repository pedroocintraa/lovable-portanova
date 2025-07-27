# CRM de Vendas Porta a Porta

Um sistema completo de CRM para vendas porta a porta, desenvolvido com React, TypeScript e Tailwind CSS, pronto para conversão em PWA.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Dashboard Analytics**: Métricas de vendas, top bairros/cidades, distribuição por status
- **Cadastro de Vendas**: Formulário completo com integração ViaCEP
- **Acompanhamento**: Lista de vendas com filtros e controle de status
- **Design Responsivo**: Interface moderna e corporativa
- **Validações**: Formulários com tratamento de erros
- **Persistência Local**: Dados salvos no localStorage

### 🔄 Próximas Versões
- Backend com API REST
- Autenticação de usuários
- Relatórios avançados
- Notificações push (PWA)
- Sincronização offline

## 🛠 Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide Icons
- **Roteamento**: React Router v6
- **Forms**: React Hook Form
- **Build Tool**: Vite
- **API Externa**: ViaCEP (busca de endereços)

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── Dashboard/          # Componentes do dashboard
│   ├── Layout/             # Layout e navegação
│   └── ui/                 # Componentes base (shadcn)
├── pages/                  # Páginas principais
│   ├── Dashboard.tsx       # Dashboard principal
│   ├── CadastroVenda.tsx   # Formulário de vendas
│   └── AcompanhamentoVendas.tsx # Lista de vendas
├── services/               # Integrações externas
│   └── viacep.ts          # API ViaCEP
├── types/                  # Definições TypeScript
│   └── venda.ts           # Tipos de vendas
├── utils/                  # Utilitários
│   └── localStorage.ts    # Persistência local
└── hooks/                  # Hooks customizados
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ e npm
- Git

### Instalação
```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd crm-vendas

# 2. Instale as dependências
npm install

# 3. Execute em modo desenvolvimento
npm run dev

# 4. Acesse no navegador
# http://localhost:8080
```

### Build para Produção
```bash
npm run build
npm run preview
```

## 📱 Conversão para PWA

### 1. Criar Manifest (public/manifest.json)
```json
{
  "name": "CRM Vendas Porta a Porta",
  "short_name": "CRM Vendas",
  "description": "Sistema de gerenciamento de vendas porta a porta",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Service Worker (public/sw.js)
```javascript
const CACHE_NAME = 'crm-vendas-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
```

### 3. Registrar SW (src/main.tsx)
```javascript
// Adicione após render da aplicação
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW falhou: ', registrationError);
      });
  });
}
```

### 4. Adicionar ao HTML (index.html)
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3b82f6">
```

## 🔧 Endpoints REST (Futura Implementação Backend)

### Vendas
```
GET    /api/vendas           # Listar vendas
POST   /api/vendas           # Criar venda
PUT    /api/vendas/:id       # Atualizar venda
DELETE /api/vendas/:id       # Excluir venda
PATCH  /api/vendas/:id/status # Atualizar status
```

### Analytics
```
GET /api/analytics/vendas    # Estatísticas gerais
GET /api/analytics/bairros   # Vendas por bairro
GET /api/analytics/cidades   # Vendas por cidade
```

### Upload
```
POST /api/upload            # Upload de documentos
```

## 📊 Estrutura de Dados

### Venda
```typescript
interface Venda {
  id: string;
  cliente: {
    nome: string;
    telefone: string;
    email?: string;
    cpf: string;
    dataNascimento?: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      localidade: string;
      uf: string;
    };
  };
  documentos?: {
    documentoCliente?: File;
    fachadaCasa?: File;
  };
  status: "gerada" | "em_andamento" | "aprovada" | "perdida";
  dataVenda: string;
  observacoes?: string;
}
```

## 🎨 Sistema de Design

O projeto utiliza um sistema de design centralizado com:

- **Cores**: Azul corporativo, verde para sucesso, cinzas neutros
- **Tokens**: Todas as cores definidas em HSL no `index.css`
- **Componentes**: shadcn/ui customizados
- **Responsividade**: Mobile-first approach
- **Animações**: Transições suaves e hover effects

## 📱 PWA Features

Quando convertido para PWA, o app terá:

- ✅ **Instalável**: Pode ser instalado no dispositivo
- ✅ **Offline**: Funciona sem internet (cache de dados)
- ✅ **Responsivo**: Adaptado para mobile e desktop
- ✅ **Seguro**: HTTPS obrigatório
- ✅ **Performance**: Carregamento rápido

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ para otimizar vendas porta a porta**