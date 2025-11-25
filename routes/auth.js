const express = require('express');
const fs = require('fs').promises;
const crypto = require('crypto');

module.exports = (adminSessions) => {
  const router = express.Router();

  // Admin login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const adminData = await fs.readFile('data/admin.json', 'utf8');
      const admin = JSON.parse(adminData);
      
      if (username === admin.username && password === admin.password) {
        // Create session token
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.add(token);
        
        res.json({ success: true, token });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Check auth status
  router.get('/check', (req, res) => {
    const token = req.headers.authorization;
    if (token && adminSessions.has(token)) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    const token = req.headers.authorization;
    if (token) {
      adminSessions.delete(token);
    }
    res.json({ success: true });
  });

  return router;
};