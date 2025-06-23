# 🎬 DoramaFlix - Netflix-like Streaming Platform

## 🚀 **PROJETO COMPLETO GERADO COM ULTRATHINK MODE**

Uma plataforma de streaming estilo Netflix para dramas asiáticos (K-dramas, J-dramas, C-dramas) construída com tecnologias modernas e arquitetura escalável.

---

## 📋 **STATUS DO PROJETO - 100% COMPLETO**

✅ **ARQUITETURA** - Clean Architecture + Domain Driven Design  
✅ **DATABASE** - PostgreSQL com schema completo e seeds  
✅ **BACKEND** - Node.js + Express + TypeScript + JWT  
✅ **FRONTEND** - React + Next.js + Tailwind CSS  
✅ **DEVOPS** - Docker + docker-compose + CI/CD  
✅ **AUTENTICAÇÃO** - JWT com refresh token  
✅ **PAGAMENTOS** - Stripe + MercadoPago integrado  
✅ **UPLOAD** - Cloudflare R2 / AWS S3  
✅ **CACHE** - Redis + RabbitMQ  
✅ **TESTES** - Jest + Playwright E2E  
✅ **DOCUMENTAÇÃO** - API docs + README profissional  

---

## 🏗️ **ARQUITETURA DO SISTEMA**

```
doramaflix/
├── 🗄️ database/          # PostgreSQL schema, migrations, seeds
├── 🏗️ backend/           # Node.js API (Clean Architecture)
│   ├── src/
│   │   ├── application/   # Controllers, Services, Middlewares
│   │   ├── domain/        # Entities, Repositories
│   │   ├── infrastructure/# Database, Cache, Storage
│   │   ├── presentation/  # Routes, Validators
│   │   └── shared/        # Config, Utils, Constants
├── 🎨 frontend/          # React + Next.js
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # UI Components
│   │   ├── contexts/     # React Contexts
│   │   ├── hooks/        # Custom Hooks
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript Types
├── 🐳 docker/           # Docker configurations
├── 📚 docs/             # Documentation
└── 🧪 scripts/          # Build and deploy scripts
```

---

## ⚙️ **TECNOLOGIAS UTILIZADAS**

### **Backend**
- **Node.js 20+** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Linguagem tipada
- **Prisma** - ORM e database client
- **PostgreSQL** - Banco de dados principal
- **Redis** - Cache e sessões
- **RabbitMQ** - Message queue
- **JWT** - Autenticação
- **bcrypt** - Hash de senhas
- **Zod** - Validação de schemas
- **Winston** - Logging
- **Jest** - Testes unitários

### **Frontend**
- **React 18** - UI Library
- **Next.js 14** - Framework React
- **TypeScript** - Linguagem tipada
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Server state
- **React Hook Form** - Formulários
- **Framer Motion** - Animações
- **React Player** - Video player

### **Infraestrutura**
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Railway** - Deploy e hosting
- **Cloudflare R2** - Storage de arquivos
- **Stripe** - Pagamentos
- **GitHub Actions** - CI/CD

---

## 🚀 **COMO EXECUTAR**

### **1. Clonagem e Setup**
```bash
# Clone o repositório
git clone <repository-url>
cd doramaflix

# Copie as variáveis de ambiente
cp .env.example .env
```

### **2. Configuração do Ambiente**
Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/doramaflix
DB_PASSWORD=sua_senha_postgres

# JWT
JWT_SECRET=sua_chave_jwt_super_secreta_32_caracteres
JWT_REFRESH_SECRET=sua_chave_refresh_super_secreta

# Storage (opcional)
CLOUDFLARE_R2_ENDPOINT=https://sua-conta.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=sua_access_key
CLOUDFLARE_R2_SECRET_KEY=sua_secret_key

# Pagamentos (opcional)
STRIPE_SECRET_KEY=sk_test_sua_stripe_secret_key
MERCADOPAGO_ACCESS_TOKEN=seu_mercadopago_token
```

### **3. Execução com Docker**
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up

# Produção
docker-compose up
```

### **4. Execução Manual**

#### **Backend**
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

#### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

#### **Database**
```bash
# Inicializar database
cd database/scripts
./init_database.sh
```

---

## 🌐 **ENDPOINTS DA API**

### **Autenticação**
- `POST /api/v1/auth/register` - Cadastro
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Perfil do usuário
- `POST /api/v1/auth/logout` - Logout

### **Cursos/Séries**
- `GET /api/v1/courses` - Listar cursos
- `GET /api/v1/courses/:id` - Detalhes do curso
- `POST /api/v1/courses` - Criar curso (admin)
- `PUT /api/v1/courses/:id` - Atualizar curso (admin)

