const User = require('./User.model');
const Board = require('./Board.model');
const BoardMember = require('./BoardMember.model');
const List = require('./List.model');
const Card = require('./Card.model');
const Subtask = require('./Subtask.model');
const Comment = require('./Comment.model');
const Label = require('./Label.model');
const CardLabel = require('./CardLabel.model');

// Relations User - Board
User.hasMany(Board, { foreignKey: 'owner_id', as: 'ownedBoards' });
Board.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

User.belongsToMany(Board, { through: BoardMember, foreignKey: 'user_id', as: 'boards' });
Board.belongsToMany(User, { through: BoardMember, foreignKey: 'board_id', as: 'members' });
BoardMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(BoardMember, { foreignKey: 'user_id', as: 'boardMemberships' });

// Relations Board - List
Board.hasMany(List, { foreignKey: 'board_id', as: 'lists' });
List.belongsTo(Board, { foreignKey: 'board_id', as: 'board' });

// Relations List - Card
List.hasMany(Card, { foreignKey: 'list_id', as: 'cards' });
Card.belongsTo(List, { foreignKey: 'list_id', as: 'list' });

// Relations Card - User (assignee)
User.hasMany(Card, { foreignKey: 'assignee_id', as: 'assignedCards' });
Card.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });

// Relations Card - Subtask
Card.hasMany(Subtask, { foreignKey: 'card_id', as: 'subtasks' });
Subtask.belongsTo(Card, { foreignKey: 'card_id', as: 'card' });

// Relations Card - Comment
Card.hasMany(Comment, { foreignKey: 'card_id', as: 'comments' });
Comment.belongsTo(Card, { foreignKey: 'card_id', as: 'card' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Relations Card - Label (many-to-many)
Card.belongsToMany(Label, { through: CardLabel, foreignKey: 'card_id', as: 'labels' });
Label.belongsToMany(Card, { through: CardLabel, foreignKey: 'label_id', as: 'cards' });

module.exports = {
  User,
  Board,
  BoardMember,
  List,
  Card,
  Subtask,
  Comment,
  Label,
  CardLabel
};
