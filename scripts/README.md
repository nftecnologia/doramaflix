# DoramaFlix Migration Scripts

Este diretório contém scripts para migração de infraestrutura do DoramaFlix.

## 🚀 Script de Migração: Vercel Blob → DigitalOcean Spaces

Script robusto para migrar todos os arquivos do Vercel Blob Storage para DigitalOcean Spaces, mantendo a estrutura de pastas e atualizando URLs no banco de dados.

### ✨ Características

- **Retry Logic**: Retry automático com backoff exponencial
- **Processamento Paralelo**: Controle de concorrência para downloads/uploads
- **Verificação de Integridade**: Verificação de checksums e tamanhos de arquivo
- **Logging Detalhado**: Logs estruturados com diferentes níveis
- **Progress Tracking**: Barra de progresso com ETA
- **Database Updates**: Atualização automática de URLs no banco de dados
- **Dry Run Mode**: Simulação sem migração real
- **Relatórios**: Relatório detalhado de migração

### 📋 Pré-requisitos

1. **Node.js 18+**
2. **Variáveis de Ambiente** configuradas:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# DigitalOcean Spaces
DO_SPACES_ACCESS_KEY=your_do_access_key
DO_SPACES_SECRET_KEY=your_do_secret_key
DO_SPACES_BUCKET=your_bucket_name
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_CDN_URL=https://your-cdn-domain.com  # Opcional

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Opcional
LOG_LEVEL=info  # debug, info, warn, error
```

### 🛠️ Instalação

```bash
# Navegar para o diretório de scripts
cd /Users/oliveira/Desktop/doramaflix/scripts

# Instalar dependências
npm install
```

### 📖 Uso

#### Migração Básica

```bash
# Migração completa
npm run migrate

# Ou diretamente
node migrate-vercel-to-spaces.js
```

#### Dry Run (Simulação)

```bash
# Simular migração sem transferir arquivos
npm run migrate:dry-run

# Ou
node migrate-vercel-to-spaces.js --dry-run
```

#### Migração por Tipo de Arquivo

```bash
# Migrar apenas vídeos
npm run migrate:videos

# Migrar apenas imagens
npm run migrate:images

# Ou especificar diretamente
node migrate-vercel-to-spaces.js --file-type video
node migrate-vercel-to-spaces.js --file-type image
node migrate-vercel-to-spaces.js --file-type subtitle
```

#### Opções Avançadas

```bash
# Migrar apenas 10 arquivos (para teste)
node migrate-vercel-to-spaces.js --max-files 10

# Pular atualização do banco de dados
node migrate-vercel-to-spaces.js --skip-db-update

