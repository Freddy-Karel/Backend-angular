require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/db.config');

require('./models/index');

const app = express();
const server = http.createServer(app);
const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_LIMIT || '8mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.set('io', io);

let databaseReadyPromise;

const syncSchema = async () => {
  const shouldSync = process.env.DB_SYNC === 'true' || (!isVercel && !isProduction && process.env.DB_SYNC !== 'false');
  const shouldRunMigrations = shouldSync || process.env.DB_RUN_MIGRATIONS === 'true';

  if (shouldSync) {
    await sequelize.sync({ force: false });
  }

  if (!shouldRunMigrations) {
    return;
  }

  const queryInterface = sequelize.getQueryInterface();

  try {
    const boardColumns = await queryInterface.describeTable('Boards');

    if (!boardColumns.cover_image_url) {
      await queryInterface.addColumn('Boards', 'cover_image_url', {
        type: sequelize.Sequelize.TEXT('medium'),
        allowNull: true,
      });
      console.log('Colonne cover_image_url ajoutee aux boards');
    }
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE' || error.original?.errno === 1146) {
      console.warn('Table Boards absente: lance database/init.sql sur la base distante avant d utiliser les boards.');
      return;
    }

    throw error;
  }
};

const initializeDatabase = async () => {
  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      await sequelize.authenticate();
      console.log('Connexion a la base de donnees MySQL reussie');
      await syncSchema();
      console.log('Modeles synchronises avec la base de donnees');
    })().catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  return databaseReadyPromise;
};

app.get(['/favicon.ico', '/favicon.png'], (req, res) => res.status(204).end());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Gestion Projet operationnelle',
    environment: isVercel ? 'vercel' : process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/db-test', async (req, res) => {
  try {
    await initializeDatabase();
    const [rows] = await sequelize.query('SELECT 1 AS test');
    res.json({ success: true, message: 'Database connected', data: rows });
  } catch (error) {
    console.error('DB test error:', error);
    res.status(500).json({ success: false, message: 'Database connection failed', error: error.message });
  }
});

app.use('/api', async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Base de donnees indisponible ou variables Vercel manquantes',
      error: error.message,
    });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/boards', require('./routes/board.routes'));
app.use('/api/boards', require('./routes/list.routes'));
app.use('/api/lists', require('./routes/list.routes'));
app.use('/api/cards', require('./routes/card.routes'));
app.use('/api/subtasks', require('./routes/subtask.routes'));
app.use('/api/comments', require('./routes/comment.routes'));

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
  });
});

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

io.on('connection', (socket) => {
  console.log(`Utilisateur connecte: ${socket.userId}`);

  socket.on('join-board', (boardId) => {
    socket.join(`board-${boardId}`);
    console.log(`Utilisateur ${socket.userId} rejoint le board ${boardId}`);
  });

  socket.on('leave-board', (boardId) => {
    socket.leave(`board-${boardId}`);
    console.log(`Utilisateur ${socket.userId} quitte le board ${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur deconnecte: ${socket.userId}`);
  });
});

if (!isVercel) {
  const PORT = process.env.PORT || 5000;
  initializeDatabase()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Serveur Express en ecoute sur le port ${PORT}`);
        console.log('WebSocket Socket.IO active');
      });
    })
    .catch((error) => {
      console.error('Erreur lors du demarrage du serveur:', error);
      process.exit(1);
    });
}

module.exports = app;
