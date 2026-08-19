require('dotenv').config();
const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');

const databaseUrl = process.env.DATABASE_URL;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD || process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST;
const dbPort = Number(process.env.DB_PORT || 3306);
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const commonOptions = {
  dialect: 'mysql',
  dialectModule: mysql2,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: Number(process.env.DB_POOL_MAX || 5),
    min: 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
    idle: Number(process.env.DB_POOL_IDLE || 10000),
  },
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, commonOptions)
  : new Sequelize(dbName || '', dbUser || '', dbPassword, {
      ...commonOptions,
      host: dbHost,
      port: dbPort,
    });

module.exports = sequelize;
