const jwt = require('jsonwebtoken');
const { requireJwtSecret } = require('../config/auth.config');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token manquant ou invalide' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, requireJwtSecret());
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token invalide ou expiré' 
    });
  }
};

module.exports = authMiddleware;
