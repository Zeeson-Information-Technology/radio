/**
 * JWT Authentication Middleware
 * 
 * SECURITY: Token is now verified via 'authenticate' message in WebSocket
 * instead of URL query string to prevent:
 * - Token logging in server access logs
 * - Token stored in browser history
 * - Token in referrer headers
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

/**
 * Verify JWT token - shared function for both HTTP and WebSocket
 */
function verifyJWT(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, config.JWT_SECRET, {
    issuer: 'almanhaj-radio',
    audience: 'broadcast-gateway'
  });
}

/**
 * WebSocket connection handler - allows unauthenticated initial connection
 * Authentication happens via 'authenticate' message
 */
function verifyWebSocketClient(info, port) {
  try {
    // Accept connection without token verification
    // Token will be verified when 'authenticate' message is received
    console.log('✅ WebSocket connection accepted, awaiting authenticate message');
    return true;
  } catch (error) {
    console.log('❌ Connection rejected:', error.message);
    return false;
  }
}

module.exports = {
  authenticateToken,
  verifyJWT,
  verifyWebSocketClient
};