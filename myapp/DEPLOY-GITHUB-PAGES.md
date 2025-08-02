# Despliegue en GitHub Pages

## Pasos para desplegar la aplicación en GitHub Pages

### 1. Preparar el repositorio en GitHub

1. Crea un repositorio en GitHub (si no lo tienes ya)
2. Sube tu código al repositorio:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### 2. Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. Desplázate hacia abajo hasta **Pages**
4. En **Source**, selecciona **Deploy from a branch**
5. Selecciona la rama **gh-pages** (se creará automáticamente)
6. Haz clic en **Save**

### 3. Desplegar la aplicación

Ejecuta el siguiente comando para construir y desplegar:

```bash
npm.cmd run deploy
```

Este comando:
- Construye la aplicación para producción
- Configura el base-href correcto para GitHub Pages
- Despliega automáticamente a la rama gh-pages

### 4. Acceder a tu aplicación

Una vez desplegada, tu aplicación estará disponible en:
```
https://TU_USUARIO.github.io/myapp/
```

### 5. Actualizaciones futuras

Para actualizar tu aplicación desplegada, simplemente ejecuta:

```bash
npm.cmd run deploy
```

## Notas importantes

- **Servidor Socket.IO**: GitHub Pages solo sirve contenido estático. El servidor Socket.IO (socket-server.js) debe estar desplegado por separado en un servicio como Heroku, Railway, Render, o Vercel.

- **URL del Socket**: La aplicación está configurada para usar `https://fetregapi.onrender.com` en producción. Si cambias el servidor, actualiza `src/environments/environment.prod.ts`.

- **Base href**: El script de deploy está configurado para `/myapp/`. Si tu repositorio tiene un nombre diferente, actualiza el script en `package.json`.

## Comandos disponibles

- `npm.cmd run build:prod` - Construye para producción
- `npm.cmd run deploy` - Construye y despliega a GitHub Pages

## Solución de problemas

1. **Error 404**: Verifica que el base-href coincida con el nombre de tu repositorio
2. **Socket no conecta**: Verifica que el servidor Socket.IO esté funcionando en la URL configurada
3. **Permisos**: Asegúrate de tener permisos de escritura en el repositorio