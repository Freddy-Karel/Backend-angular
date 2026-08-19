const getJwtSecret = () => process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

const requireJwtSecret = () => {
  const secret = getJwtSecret();

  if (!secret) {
    const error = new Error('JWT secret missing. Set JWT_SECRET in your Vercel backend environment variables.');
    error.status = 500;
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }

  return secret;
};

module.exports = {
  getJwtSecret,
  requireJwtSecret,
};
