/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'almanhaj-radio',
      audience: 'broadcast-gateway'
    });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'FORBIDDEN'
    });
  }
}

function verifyWebSocketClient(info, port) {
  try {
    const url = new URL(info.req.url, `ws://localhost:${port}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('❌ Connection rejected: No token provided');
      return false;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'almanhaj-radio',
      audience: 'broadcast-gateway'
    });
    
    // Store user info for later use
    info.req.user = decoded;
    
    console.log(`✅ Token verified for user: ${decoded.email} (${decoded.role})`);
    return true;
  } catch (error) {
    console.log('❌ Connection rejected: Invalid token', error.message);
    return false;
  }
}

module.exports = {
  authenticateToken,
  verifyWebSocketClient
};