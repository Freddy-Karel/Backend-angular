require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/db.config');

// Import des modèles et relations
require('./models/index');

const User = require('./models/User.model');
const Board = require('./models/Board.model');
const BoardMember = require('./models/BoardMember.model');
const List = require('./models/List.model');
const Card = require('./models/Card.model');
const Subtask = require('./models/Subtask.model');
const Comment = require('./models/Comment.model');
const Label = require('./models/Label.model');
const CardLabel = require('./models/CardLabel.model');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Stocker io dans app pour l'utiliser dans les contrôleurs
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/boards', require('./routes/board.routes'));
app.use('/api/boards', require('./routes/list.routes'));
app.use('/api/lists', require('./routes/list.routes'));
app.use('/api/cards', require('./routes/card.routes'));
app.use('/api/subtasks', require('./routes/subtask.routes'));
app.use('/api/comments', require('./routes/comment.routes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'API Gestion Projet - Opérationnelle' });
});

// Middleware d'erreur global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
  });
});

// Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log(`🟢 Utilisateur connecté: ${socket.userId}`);

  socket.on('join-board', (boardId) => {
    socket.join(`board-${boardId}`);
    console.log(`📋 Utilisateur ${socket.userId} rejoint le board ${boardId}`);
  });

  socket.on('leave-board', (boardId) => {
    socket.leave(`board-${boardId}`);
    console.log(`📋 Utilisateur ${socket.userId} quitte le board ${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Utilisateur déconnecté: ${socket.userId}`);
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données MySQL réussie');

    await sequelize.sync({ force: false });
    const queryInterface = sequelize.getQueryInterface();
    const boardColumns = await queryInterface.describeTable('Boards');
    if (!boardColumns.cover_image_url) {
      await queryInterface.addColumn('Boards', 'cover_image_url', {
        type: sequelize.Sequelize.TEXT('medium'),
        allowNull: true,
      });
      console.log('Colonne cover_image_url ajoutee aux boards');
    }
    console.log('✅ Modèles synchronisés avec la base de données');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Serveur Express en écoute sur le port ${PORT}`);
      console.log(`✅ WebSocket Socket.IO activé`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();
