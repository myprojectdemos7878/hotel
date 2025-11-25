const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize data directories
async function initializeDirectories() {
  const directories = [
    'data/tables',
    'data/bills',
    'data/revenue',
    'data/archive/orders'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.log(`Directory ${dir} already exists`);
    }
  }
  
  // Initialize menu.json if it doesn't exist
  try {
    await fs.access('data/menu.json');
  } catch (error) {
    const defaultMenu = {
      items: [
        { id: 1, name: "Butter Chicken", price: 320, category: "Main Course", available: true },
        { id: 2, name: "Paneer Butter Masala", price: 280, category: "Main Course", available: true },
        { id: 3, name: "Chicken Biryani", price: 250, category: "Rice", available: true },
        { id: 4, name: "Veg Biryani", price: 180, category: "Rice", available: true },
        { id: 5, name: "Garlic Naan", price: 60, category: "Bread", available: true },
        { id: 6, name: "Butter Naan", price: 50, category: "Bread", available: true },
        { id: 7, name: "Coke", price: 40, category: "Beverages", available: true },
        { id: 8, name: "Lassi", price: 80, category: "Beverages", available: true }
      ]
    };
    await fs.writeFile('data/menu.json', JSON.stringify(defaultMenu, null, 2));
    console.log('Created default menu.json');
  }
  
  // Initialize admin.json if it doesn't exist
  try {
    await fs.access('data/admin.json');
  } catch (error) {
    const adminData = {
      username: "admin",
      password: "admin123"
    };
    await fs.writeFile('data/admin.json', JSON.stringify(adminData, null, 2));
    console.log('Created admin.json');
  }
}

// Routes
app.use('/api/menu', require('./routes/menu'));
app.use('/api/order', require('./routes/orders'));
app.use('/api/table', require('./routes/tables'));
app.use('/api/bill', require('./routes/billing'));
app.use('/api/revenue', require('./routes/revenue'));

// Simple auth check
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const adminData = await fs.readFile('data/admin.json', 'utf8');
    const admin = JSON.parse(adminData);
    
    if (username === admin.username && password === admin.password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

// Add this route for bill viewing
app.get('/bill', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bill.html'));
});

// Add this route for bill view with ID
app.get('/bill/view', (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.redirect('/bill');
  }
  // This will be handled by the billing route
  res.redirect(`/api/bill/view?id=${id}`);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/menu-editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu-editor.html'));
});

// Start server
initializeDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Hotel Food Ordering System running on http://localhost:${PORT}`);
    console.log(`📱 Customer: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
  });
}).catch(error => {
  console.error('❌ Failed to start server:', error);
});