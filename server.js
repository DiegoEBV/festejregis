const express = require('express');
const http = require('http');
const cors = require('cors');
const app = express();
app.use(cors());
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

server.listen(4000, () => console.log('Socket.IO backend en puerto 4000'));
