const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Get today's revenue
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const revenueFile = `data/revenue/${today}.json`;
    
    try {
      const revenueData = await fs.readFile(revenueFile, 'utf8');
      const revenue = JSON.parse(revenueData);
      res.json(revenue);
    } catch (error) {
      // If revenue file doesn't exist, return empty data
      res.json({
        date: today,
        bills: [],
        total: 0
      });
    }
  } catch (error) {
    console.error('Error fetching today\'s revenue:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s revenue' });
  }
});

// Get revenue for a specific date
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const revenueFile = `data/revenue/${date}.json`;
    
    try {
      const revenueData = await fs.readFile(revenueFile, 'utf8');
      const revenue = JSON.parse(revenueData);
      res.json(revenue);
    } catch (error) {
      // If revenue file doesn't exist, return empty data
      res.json({
        date: date,
        bills: [],
        total: 0
      });
    }
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

module.exports = router;