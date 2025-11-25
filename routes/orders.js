const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Get order for a table
router.get('/', async (req, res) => {
  try {
    const { table } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    const tableFile = `data/tables/table-${table}.json`;
    
    try {
      const tableData = await fs.readFile(tableFile, 'utf8');
      const tableOrder = JSON.parse(tableData);
      res.json(tableOrder);
    } catch (error) {
      // If table file doesn't exist, return empty order
      const emptyOrder = {
        table: parseInt(table),
        status: "empty",
        items: [],
        total: 0,
        active: false
      };
      res.json(emptyOrder);
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place or update order
router.post('/', async (req, res) => {
  try {
    const { table, items } = req.body;
    
    if (!table || !items) {
      return res.status(400).json({ error: 'Table number and items are required' });
    }
    
    const tableFile = `data/tables/table-${table}.json`;
    let tableOrder;
    
    try {
      const tableData = await fs.readFile(tableFile, 'utf8');
      tableOrder = JSON.parse(tableData);
    } catch (error) {
      // Create new table order if it doesn't exist
      tableOrder = {
        table: parseInt(table),
        status: "ordering",
        items: [],
        total: 0,
        active: true
      };
    }
    
    // Read menu to get current prices
    const menuData = await fs.readFile('data/menu.json', 'utf8');
    const menu = JSON.parse(menuData);
    
    // Add new items to the order
    for (const newItem of items) {
      const menuItem = menu.items.find(item => item.id === newItem.id);
      if (menuItem && menuItem.available) {
        const existingItemIndex = tableOrder.items.findIndex(item => 
          item.id === newItem.id && item.status === 'ordered'
        );
        
        if (existingItemIndex !== -1) {
          // Update existing item quantity
          tableOrder.items[existingItemIndex].quantity += newItem.quantity;
        } else {
          // Add new item
          tableOrder.items.push({
            id: newItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: newItem.quantity,
            status: 'ordered'
          });
        }
      }
    }
    
    // Calculate total
    tableOrder.total = tableOrder.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Update status if needed
    if (tableOrder.status === "empty") {
      tableOrder.status = "ordering";
      tableOrder.active = true;
    }
    
    await fs.writeFile(tableFile, JSON.stringify(tableOrder, null, 2));
    
    res.json({ success: true, order: tableOrder });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

module.exports = router;