const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();

// Configuración de CORS
app.use(cors({
  origin: ["http://localhost:4200", "http://localhost:4201"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.static(__dirname));
app.use(express.json());

// Ruta básica
app.get('/', (req, res) => {
  res.json({ message: 'Socket.IO Server para FESTEJOS funcionando correctamente' });
});

const server = http.createServer(app);

// Configuración mejorada de Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:4200", "http://localhost:4201"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Almacenar conexiones por rol
let usuarios = {
  caja: [],
  moso: [],
  cocina: []
};

// Estadísticas del servidor
let estadisticas = {
  conexionesActivas: 0,
  pedidosEnviados: 0,
  ultimaActividad: new Date()
};

io.on('connection', (socket) => {
  console.log(`Nueva conexión: ${socket.id}`);
  estadisticas.conexionesActivas++;
  estadisticas.ultimaActividad = new Date();

  // Enviar estado del servidor al conectar
  socket.emit('server-status', {
    conectado: true,
    servidor: 'FESTEJOS Socket Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });

  // Identificación del usuario
  socket.on('identificarse', (userData) => {
    try {
      socket.userData = userData;
      const rol = userData.rol || userData.userRole || 'caja';
      socket.rol = rol;
      
      // Agregar a la lista correspondiente
      if (usuarios[rol]) {
        usuarios[rol].push(socket);
        console.log(`Usuario ${userData.nombre || userData.userName || 'Anónimo'} conectado como ${rol}`);
      }
      
      // Confirmar identificación
      socket.emit('identificado', {
        rol: rol,
        mensaje: `Conectado como ${rol}`,
        timestamp: new Date().toISOString()
      });
      
      // Notificar a otros usuarios del mismo rol
      socket.to(rol).emit('usuario-conectado', {
        usuario: userData.nombre || userData.userName,
        rol: rol
      });
      
    } catch (error) {
      console.error('Error en identificación:', error);
      socket.emit('error', { mensaje: 'Error en identificación' });
    }
  });

  // Manejo de pedidos
  socket.on('nuevoPedido', (pedido) => {
    try {
      console.log('Nuevo pedido recibido:', pedido);
      estadisticas.pedidosEnviados++;
      estadisticas.ultimaActividad = new Date();
      
      // Enviar a todas las cajas
      usuarios.caja.forEach(cajaSocket => {
        if (cajaSocket.id !== socket.id) {
          cajaSocket.emit('pedidoRecibido', {
            ...pedido,
            timestamp: new Date().toISOString(),
            origen: socket.userData?.nombre || 'Mozo'
          });
        }
      });
      
      // Enviar a cocina
      usuarios.cocina.forEach(cocinaSocket => {
        cocinaSocket.emit('pedidoRecibido', {
          ...pedido,
          timestamp: new Date().toISOString(),
          origen: socket.userData?.nombre || 'Mozo'
        });
      });
      
      // Confirmar recepción
      socket.emit('pedido-confirmado', {
        id: pedido.id,
        mensaje: 'Pedido enviado correctamente',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error procesando pedido:', error);
      socket.emit('error', { mensaje: 'Error procesando pedido' });
    }
  });

  // Respuestas de caja
  socket.on('respuestaCaja', (datos) => {
    try {
      console.log('Respuesta de caja:', datos);
      estadisticas.ultimaActividad = new Date();
      
      // Enviar a todos los mozos
      usuarios.moso.forEach(mozoSocket => {
        mozoSocket.emit('respuestaDeCaja', {
          ...datos,
          timestamp: new Date().toISOString(),
          origen: socket.userData?.nombre || 'Caja'
        });
      });
      
    } catch (error) {
      console.error('Error procesando respuesta de caja:', error);
      socket.emit('error', { mensaje: 'Error procesando respuesta' });
    }
  });

  // Unirse a salas
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} se unió a la sala ${room}`);
    socket.emit('joined-room', { room, mensaje: `Te uniste a la sala ${room}` });
  });

  // Salir de salas
  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} salió de la sala ${room}`);
    socket.emit('left-room', { room, mensaje: `Saliste de la sala ${room}` });
  });

  // Ping/Pong para mantener conexión
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Solicitar estadísticas
  socket.on('get-stats', () => {
    socket.emit('server-stats', {
      ...estadisticas,
      usuariosConectados: {
        caja: usuarios.caja.length,
        moso: usuarios.moso.length,
        cocina: usuarios.cocina.length
      }
    });
  });

  // Manejo de desconexión
  socket.on('disconnect', (reason) => {
    console.log(`Desconexión: ${socket.id}, razón: ${reason}`);
    estadisticas.conexionesActivas--;
    estadisticas.ultimaActividad = new Date();
    
    // Remover de todas las listas
    Object.keys(usuarios).forEach(rol => {
      usuarios[rol] = usuarios[rol].filter(s => s.id !== socket.id);
    });
    
    // Notificar desconexión si tenía rol
    if (socket.rol && socket.userData) {
      usuarios[socket.rol].forEach(userSocket => {
        userSocket.emit('usuario-desconectado', {
          usuario: socket.userData.nombre || socket.userData.userName,
          rol: socket.rol
        });
      });
    }
  });

  // Manejo de errores
  socket.on('error', (error) => {
    console.error('Error en socket:', error);
  });
});

// Endpoint para estadísticas
app.get('/stats', (req, res) => {
  res.json({
    ...estadisticas,
    usuariosConectados: {
      caja: usuarios.caja.length,
      moso: usuarios.moso.length,
      cocina: usuarios.cocina.length
    },
    servidor: 'FESTEJOS Socket Server',
    version: '1.0.0'
  });
});

// Manejo de errores del servidor
server.on('error', (error) => {
  console.error('Error del servidor:', error);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO Server para FESTEJOS ejecutándose en puerto ${PORT}`);
  console.log(`📊 Estadísticas disponibles en http://localhost:${PORT}/stats`);
  console.log(`🔗 Configurado para Angular en puertos 4200 y 4201`);
});

// Limpieza periódica de conexiones muertas
setInterval(() => {
  Object.keys(usuarios).forEach(rol => {
    usuarios[rol] = usuarios[rol].filter(socket => socket.connected);
  });
}, 30000);