# Combinar opções
node migrate-vercel-to-spaces.js --dry-run --max-files 5 --file-type image --log-level debug
```

### 📊 Monitoramento e Logs

#### Logs em Tempo Real

O script exibe logs coloridos no console:

```
2024-01-01T10:00:00.000Z [INFO] 🚀 Starting Vercel Blob → DigitalOcean Spaces Migration
2024-01-01T10:00:01.000Z [INFO] 🔍 Discovering files in Vercel Blob Storage...
2024-01-01T10:00:02.000Z [INFO] ✅ Discovery complete: 150 files (2.5 GB)
2024-01-01T10:00:03.000Z [INFO] 🎯 Starting migration of 150 files...
📦 Migrating ████████████████████████████████████████ 150/150 | 100% | ETA: 0s
2024-01-01T10:05:00.000Z [INFO] 🎉 Migration completed successfully!
```

#### Arquivos de Log

Os logs são salvos em:
- `logs/migration-YYYY-MM-DD.log` - Log detalhado em JSON
- `logs/migration-report-YYYY-MM-DD.json` - Relatório final de migração

#### Estrutura do Relatório

```json
{
  "summary": {
    "totalFiles": 150,
    "successfulMigrations": 148,
    "failedMigrations": 2,
    "successRate": "98.67%",
    "duration": "5m 30s",
    "totalDataTransferred": "2.5 GB",
    "averageSpeed": "7.8 MB/s"
  },
  "errors": [
    {
      "file": "videos/course-1/episode-5/video.mp4",
      "error": "Network timeout",
      "timestamp": "2024-01-01T10:03:15.000Z"
    }
  ],
  "logStats": {
    "info": 150,
    "warn": 5,
    "error": 2,
    "debug": 300,
    "totalLogs": 457,
    "elapsedTime": 330000
  }
}
```

### 🔧 Configuração Avançada

#### Ajuste de Performance

Edite as constantes no início do script para ajustar performance:

```javascript
const CONFIG = {
  // Concorrência (ajuste baseado na largura de banda)
  DOWNLOAD_CONCURRENCY: 5,    // Downloads simultâneos
  UPLOAD_CONCURRENCY: 3,      // Uploads simultâneos
  DB_UPDATE_CONCURRENCY: 10,  // Updates de DB simultâneos
  
  // Retry logic
  MAX_RETRIES: 3,              // Tentativas máximas
  RETRY_DELAY_BASE: 1000,      // Delay base (ms)
  RETRY_BACKOFF_MULTIPLIER: 2, // Multiplicador de backoff
  
  // Verificação
  VERIFY_CHECKSUMS: true,      // Verificar checksums
  VERIFY_FILE_SIZE: true,      // Verificar tamanhos
};
```

### 🗃️ Estrutura de Banco de Dados

O script atualiza URLs nas seguintes tabelas:

#### Vídeos
- `episodes.video_url`
- `courses.trailer_url`

#### Imagens
- `courses.thumbnail_url`
- `courses.banner_url`
- `episodes.thumbnail_url`
- `seasons.thumbnail_url`
- `users.avatar_url`
- `categories.icon_url`

#### Arquivos Gerais
- `file_uploads.file_path`

### 🚨 Tratamento de Erros

#### Erros Comuns e Soluções

1. **"Missing required environment variables"**
   - Verifique se todas as variáveis de ambiente estão configuradas

2. **"Network timeout"**
   - Verifique conexão com internet
   - Reduza DOWNLOAD_CONCURRENCY/UPLOAD_CONCURRENCY

3. **"Upload verification failed"**
   - Pode indicar problema na transferência
   - Arquivo será marcado como falha e pode ser repetido

4. **"Database connection failed"**
   - Verifique DATABASE_URL
   - Confirme que o banco está acessível

#### Recovery de Falhas

Para reprocessar apenas arquivos que falharam:

1. Examine o arquivo de log de erros
2. Execute novamente com filtros específicos
3. Use `--dry-run` primeiro para validar

### 🔒 Segurança

- Todas as credenciais são carregadas via variáveis de ambiente
- URLs antigas não são excluídas automaticamente (para rollback)
- Verificação de integridade garante dados íntegros
- Logs não expõem informações sensíveis

### 🎯 Estratégia de Migração Recomendada

1. **Teste com Dry Run**:
   ```bash
   npm run migrate:dry-run
   ```

2. **Migração de Teste**:
   ```bash
   node migrate-vercel-to-spaces.js --max-files 10
   ```

3. **Migração por Tipo** (recomendado):
   ```bash
   # Primeiro imagens (menores, mais rápido)
   npm run migrate:images
   
   # Depois vídeos (maiores, mais demorado)
   npm run migrate:videos
   
   # Por último legendas e outros
   node migrate-vercel-to-spaces.js --file-type subtitle
   ```

4. **Migração Completa**:
   ```bash
   npm run migrate
   ```

### 📈 Performance Esperada

- **Imagens**: ~50-100 arquivos/minuto
- **Vídeos**: ~5-15 arquivos/minuto (dependendo do tamanho)
- **Throughput**: ~5-20 MB/s (dependendo da conexão)

### ⚠️ Considerações Importantes

1. **Backup**: Faça backup do banco de dados antes da migração
2. **Espaço em Disco**: DigitalOcean Spaces deve ter espaço suficiente
3. **Bandwidth**: Considere custos de transferência
4. **Downtime**: Planeje janela de manutenção se necessário
5. **Rollback**: Mantenha URLs antigas para possível rollback

### 🆘 Suporte

Em caso de problemas:

1. Verifique logs detalhados em `logs/`
2. Execute com `--log-level debug` para mais informações
3. Use `--dry-run` para simular sem riscos
4. Contate a equipe de desenvolvimento com logs específicos

---

**Desenvolvido pela equipe DoramaFlix** 🎬