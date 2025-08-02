# Configuración Socket.IO - FESTEJOS

## Configuraciones Disponibles

### 🌐 API Remota (Configuración Actual)
- **URL**: `https://fetregapi.onrender.com`
- **Estado**: Configurado en `socket.service.ts`
- **Ventajas**: Sin necesidad de servidor local

### 🏠 Servidor Local (Alternativo)
- **Archivo**: `socket-server.js`
- **Puerto**: 4000
- **Configuración**: Basada en la carpeta `muestra` con mejoras

## Características del Sistema
- ✅ CORS configurado para Angular
- ✅ Soporte para WebSocket y Polling
- ✅ Manejo de roles: caja, moso, cocina
- ✅ Reconexión automática
- ✅ Manejo de errores mejorado

## Archivos del Proyecto
- `socket-server.js` - Servidor Socket.IO local (backup)
- `socket-package.json` - Dependencias del servidor local
- `setup-socket-server.bat` - Script de instalación local
- `start-socket-server.bat` - Script de inicio local

## Configuración Actual en Angular
- **Archivo**: `src/app/services/socket.service.ts`
- **URL actual**: `https://fetregapi.onrender.com`
- **Mejoras**: Lógica de reconexión automática

## Instrucciones de Uso

### 🌐 Usando API Remota (Actual)
La aplicación está configurada para usar `https://fetregapi.onrender.com`
- No requiere configuración adicional
- Funciona directamente al iniciar Angular

### 🏠 Cambiar a Servidor Local

**1. Instalar dependencias locales (solo primera vez):**
```bash
.\setup-socket-server.bat
```

**2. Iniciar servidor local:**
```bash
.\start-socket-server.bat
```

**3. Cambiar configuración en Angular:**
En `src/app/services/socket.service.ts`, cambiar:
```typescript
private serverUrl = 'http://localhost:4000';
```

**4. Verificar estado:**
- **Servidor local**: http://localhost:4000/stats
- **Aplicación**: http://localhost:4201

### 🔄 Cambiar entre Configuraciones

**Para API Remota:**
```typescript
private serverUrl = 'https://fetregapi.onrender.com';
```

**Para Servidor Local:**
```typescript
private serverUrl = 'http://localhost:4000';
```

## Ventajas de Cada Configuración

### API Remota
- ✅ Sin configuración de servidor
- ✅ Acceso desde cualquier lugar
- ✅ Mantenimiento automático

### Servidor Local
- ✅ Sin dependencia de servicios externos
- ✅ Mayor velocidad de conexión
- ✅ Control total sobre la configuración
- ✅ Debugging más fácil

## Roles Soportados
- **Caja**: Recibe pedidos de mozos
- **Moso**: Envía pedidos a caja
- **Cocina**: Recibe notificaciones de pedidos

## Eventos Socket.IO
- `identificarse` - Identificación de usuario
- `nuevoPedido` - Nuevo pedido de moso a caja
- `respuestaCaja` - Respuesta de caja a moso
- `join-room` / `leave-room` - Manejo de salas
- `ping` - Verificación de conexión

---
**Nota**: El servidor debe estar ejecutándose antes de iniciar la aplicación Angular.