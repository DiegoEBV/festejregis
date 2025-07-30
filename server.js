const express = require('express');
const http = require('http');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

// Guarda sockets por rol
let mozos = [];
let cajas = [];

io.on('connection', socket => {
  // Identifica el rol al conectar
  socket.on('identificarse', rol => {
    socket.rol = rol;
    if (rol === 'moso') mozos.push(socket);
    if (rol === 'caja') cajas.push(socket);
  });

  // El mozo envía un pedido -> la caja lo recibe
  socket.on('nuevoPedido', pedido => {
    cajas.forEach(caja => caja.emit('pedidoRecibido', pedido));
  });

  // La caja responde al mozo (pago/anulación)
  socket.on('respuestaCaja', datos => {
    mozos.forEach(mozo => mozo.emit('respuestaDeCaja', datos));
  });

  socket.on('disconnect', () => {
    mozos = mozos.filter(s => s !== socket);
    cajas = cajas.filter(s => s !== socket);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Socket.IO backend en puerto ${PORT}`));
