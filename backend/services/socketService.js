const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initializeSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = null;
        return next();
      }
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch {
      return next(new Error('Invalid or expired session.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('public:marketplace');
    if (socket.user?.id) {
      socket.join('authenticated');
      socket.join(`user:${socket.user.id}`);
    }
    if (socket.user?.role) socket.join(`role:${socket.user.role}`);
  });

  return io;
}

function emitBidUpdate(payload) {
  if (io) io.to('authenticated').emit('bids:changed', payload);
}

function emitToUser(userId, event, payload = {}) {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

function emitToRole(role, event, payload = {}) {
  if (io && role) io.to(`role:${role}`).emit(event, payload);
}

function emitMarketplaceUpdate(payload = {}) {
  if (io) io.to('public:marketplace').emit('marketplace:changed', payload);
}

module.exports = { initializeSocket, emitBidUpdate, emitToUser, emitToRole, emitMarketplaceUpdate };
