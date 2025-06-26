# 📚 Documentação Técnica - Migração Vercel Blob → DigitalOcean Spaces

## 🏗️ Arquitetura da Solução

### Visão Geral

A solução de migração consiste em três scripts principais que trabalham em conjunto para garantir uma migração segura e confiável:

1. **pre-migration-backup.js** - Backup completo antes da migração
2. **migrate-vercel-to-spaces.js** - Script principal de migração
3. **post-migration-verify.js** - Verificação pós-migração

### Fluxo de Dados

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel Blob   │───▶│  Migration Script │───▶│ DigitalOcean    │
│   Storage       │    │                  │    │ Spaces          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   Database       │
                       └──────────────────┘
```

## 🔧 Implementação Técnica

### 1. Sistema de Retry com Backoff Exponencial

```javascript
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2
};

async function retryWithBackoff(fn, maxRetries = CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = CONFIG.RETRY_DELAY_BASE * 
        Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
      await sleep(delay);
    }
  }
}
```

### 2. Controle de Concorrência

```javascript
import pLimit from 'p-limit';

const downloadLimit = pLimit(5);  // 5 downloads simultâneos
const uploadLimit = pLimit(3);    // 3 uploads simultâneos
const dbLimit = pLimit(10);       // 10 queries simultâneas

// Uso com Promise.all para paralelização controlada
const promises = files.map(file => 
  downloadLimit(() => processFile(file))
);
await Promise.all(promises);
```

### 3. Verificação de Integridade

#### Verificação de Checksum
```javascript
async function calculateChecksum(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function verifyUpload(pathname, originalBuffer) {
  const headResult = await s3Client.send(new HeadObjectCommand({
    Bucket: bucket,
    Key: pathname
  }));
  
  const originalChecksum = await calculateChecksum(originalBuffer);
  const uploadedChecksum = headResult.Metadata?.checksum;
  
  return originalChecksum === uploadedChecksum;
}
```

#### Verificação de Tamanho
```javascript
if (buffer.length !== blob.size) {
  throw new Error(`Size mismatch: expected ${blob.size}, got ${buffer.length}`);
}
```

### 4. Estrutura de Logging

```javascript
class Logger {
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      elapsedMs: Date.now() - this.startTime
    };
    
    // Console output com cores
    console.log(`${timestamp} [${level}] ${message}`);
    
    // Output para arquivo em JSON
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }
}
```

## 🗃️ Schema de Banco de Dados

### Tabelas Afetadas pela Migração

#### 1. Episodes (Vídeos)
```sql
UPDATE episodes 
SET video_url = $1 
WHERE video_url = $2;

UPDATE episodes 
SET thumbnail_url = $1 
WHERE thumbnail_url = $2;
```

#### 2. Courses (Cursos/Séries)
```sql
UPDATE courses 
SET thumbnail_url = $1 
WHERE thumbnail_url = $2;

UPDATE courses 
SET banner_url = $1 
WHERE banner_url = $2;

UPDATE courses 
SET trailer_url = $1 
WHERE trailer_url = $2;
```

#### 3. Users (Usuários)
```sql
UPDATE users 
SET avatar_url = $1 
WHERE avatar_url = $2;
```

#### 4. File Uploads (Registro de Uploads)
```sql
UPDATE file_uploads 
SET file_path = $1 
WHERE file_path = $2;
```

### Estrutura de URLs

#### Antes (Vercel Blob)
```
https://vercel.blob.store/videos/course-123/episode-456/video.mp4
https://vercel.blob.store/images/thumbnail/course-123/thumb.jpg
```

#### Depois (DigitalOcean Spaces)
```
https://doramaflix-storage.nyc3.digitaloceanspaces.com/videos/course-123/episode-456/video.mp4
https://cdn.doramaflix.com/images/thumbnail/course-123/thumb.jpg
```

## 🚀 Performance e Otimização

### Métricas de Performance

#### Throughput Esperado
- **Imagens (< 1MB)**: ~50-100 arquivos/minuto
- **Vídeos (100MB-1GB)**: ~5-15 arquivos/minuto
- **Throughput total**: ~5-20 MB/s

#### Fatores que Afetam Performance
1. **Largura de banda** - Download/Upload speed
2. **Latência** - Ping entre Vercel e DigitalOcean
3. **Tamanho dos arquivos** - Arquivos maiores = menos throughput
4. **Concorrência** - Balance entre velocidade e recursos

### Configuração de Concorrência

```javascript
// Configuração conservadora (conexão limitada)
DOWNLOAD_CONCURRENCY: 3
UPLOAD_CONCURRENCY: 2

