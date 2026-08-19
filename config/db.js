// config/db.js
const mysql = require('mysql2/promise');

let pool = null;

const getPool = () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,  // Notez: c'est DB_PASSWORD, pas DB_PASS
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT || '3306'),
            waitForConnections: true,
            connectionLimit: 5,
            connectTimeout: 10000
        });
    }
    return pool;
};

module.exports = { getPool };