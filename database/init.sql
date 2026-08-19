-- Création de la base de données
CREATE DATABASE IF NOT EXISTS gestion_projet_db;
USE gestion_projet_db;

-- Table Utilisateurs
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Boards (Tableaux de projet)
CREATE TABLE IF NOT EXISTS Boards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  background_color VARCHAR(255) NULL,
  cover_image_url MEDIUMTEXT NULL,
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table Board_Members (Liaison Utilisateurs <-> Boards)
CREATE TABLE IF NOT EXISTS Board_Members (
  board_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'member', 'viewer') DEFAULT 'member',
  PRIMARY KEY (board_id, user_id),
  FOREIGN KEY (board_id) REFERENCES Boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table Lists (Colonnes du Kanban)
CREATE TABLE IF NOT EXISTS Lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  board_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES Boards(id) ON DELETE CASCADE
);

-- Table Cards (Cartes du Kanban)
CREATE TABLE IF NOT EXISTS Cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  position INT NOT NULL,
  list_id INT NOT NULL,
  due_date DATETIME NULL,
  assignee_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES Lists(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Table Subtasks (Sous-tâches)
CREATE TABLE IF NOT EXISTS Subtasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  card_id INT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE
);

-- Table Comments (Commentaires)
CREATE TABLE IF NOT EXISTS Comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  card_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table Labels (Étiquettes)
CREATE TABLE IF NOT EXISTS Labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL
);

-- Table Card_Labels (Liaison Cartes <-> Labels)
CREATE TABLE IF NOT EXISTS Card_Labels (
  card_id INT NOT NULL,
  label_id INT NOT NULL,
  PRIMARY KEY (card_id, label_id),
  FOREIGN KEY (card_id) REFERENCES Cards(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES Labels(id) ON DELETE CASCADE
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_lists_board_id ON Lists(board_id);
CREATE INDEX idx_cards_list_id ON Cards(list_id);
CREATE INDEX idx_cards_assignee_id ON Cards(assignee_id);
CREATE INDEX idx_comments_card_id ON Comments(card_id);
CREATE INDEX idx_comments_user_id ON Comments(user_id);
CREATE INDEX idx_subtasks_card_id ON Subtasks(card_id);
CREATE INDEX idx_board_members_board_id ON Board_Members(board_id);
CREATE INDEX idx_board_members_user_id ON Board_Members(user_id);
CREATE INDEX idx_cards_position ON Cards(position);
CREATE INDEX idx_lists_position ON Lists(position);