// Configuração agressiva (alta largura de banda)
DOWNLOAD_CONCURRENCY: 10
UPLOAD_CONCURRENCY: 5

// Configuração para produção (balanceada)
DOWNLOAD_CONCURRENCY: 5
UPLOAD_CONCURRENCY: 3
```

### Otimizações Implementadas

1. **Streaming de arquivos** - Evita carregar arquivos inteiros em memória
2. **Compressão de logs** - Logs são comprimidos automaticamente
3. **Batch processing** - Atualizações de banco em lotes
4. **Connection pooling** - Reutilização de conexões de banco
5. **Progress tracking** - Feedback em tempo real

## 🔐 Segurança

### Proteção de Credenciais

#### Variáveis de Ambiente
```bash
# Nunca hardcode credenciais no código
DO_SPACES_ACCESS_KEY=your_access_key
DO_SPACES_SECRET_KEY=your_secret_key
BLOB_READ_WRITE_TOKEN=your_blob_token
```

#### Validação de Configuração
```javascript
function validateConfig() {
  const required = [
    'BLOB_READ_WRITE_TOKEN',
    'DO_SPACES_ACCESS_KEY', 
    'DO_SPACES_SECRET_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing: ${missing.join(', ')}`);
  }
}
```

### Controle de Acesso

#### DigitalOcean Spaces
- ACL definida como `public-read` para arquivos
- Bucket com permissões controladas
- CDN opcional para melhor performance

#### Database
- Connection pooling com limites
- Prepared statements para prevenir SQL injection
- Timeouts configurados

## 📊 Monitoramento e Observabilidade

### Métricas Coletadas

#### 1. Métricas de Migração
```json
{
  "totalFiles": 1500,
  "successfulMigrations": 1498,
  "failedMigrations": 2,
  "successRate": "99.87%",
  "totalDataTransferred": "15.2 GB",
  "averageSpeed": "8.5 MB/s",
  "duration": "2h 15m 30s"
}
```

#### 2. Métricas de Performance
```json
{
  "averageAccessTime": 245,
  "medianAccessTime": 180,
  "minAccessTime": 45,
  "maxAccessTime": 2800,
  "fastResponses": 1450,
  "slowResponses": 48
}
```

#### 3. Métricas de Erro
```json
{
  "networkTimeouts": 2,
  "authenticationErrors": 0,
  "storageErrors": 1,
  "databaseErrors": 0,
  "checksumMismatches": 0
}
```

### Logs Estruturados

#### Formato de Log
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "level": "info",
  "message": "File migrated successfully",
  "metadata": {
    "file": "videos/course-123/episode-1/video.mp4",
    "size": 104857600,
    "duration": 1250,
    "checksum": "abc123def456",
    "newUrl": "https://spaces.example.com/..."
  },
  "elapsedMs": 125000
}
```

### Alertas e Notificações

#### Configuração de Alertas
```javascript
// Taxa de erro alta
if (failureRate > 5%) {
  sendAlert('High failure rate detected');
}

// Performance degradada
if (averageSpeed < 1MB/s) {
  sendAlert('Migration speed below threshold');
}

// Espaço em disco baixo
if (diskUsage > 90%) {
  sendAlert('Low disk space warning');
}
```

## 🔄 Processo de Rollback

### Cenários de Rollback

1. **Alta taxa de falhas** (>10% de arquivos)
2. **Problemas de performance** críticos
3. **Corrupção de dados** detectada
4. **Problemas de aplicação** em produção

### Procedimento de Rollback

#### 1. Restaurar Database
```bash
# Descomprimir backup
gunzip doramaflix-pre-migration-2024-01-01-database.sql.gz

# Restaurar database
psql $DATABASE_URL < doramaflix-pre-migration-2024-01-01-database.sql
```

