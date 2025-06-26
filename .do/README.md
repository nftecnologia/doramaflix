# DoramaFlix - DigitalOcean App Platform Configuration

Este diretório contém a configuração do DigitalOcean App Platform para o projeto DoramaFlix.

## Arquivos

- `app.yaml` - Configuração principal do App Platform
- `README.md` - Este arquivo com instruções

## Pré-requisitos

Antes de fazer o deploy, você precisa configurar as seguintes variáveis de ambiente e serviços:

### 1. Repositório GitHub
- Certifique-se de que o código está em um repositório GitHub
- Atualize as referências `your-username/doramaflix` no `app.yaml` com o seu repositório real

### 2. Variáveis de Ambiente Obrigatórias

#### Autenticação e Segurança
```bash
NEXTAUTH_SECRET=              # Chave secreta para NextAuth.js
JWT_SECRET=                   # Chave secreta para JWT
JWT_REFRESH_SECRET=           # Chave secreta para refresh tokens
ENCRYPTION_KEY=               # Chave para criptografia
SESSION_SECRET=               # Chave secreta para sessões
API_KEY=                      # Chave da API interna
WEBHOOK_SECRET=               # Chave secreta para webhooks
```

#### Email (SMTP)
```bash
SMTP_HOST=                    # Host do servidor SMTP
SMTP_USER=                    # Usuário SMTP
SMTP_PASSWORD=                # Senha SMTP
```

#### DigitalOcean Spaces (Storage)
```bash
DO_SPACES_KEY=                # Access Key do Spaces
DO_SPACES_SECRET=             # Secret Key do Spaces
DO_SPACES_BUCKET=             # Nome do bucket (ex: doramaflix-storage)
```

#### Sentry (Monitoramento de Erros)
```bash
NEXT_PUBLIC_SENTRY_DSN=       # DSN do Sentry para frontend
SENTRY_DSN=                   # DSN do Sentry para backend
```

#### Stripe (Pagamentos - se aplicável)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Chave pública do Stripe
STRIPE_SECRET_KEY=                   # Chave secreta do Stripe
STRIPE_WEBHOOK_SECRET=               # Secret do webhook do Stripe
```

#### APIs Externas
```bash
TMDB_API_KEY=                 # API key do The Movie Database
YOUTUBE_API_KEY=              # API key do YouTube
```

#### Autenticação Social
```bash
GOOGLE_CLIENT_ID=             # Client ID do Google OAuth
GOOGLE_CLIENT_SECRET=         # Client Secret do Google OAuth
FACEBOOK_CLIENT_ID=           # Client ID do Facebook OAuth
FACEBOOK_CLIENT_SECRET=       # Client Secret do Facebook OAuth
```

#### Redis (Cache)
```bash
REDIS_URL=                    # URL de conexão do Redis
QUEUE_REDIS_URL=              # URL do Redis para filas
```

#### Admin
```bash
ADMIN_PASSWORD=               # Senha do usuário administrador
```

### 3. Serviços Externos Necessários

#### DigitalOcean Spaces
1. Crie um Space no DigitalOcean
2. Configure as keys de acesso
3. Configure CORS se necessário

#### Redis
1. Configure um cluster Redis (pode ser DigitalOcean Managed Redis)
2. Obtenha a URL de conexão

#### Sentry (Opcional mas recomendado)
1. Crie uma conta no Sentry
2. Configure projetos para frontend e backend
3. Obtenha as DSN keys

### 4. Domínio
- Atualize a seção `domains` no `app.yaml` com seu domínio real
- Configure os DNS records para apontar para o App Platform

## Deploy

### Via DigitalOcean Control Panel
1. Acesse o DigitalOcean Control Panel
2. Vá para "Apps"
3. Clique em "Create App"
4. Selecione "Import from existing repo"
5. Escolha seu repositório GitHub
6. Na seção "Advanced", importe o arquivo `app.yaml`

### Via doctl CLI
```bash
# Instale o doctl se não tiver
# https://docs.digitalocean.com/reference/doctl/how-to/install/

# Autentique
doctl auth init

# Faça o deploy
doctl apps create --spec .do/app.yaml
```

## Configurações Pós-Deploy

### 1. Configurar DNS
```bash
# Adicione registros CNAME ou A records
# Exemplo para Cloudflare, Route53, etc.
CNAME www.doramaflix.com -> your-app.ondigitalocean.app
CNAME doramaflix.com -> your-app.ondigitalocean.app
```

### 2. Configurar SSL/TLS
- O App Platform configura SSL automaticamente
- Certifique-se de que `minimum_tls_version` está configurado

### 3. Monitoramento
- Configure alertas no DigitalOcean
- Configure dashboards no Sentry
- Configure logs centralizados se necessário

### 4. Backup
- Configure backup automático do banco PostgreSQL
- Configure backup dos arquivos no Spaces

## Estrutura de Custos Estimados

### App Platform
- Frontend: ~$12/mês (1 vCPU, 1GB RAM)
- Backend: ~$12/mês (1 vCPU, 1GB RAM) 
- Worker: ~$24/mês (1 vCPU, 2GB RAM)
- Database: ~$15/mês (PostgreSQL básico)

### Serviços Adicionais
- Spaces: ~$5/mês (250GB)
- Redis: ~$15/mês (básico)
- CDN: ~$1-5/mês (dependendo do tráfego)

**Total estimado: ~$84/mês**

## Otimizações

### Performance
- Configure CDN para assets estáticos
- Use Redis para cache
- Otimize imagens e vídeos
- Configure compressão gzip

### Segurança
- Use HTTPS everywhere
- Configure CORS adequadamente
- Use rate limiting
- Configure firewalls

### Monitoramento
- Configure health checks
- Use Sentry para error tracking
- Configure logs estruturados
- Use métricas customizadas

## Troubleshooting

### Deploy Falha
1. Verifique logs no DigitalOcean console
2. Verifique se todas as env vars estão configuradas
3. Verifique se as dependências estão corretas

### App não Responde
1. Verifique health checks
2. Verifique logs da aplicação
3. Verifique conectividade com banco e Redis

### Performance Lenta
1. Verifique métricas de CPU/RAM
2. Verifique queries do banco
3. Verifique cache hit rate
4. Considere scaling horizontal

## Suporte

Para suporte técnico:
- DigitalOcean Support: https://www.digitalocean.com/support/
- Documentação: https://docs.digitalocean.com/products/app-platform/
- Community: https://www.digitalocean.com/community/