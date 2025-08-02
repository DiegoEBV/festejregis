@echo off
echo ========================================
echo    FESTEJOS - Configuracion Socket.IO
echo ========================================
echo.

echo [1/4] Copiando package.json para el servidor...
copy socket-package.json package-socket.json

echo [2/4] Instalando dependencias del servidor Socket.IO...
npm install --prefix . express@^4.18.2 socket.io@^4.7.2 cors@^2.8.5

echo [3/4] Verificando instalacion...
if exist node_modules\express (
    echo ✅ Express instalado correctamente
) else (
    echo ❌ Error instalando Express
    pause
    exit /b 1
)

if exist node_modules\socket.io (
    echo ✅ Socket.IO instalado correctamente
) else (
    echo ❌ Error instalando Socket.IO
    pause
    exit /b 1
)

echo.
echo [4/4] Configuracion completada!
echo.
echo Para iniciar el servidor Socket.IO ejecuta:
echo   node socket-server.js
echo.
echo El servidor estara disponible en http://localhost:4000
echo.
pause