#### 2. Reverter Configuração
```javascript
// Alterar storage provider de volta para Vercel Blob
STORAGE_PROVIDER=vercel-blob

// Redeployar aplicação
```

#### 3. Verificar Funcionalidade
```bash
# Executar testes de verificação
npm run verify:rollback
```

### Automação de Rollback

```javascript
class RollbackManager {
  async executeRollback(backupFile) {
    try {
      await this.stopApplication();
      await this.restoreDatabase(backupFile);
      await this.updateConfiguration();
      await this.startApplication();
      await this.verifyRollback();
    } catch (error) {
      await this.escalateToOncall(error);
    }
  }
}
```

## 🧪 Testes e Validação

### Testes Unitários

```javascript
// Teste de retry logic
describe('RetryWithBackoff', () => {
  it('should retry failed operations', async () => {
    let attempts = 0;
    const mockFn = jest.fn(() => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'success';
    });
    
    const result = await retryWithBackoff(mockFn, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

### Testes de Integração

```javascript
// Teste de migração end-to-end
describe('Migration Integration', () => {
  it('should migrate files successfully', async () => {
    const testFile = createTestFile();
    const migration = new FileMigration();
    
    const result = await migration.migrateFile(testFile);
    
    expect(result.success).toBe(true);
    expect(result.newUrl).toContain('digitaloceanspaces.com');
    
    // Verificar se arquivo existe no destino
    const exists = await migration.verifyUpload(testFile.pathname);
    expect(exists).toBe(true);
  });
});
```

### Testes de Carga

```bash
# Simular migração com 1000 arquivos de teste
node test-migration-load.js --files 1000 --concurrency 10

# Verificar performance com arquivos grandes
node test-large-files.js --size 1GB --count 10
```

## 📋 Troubleshooting

### Problemas Comuns

#### 1. Timeout Errors
```
Error: Request timeout after 30000ms
```

**Solução:**
- Aumentar timeout: `--timeout 60000`
- Reduzir concorrência: `DOWNLOAD_CONCURRENCY: 3`
- Verificar conexão de rede

#### 2. Authentication Errors
```
Error: Access denied to DigitalOcean Spaces
```

**Solução:**
- Verificar `DO_SPACES_ACCESS_KEY` e `DO_SPACES_SECRET_KEY`
- Confirmar permissões do IAM user
- Testar credenciais manualmente

#### 3. Database Connection Errors
```
Error: connection timeout
```

**Solução:**
- Verificar `DATABASE_URL`
- Confirmar firewall rules
- Testar conexão manual: `psql $DATABASE_URL`

#### 4. Memory Issues
```
Error: JavaScript heap out of memory
```

**Solução:**
- Aumentar heap size: `--max-old-space-size=4096`
- Reduzir concorrência
- Processar em batches menores

### Logs de Debug

```bash
# Ativar logs detalhados
node migrate-vercel-to-spaces.js --log-level debug

# Analisar logs específicos
grep "ERROR" logs/migration-2024-01-01.log | jq '.'

# Monitorar progresso em tempo real
tail -f logs/migration-2024-01-01.log | jq -r '.message'
```

### Comandos de Diagnóstico

```bash
# Verificar conectividade
curl -I https://nyc3.digitaloceanspaces.com

# Testar credenciais
aws s3 ls s3://your-bucket --endpoint-url=https://nyc3.digitaloceanspaces.com

# Verificar database
psql $DATABASE_URL -c "SELECT version();"

# Monitorar recursos do sistema
top -p $(pgrep node)
```

## 📈 Métricas de Sucesso

### KPIs da Migração

1. **Taxa de Sucesso**: >99%
2. **Downtime**: <30 minutos
3. **Velocidade**: >5 MB/s average
4. **Integridade**: 100% dos arquivos verificados
5. **Performance**: <500ms tempo de acesso médio

### Critérios de Aceitação

- [ ] Todos os arquivos migrados com sucesso
- [ ] URLs no banco de dados atualizadas
- [ ] Aplicação funcionando normalmente
- [ ] Performance igual ou melhor que antes
- [ ] Backup completo criado e verificado
- [ ] Plano de rollback testado e documentado

---

**Desenvolvido pela equipe DoramaFlix** 🎬
**Versão**: 1.0.0
**Data**: Janeiro 2024