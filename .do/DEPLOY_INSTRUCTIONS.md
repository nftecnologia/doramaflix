# 🚀 DoramaFlix - Deploy Instructions

## 📋 Pré-requisitos

✅ **PostgreSQL Database**: DigitalOcean Managed Database criado  
✅ **Redis Database**: Upstash Redis configurado  
✅ **Repositório**: nftecnologia/doramaflix no GitHub  
✅ **DigitalOcean Spaces**: Bucket para storage (opcional)  

## 🔧 Configuração de Environment Variables

### **No DigitalOcean App Platform:**

1. **Acesse**: [DigitalOcean Console](https://cloud.digitalocean.com/apps)
2. **Create App** → Import from GitHub
3. **Selecione**: nftecnologia/doramaflix
4. **Configure Environment Variables**:

### **Variables Obrigatórias:**

```bash
# Database (usar credenciais fornecidas pelo cliente)
DATABASE_URL=postgresql://[user]:[password]@[host]:25060/defaultdb?sslmode=require
DB_PASSWORD=[sua_senha_postgresql]

# Redis (usar credenciais fornecidas pelo cliente)  
REDIS_URL=rediss://default:[token]@[host]:6379
UPSTASH_REDIS_REST_TOKEN=[seu_token_upstash]

# JWT & Security (gerar valores únicos)
JWT_SECRET=[gerar_chave_aleatoria_32_chars]
JWT_REFRESH_SECRET=[gerar_chave_aleatoria_32_chars]
ENCRYPTION_KEY=[gerar_chave_aleatoria_32_chars]

# DigitalOcean Spaces (após criar bucket)
DO_SPACES_ACCESS_KEY=[sua_access_key]
DO_SPACES_SECRET_KEY=[sua_secret_key]
DO_SPACES_BUCKET=doramaflix-storage
```

### **Variables Recomendadas:**
```bash
NODE_ENV=production
CORS_ORIGIN=https://doramaflix.ondigitalocean.app
NEXT_PUBLIC_API_URL=https://doramaflix.ondigitalocean.app/api/v1
```

## 🎯 Deploy Steps

### **Método 1: Via Interface Web**
1. Use template do arquivo `.do/app.yaml`
2. Configure environment variables manualmente
3. Deploy automático

### **Método 2: Via CLI**
```bash
# Instalar DigitalOcean CLI
brew install doctl
doctl auth init

# Editar .do/app.yaml com credenciais reais
# Deploy
doctl apps create .do/app.yaml
```

## 🔐 Segurança

- ✅ Marque todas credenciais como **SECRET**
- ✅ Use SSL/TLS para todas conexões
- ✅ Configure CORS adequadamente
- ✅ Gere JWT secrets únicos para produção

## 📞 Suporte

**Repository**: https://github.com/nftecnologia/doramaflix  
**Documentation**: Ver DIGITALOCEAN_MIGRATION.md  
**Health Check**: https://[your-app].ondigitalocean.app/health  

## ✅ Checklist de Deploy

- [ ] PostgreSQL connection string configurada
- [ ] Redis connection string configurada  
- [ ] JWT secrets gerados
- [ ] DigitalOcean Spaces bucket criado
- [ ] Environment variables configuradas
- [ ] App Platform deploy realizado
- [ ] Health checks passando
- [ ] Frontend acessível
- [ ] API funcionando