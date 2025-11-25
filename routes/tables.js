const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Get table status
router.get('/status', async (req, res) => {
  try {
    const { table } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    const tableFile = `data/tables/table-${table}.json`;
    
    try {
      const tableData = await fs.readFile(tableFile, 'utf8');
      const tableStatus = JSON.parse(tableData);
      res.json(tableStatus);
    } catch (error) {
      // If table file doesn't exist, return empty status
      res.json({
        table: parseInt(table),
        status: "empty",
        items: [],
        total: 0,
        active: false
      });
    }
  } catch (error) {
    console.error('Error fetching table status:', error);
    res.status(500).json({ error: 'Failed to fetch table status' });
  }
});

// Set table status
router.post('/set-status', async (req, res) => {
  try {
    const { table, status } = req.body;
    
    if (!table || !status) {
      return res.status(400).json({ error: 'Table number and status are required' });
    }
    
    const tableFile = `data/tables/table-${table}.json`;
    let tableData;
    
    try {
      const fileContent = await fs.readFile(tableFile, 'utf8');
      tableData = JSON.parse(fileContent);
    } catch (error) {
      // Create new table data if it doesn't exist
      tableData = {
        table: parseInt(table),
        status: "empty",
        items: [],
        total: 0,
        active: false
      };
    }
    
    tableData.status = status;
    
    // Update active status based on the new status
    if (status === "empty" || status === "closed") {
      tableData.active = false;
    } else {
      tableData.active = true;
    }
    
    await fs.writeFile(tableFile, JSON.stringify(tableData, null, 2));
    
    res.json({ success: true, table: tableData });
  } catch (error) {
    console.error('Error setting table status:', error);
    res.status(500).json({ error: 'Failed to set table status' });
  }
});

// Get all tables status
router.get('/all', async (req, res) => {
  try {
    const tablesDir = 'data/tables';
    let tables = [];
    
    try {
      const files = await fs.readdir(tablesDir);
      
      for (const file of files) {
        if (file.startsWith('table-') && file.endsWith('.json')) {
          const tableData = await fs.readFile(path.join(tablesDir, file), 'utf8');
          const table = JSON.parse(tableData);
          tables.push(table);
        }
      }
    } catch (error) {
      // If tables directory doesn't exist or is empty, return empty array
    }
    
    // Add empty tables (1-20)
    for (let i = 1; i <= 20; i++) {
      if (!tables.some(table => table.table === i)) {
        tables.push({
          table: i,
          status: "empty",
          items: [],
          total: 0,
          active: false
        });
      }
    }
    
    // Sort tables by number
    tables.sort((a, b) => a.table - b.table);
    
    res.json(tables);
  } catch (error) {
    console.error('Error fetching all tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

module.exports = router;