### **Episódios**
- `GET /api/v1/episodes/:id` - Detalhes do episódio
- `POST /api/v1/episodes/:id/progress` - Salvar progresso

### **Categorias**
- `GET /api/v1/categories` - Listar categorias

### **Assinaturas**
- `GET /api/v1/subscriptions/plans` - Planos disponíveis
- `POST /api/v1/subscriptions/create` - Criar assinatura

---

## 💳 **PLANOS DE ASSINATURA**

| Plano | Preço | Recursos |
|-------|-------|----------|
| **Gratuito** | R$ 0/mês | Conteúdo limitado, anúncios |
| **Premium Mensal** | R$ 29,90/mês | Todo conteúdo, sem anúncios, HD/4K |
| **Premium Anual** | R$ 299,90/ano | Todos os recursos + desconto |

---

## 👥 **USUÁRIOS DE TESTE**

```
🔧 Admin:
Email: admin@doramaflix.com
Senha: admin123

👨‍💼 Manager:
Email: manager@doramaflix.com  
Senha: manager123

👤 Estudante:
Email: student1@example.com
Senha: student123
```

---

## 🔒 **SEGURANÇA E BOAS PRÁTICAS**

- ✅ Autenticação JWT com refresh token
- ✅ Hash de senhas com bcrypt (12 rounds)
- ✅ Rate limiting em endpoints sensíveis
- ✅ Validação rigorosa de inputs
- ✅ CORS configurado adequadamente
- ✅ Headers de segurança (Helmet)
- ✅ Logs estruturados e auditoria
- ✅ Separação de ambientes (dev/prod)

---

## 📊 **MONITORAMENTO**

### **Logs**
- Logs estruturados com Winston
- Rotação diária de arquivos
- Níveis: error, warn, info, debug

### **Health Checks**
- `GET /health` - Status da API
- `GET /api/v1/health` - Status detalhado

### **Métricas** (opcional)
- Prometheus + Grafana disponível
- `docker-compose --profile monitoring up`

---

## 🧪 **TESTES**

### **Backend**
```bash
cd backend
npm test              # Testes unitários
npm run test:coverage # Cobertura
```

### **Frontend**  
```bash
cd frontend
npm test              # Testes unitários
npm run test:e2e      # Testes E2E
```

---

## 🚀 **DEPLOY PARA PRODUÇÃO**

### **Railway (Recomendado)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway link
railway up
```

### **Variáveis de Ambiente de Produção**
```env
NODE_ENV=production
DATABASE_URL=sua_database_url_postgresql
REDIS_URL=sua_redis_url
JWT_SECRET=jwt_super_secreto_producao
# ... outras configurações
```

---

## 📁 **ESTRUTURA DE BANCO DE DADOS**

### **Entidades Principais**
- **users** - Usuários e administradores
- **courses** - Cursos/séries/filmes
- **categories** - Categorias de conteúdo
- **seasons** - Temporadas (para séries)
- **episodes** - Episódios/aulas
- **subscriptions** - Assinaturas dos usuários
- **payments** - Histórico de pagamentos
- **user_progress** - Progresso de visualização
- **user_reviews** - Avaliações dos usuários

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### **Para Usuários**
- ✅ Cadastro e login
- ✅ Navegação por categorias
- ✅ Player de vídeo com controles
- ✅ Progresso salvo automaticamente
- ✅ Lista de favoritos
- ✅ Continuar assistindo
- ✅ Histórico de visualização
- ✅ Sistema de assinaturas
- ✅ Avaliações e reviews

### **Para Administradores**
- ✅ Dashboard administrativo
- ✅ Gerenciamento de conteúdo
- ✅ Upload de vídeos
- ✅ Métricas e relatórios
- ✅ Gestão de usuários
- ✅ Configuração de planos

---

## 🤝 **CONTRIBUINDO**

1. Faça fork do projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📞 **SUPORTE**

- **Email:** suporte@doramaflix.com
- **Documentação:** `/docs`
- **API Docs:** `/api/v1/docs`
- **Issues:** GitHub Issues

---

## 📄 **LICENÇA**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🎉 **CRÉDITOS**

Projeto gerado com **UltraThink Mode + Hardness + Subtasks** utilizando Claude Code para máxima eficiência e qualidade de código.

**Tecnologias de ponta | Arquitetura escalável | Pronto para produção**

---

### 🚀 **Pronto para começar? Execute `docker-compose up` e acesse http://localhost:3001**