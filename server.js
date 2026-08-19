require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/db.config');
const { requireJwtSecret } = require('./config/auth.config');

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

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    background_color VARCHAR(255) NULL,
    cover_image_url MEDIUMTEXT NULL,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gp_boards_owner_id FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Board_Members (
    board_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member', 'viewer') DEFAULT 'member',
    PRIMARY KEY (board_id, user_id),
    CONSTRAINT fk_gp_board_members_board_id FOREIGN KEY (board_id) REFERENCES Boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_board_members_user_id FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    board_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gp_lists_board_id FOREIGN KEY (board_id) REFERENCES Boards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    position INT NOT NULL,
    list_id INT NOT NULL,
    due_date DATETIME NULL,
    assignee_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gp_cards_list_id FOREIGN KEY (list_id) REFERENCES Lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_cards_assignee_id FOREIGN KEY (assignee_id) REFERENCES Users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Subtasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    card_id INT NOT NULL,
    CONSTRAINT fk_gp_subtasks_card_id FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gp_comments_card_id FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_comments_user_id FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS Card_Labels (
    card_id INT NOT NULL,
    label_id INT NOT NULL,
    PRIMARY KEY (card_id, label_id),
    CONSTRAINT fk_gp_card_labels_card_id FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_card_labels_label_id FOREIGN KEY (label_id) REFERENCES Labels(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const ensureBoardCoverColumn = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const boardColumns = await queryInterface.describeTable('Boards');

  if (!boardColumns.cover_image_url) {
    await queryInterface.addColumn('Boards', 'cover_image_url', {
      type: sequelize.Sequelize.TEXT('medium'),
      allowNull: true,
    });
    console.log('Colonne cover_image_url ajoutee aux boards');
  }
};

const ensureRequiredSchema = async () => {
  for (const statement of schemaStatements) {
    await sequelize.query(statement);
  }

  await ensureBoardCoverColumn();
};

const syncSchema = async () => {
  const shouldSync = process.env.DB_SYNC === 'true' || (!isVercel && !isProduction && process.env.DB_SYNC !== 'false');
  const shouldEnsureSchema = process.env.DB_ENSURE_SCHEMA !== 'false';
  const shouldRunMigrations = shouldSync || process.env.DB_RUN_MIGRATIONS === 'true';

  if (shouldSync) {
    await sequelize.sync({ force: false });
  }

  if (shouldEnsureSchema) {
    await ensureRequiredSchema();
    return;
  }

  if (shouldRunMigrations) {
    await ensureBoardCoverColumn();
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
    const decoded = jwt.verify(token, requireJwtSecret());
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
