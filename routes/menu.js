const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Get menu
router.get('/', async (req, res) => {
  try {
    console.log('Fetching menu data...');
    const menuData = await fs.readFile('data/menu.json', 'utf8');
    const menu = JSON.parse(menuData);
    console.log('Menu items found:', menu.items.length);
    res.json(menu);
  } catch (error) {
    console.error('Error reading menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Add new menu item
router.post('/add', async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    
    const menuData = await fs.readFile('data/menu.json', 'utf8');
    const menu = JSON.parse(menuData);
    
    const newId = menu.items.length > 0 ? Math.max(...menu.items.map(item => item.id)) + 1 : 1;
    
    const newItem = {
      id: newId,
      name,
      price: parseFloat(price),
      category,
      description: description || '',
      available: true
    };
    
    menu.items.push(newItem);
    await fs.writeFile('data/menu.json', JSON.stringify(menu, null, 2));
    
    res.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Edit menu item
router.post('/edit', async (req, res) => {
  try {
    const { id, name, price, category, available, description } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const menuData = await fs.readFile('data/menu.json', 'utf8');
    const menu = JSON.parse(menuData);
    
    const itemIndex = menu.items.findIndex(item => item.id === parseInt(id));
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    if (name) menu.items[itemIndex].name = name;
    if (price) menu.items[itemIndex].price = parseFloat(price);
    if (category) menu.items[itemIndex].category = category;
    if (description !== undefined) menu.items[itemIndex].description = description;
    if (available !== undefined) menu.items[itemIndex].available = available;
    
    await fs.writeFile('data/menu.json', JSON.stringify(menu, null, 2));
    
    res.json({ success: true, item: menu.items[itemIndex] });
  } catch (error) {
    console.error('Error editing menu item:', error);
    res.status(500).json({ error: 'Failed to edit menu item' });
  }
});

// Delete menu item
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const menuData = await fs.readFile('data/menu.json', 'utf8');
    const menu = JSON.parse(menuData);
    
    const itemIndex = menu.items.findIndex(item => item.id === parseInt(id));
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    menu.items.splice(itemIndex, 1);
    await fs.writeFile('data/menu.json', JSON.stringify(menu, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;