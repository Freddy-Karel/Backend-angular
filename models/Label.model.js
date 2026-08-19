const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Label = sequelize.define('Label', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
  },
}, {
  tableName: 'Labels',
  timestamps: false,
});

module.exports = Label;
