# 🔄 Configurar Sincronización Automática de Notion

## ✅ El Servicio Ya Está Listo

El servicio automático ya está implementado en `scripts/notion-sync-service.js` y se ejecuta cada **30 minutos** automáticamente.

## 🚀 Opción 1: Ejecutar Localmente (Desarrollo/Pruebas)

### Ejecutar el Servicio

```bash
npm run sync:notion:service
```

**Esto:**
- ✅ Ejecuta una sincronización inicial después de 5 segundos
- ✅ Programa sincronizaciones automáticas cada 30 minutos
- ✅ Muestra logs en tiempo real
- ✅ Permite detener con `Ctrl+C`

### Detener el Servicio

Presiona `Ctrl+C` en la terminal. El servicio esperará a que termine la sincronización actual antes de cerrar.

## 🖥️ Opción 2: Ejecutar en Servidor (Producción)

### Usando PM2 (Recomendado)

PM2 mantiene el proceso corriendo y lo reinicia automáticamente si falla.

#### 1. Instalar PM2

```bash
npm install -g pm2
```

#### 2. Iniciar el Servicio

```bash
pm2 start scripts/notion-sync-service.js --name "notion-sync"
```

#### 3. Configurar PM2 para Inicio Automático

```bash
# Guardar configuración actual
pm2 save

# Configurar para iniciar al arrancar el sistema
pm2 startup
# Sigue las instrucciones que aparecen
```

#### 4. Comandos Útiles de PM2

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs notion-sync

# Reiniciar
pm2 restart notion-sync

# Detener
pm2 stop notion-sync

# Eliminar
pm2 delete notion-sync

# Monitoreo en tiempo real
pm2 monit
```

### Usando Windows Task Scheduler (Windows)

#### 1. Crear Script de Inicio

Crea un archivo `start-notion-sync.bat`:

```batch
@echo off
cd /d "d:\Agile Dream Team\Antigravity\delivery-dashboard"
node scripts/notion-sync-service.js
pause
```

#### 2. Configurar Task Scheduler

1. Abre **Task Scheduler** (Programador de tareas)
2. Crea una **Basic Task**
3. Nombre: "Notion Sync Service"
4. Trigger: **When the computer starts**
5. Action: **Start a program**
6. Program: `node`
7. Arguments: `scripts/notion-sync-service.js`
8. Start in: `d:\Agile Dream Team\Antigravity\delivery-dashboard`

### Usando systemd (Linux)

Crea `/etc/systemd/system/notion-sync.service`:

```ini
[Unit]
Description=Notion Sync Service
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/ruta/al/proyecto/delivery-dashboard
ExecStart=/usr/bin/node scripts/notion-sync-service.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl daemon-reload
sudo systemctl enable notion-sync
sudo systemctl start notion-sync
sudo systemctl status notion-sync
```

## ⚙️ Opción 3: Cambiar Frecuencia de Sincronización

Edita `scripts/notion-sync-service.js` y cambia la línea 63:

```javascript
// Ejemplos de expresiones cron:
const cronExpression = '*/30 * * * *';  // Cada 30 minutos (actual)
const cronExpression = '*/15 * * * *';  // Cada 15 minutos
const cronExpression = '0 * * * *';     // Cada hora (en el minuto 0)
const cronExpression = '0 */2 * * *';    // Cada 2 horas
const cronExpression = '0 9,17 * * *';  // A las 9 AM y 5 PM
```

**Formato cron:** `minuto hora día mes día-semana`

## 📊 Monitoreo

### Ver Logs en Tiempo Real

```bash
# Si usas PM2
pm2 logs notion-sync

# Si ejecutas directamente
npm run sync:notion:service
```

### Verificar Última Sincronización

El servicio muestra un resumen cada hora con:
- Total de sincronizaciones
- Última sincronización
- Estado actual

### Verificar en Supabase

1. Ve a Supabase Dashboard → Table Editor
2. Selecciona `notion_extracted_metrics`
3. Verifica que los datos se actualicen automáticamente

## 🔧 Configuración de Variables de Entorno

Asegúrate de que tu `.env` tenga:

```bash
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Notion (opcional, si usas proxy personalizado)
VITE_NOTION_PROXY_URL=https://tu-proxy.com
```

**Importante:** En producción, usa variables de entorno del sistema en lugar de `.env`:

```bash
# PM2 con variables de entorno
pm2 start scripts/notion-sync-service.js --name "notion-sync" \
  --env production \
  --update-env
```

## 🐛 Troubleshooting

### El Servicio se Detiene

**Con PM2:**
```bash
pm2 logs notion-sync --lines 50  # Ver últimos 50 logs
pm2 restart notion-sync           # Reiniciar
```

**Verificar errores:**
- Revisa que `SUPABASE_SERVICE_ROLE_KEY` esté configurada
- Revisa que la Edge Function esté desplegada
- Revisa los logs para errores específicos

### Sincronización No Se Ejecuta

1. Verifica que el servicio esté corriendo:
   ```bash
   pm2 status
   ```

2. Verifica los logs:
   ```bash
   pm2 logs notion-sync
   ```

3. Prueba ejecución manual:
   ```bash
   npm run sync:notion
   ```

### Cambios No Se Reflejan

- El servicio se ejecuta cada 30 minutos
- Espera hasta la próxima ejecución programada
- O ejecuta manualmente: `npm run sync:notion`

## 📝 Resumen de Comandos

```bash
# Ejecutar servicio localmente
npm run sync:notion:service

# Ejecutar sincronización manual (una vez)
npm run sync:notion

# Con PM2 (producción)
pm2 start scripts/notion-sync-service.js --name "notion-sync"
pm2 logs notion-sync
pm2 status
pm2 restart notion-sync
pm2 stop notion-sync
```

## ✅ Checklist de Configuración

- [ ] Service role key configurada en `.env`
- [ ] Edge Function desplegada en Supabase
- [ ] Secret `NOTION_API_TOKEN` configurado en Supabase
- [ ] Servicio probado localmente (`npm run sync:notion:service`)
- [ ] PM2 instalado (si usas servidor)
- [ ] Servicio configurado para inicio automático
- [ ] Logs monitoreados para verificar funcionamiento

---

**El servicio automático está listo. Solo necesitas ejecutarlo y configurarlo para que corra continuamente.**
