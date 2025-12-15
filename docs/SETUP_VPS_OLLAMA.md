# 🖥️ Setup de VPS Privado con Ollama para Supabase

## 🎯 Objetivo

Configurar un VPS (servidor privado) con Ollama que sea accesible desde Supabase Edge Functions pero completamente privado.

## 🏗️ Arquitectura

```
GitHub Pages (Frontend)
    ↓ HTTPS
Supabase Edge Function (Backend)
    ↓ HTTPS + Auth
VPS Privado con Ollama (IA)
    ↓
Análisis de Notion
```

## 📋 Opciones de VPS

### Opción 1: DigitalOcean Droplet (Recomendado) ⭐

**Ventajas:**
- ✅ Muy fácil de configurar
- ✅ Precio razonable ($6-12/mes)
- ✅ Buena documentación
- ✅ Puede usar GPU (más caro)

**Setup:**

1. **Crear Droplet:**
   - Tamaño: 4GB RAM mínimo (8GB recomendado para llama2:13b)
   - OS: Ubuntu 22.04
   - Región: Cercana a Supabase

2. **Instalar Ollama:**
```bash
# SSH al servidor
ssh root@tu-vps-ip

# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar modelo
ollama pull llama2:13b
# o más ligero:
ollama pull mistral:7b

# Verificar
ollama list
ollama run llama2:13b "Test"
```

3. **Configurar Nginx con Autenticación:**
```bash
# Instalar nginx
apt update && apt install -y nginx apache2-utils

# Crear usuario para autenticación
htpasswd -c /etc/nginx/.htpasswd ollama-user
# (te pedirá contraseña)

# Configurar nginx
nano /etc/nginx/sites-available/ollama
```

**Configuración de Nginx:**
```nginx
server {
    listen 80;
    server_name tu-vps-ip;

    # Redirigir a HTTPS (si tienes SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-vps-ip;

    # SSL (usar Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio/privkey.pem;

    # Autenticación básica
    auth_basic "Ollama API";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Permitir solo desde Supabase (opcional pero recomendado)
    # allow 52.20.0.0/14;  # IPs de Supabase (verificar)
    # deny all;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. **Configurar Firewall:**
```bash
# Permitir solo HTTPS
ufw allow 443/tcp
ufw allow 22/tcp  # SSH
ufw enable

# Verificar
ufw status
```

5. **Obtener SSL con Let's Encrypt:**
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

### Opción 2: AWS EC2

**Ventajas:**
- ✅ Más control
- ✅ Puede usar GPU instances
- ✅ Integración con otros servicios AWS

**Setup similar, pero:**
- Configurar Security Groups para permitir solo Supabase
- Usar Elastic IP para IP fija
- Considerar usar PrivateLink para máxima seguridad

### Opción 3: Servidor Local con Tunnel

**Si tienes servidor local:**
```bash
# Usar ngrok o cloudflare tunnel
ngrok http 11434
# o
cloudflared tunnel --url http://localhost:11434
```

## 🔐 Seguridad

### Checklist de Seguridad

1. **Autenticación:**
   - ✅ Nginx con auth_basic
   - ✅ API key en Supabase Edge Function
   - ✅ Firewall configurado

2. **SSL/TLS:**
   - ✅ HTTPS obligatorio
   - ✅ Certificado válido (Let's Encrypt)

3. **Red:**
   - ✅ Firewall solo permite puertos necesarios
   - ✅ Considerar whitelist de IPs de Supabase
   - ✅ No exponer Ollama directamente

4. **Monitoreo:**
   - ✅ Logs de acceso
   - ✅ Alertas de uso anormal
   - ✅ Backup de configuraciones

## 📊 Costos Estimados

| Proveedor | Configuración | Costo/mes | Notas |
|-----------|--------------|-----------|-------|
| DigitalOcean | 4GB RAM | $6 | Suficiente para mistral:7b |
| DigitalOcean | 8GB RAM | $12 | Recomendado para llama2:13b |
| AWS EC2 | t3.medium | ~$30 | Más flexible |
| Servidor Local | - | $0 | Requiere tunnel |

## 🚀 Deployment de Edge Function

```bash
# En tu proyecto
cd supabase/functions/analyze-notion

# Deploy a Supabase
supabase functions deploy analyze-notion

# O desde Supabase Dashboard:
# Edge Functions > Create Function > Paste code
```

**Configurar Secrets:**
```bash
# Desde CLI
supabase secrets set OLLAMA_PRIVATE_URL=https://tu-vps.com:443
supabase secrets set OLLAMA_API_KEY=tu-api-key

# O desde Dashboard:
# Edge Functions > analyze-notion > Settings > Secrets
```

## 🧪 Testing

```bash
# Desde tu máquina local (con acceso al VPS)
curl -u ollama-user:password https://tu-vps.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2:13b",
    "prompt": "Test",
    "stream": false
  }'

# Desde Supabase Edge Function (usando secrets)
# El código de la Edge Function ya está configurado
```

## 📝 Próximos Pasos

1. **Elegir proveedor de VPS** (recomendado: DigitalOcean)
2. **Crear y configurar servidor**
3. **Instalar y configurar Ollama**
4. **Configurar nginx con autenticación**
5. **Obtener SSL**
6. **Configurar secrets en Supabase**
7. **Deploy Edge Function**
8. **Probar end-to-end**
