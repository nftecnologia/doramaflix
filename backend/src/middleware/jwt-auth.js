/**
 * JWT Authentication Middleware - Agent 4
 * Real JWT implementation for DoramaFlix
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'doramaflix_super_secure_jwt_secret_key_32_chars_minimum_security';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'doramaflix_super_secure_refresh_secret_key_32_chars_minimum';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Generate JWT Token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Generate Refresh Token
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

// Verify JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Verify Refresh Token
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

// Hash Password
async function hashPassword(password) {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
}

// Compare Password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// JWT Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Role-based Authorization Middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Admin Only Middleware
const requireAdmin = requireRole(['admin']);

// Manager or Admin Middleware  
const requireManager = requireRole(['admin', 'manager']);

// Auth Service for Login/Register
const AuthService = {
  async login(email, password) {
    try {
      // Mock user for now - replace with real DB lookup
      const mockUsers = [
        {
          id: '1',
          email: 'admin@doramaflix.com',
          password: await hashPassword('admin123'),
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        },
        {
          id: '2', 
          email: 'manager@doramaflix.com',
          password: await hashPassword('manager123'),
          firstName: 'Manager',
          lastName: 'User',
          role: 'manager'
        },
        {
          id: '3',
          email: 'student@doramaflix.com', 
          password: await hashPassword('student123'),
          firstName: 'Student',
          lastName: 'User',
          role: 'student'
        }
      ];

      const user = mockUsers.find(u => u.email === email);
      
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await comparePassword(password, user.password);
      
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Generate tokens
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateToken(payload);
      const refreshToken = generateRefreshToken(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          accessToken,
          refreshToken
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async register(userData) {
    try {
      const { email, password, firstName, lastName } = userData;
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Generate new user ID (mock)
      const newUser = {
        id: Date.now().toString(),
        email,
        firstName,
        lastName,
        role: 'student',
        password: hashedPassword
      };

      return {
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async refreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const payload = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      const newAccessToken = generateToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  authenticateJWT,
  requireRole,
  requireAdmin,
  requireManager,
  AuthService
};