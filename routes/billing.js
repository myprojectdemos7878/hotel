const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Generate bill
router.post('/generate', async (req, res) => {
  try {
    const { table, discountType, discountValue } = req.body;
    
    if (!table) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    const tableFile = `data/tables/table-${table}.json`;
    
    try {
      const tableData = await fs.readFile(tableFile, 'utf8');
      const tableOrder = JSON.parse(tableData);
      
      if (tableOrder.status === "empty" || !tableOrder.active) {
        return res.status(400).json({ error: 'No active order for this table' });
      }
      
      // Calculate discount
      let discount = 0;
      let subtotal = tableOrder.total;
      
      if (discountType && discountValue) {
        if (discountType === 'flat') {
          discount = parseFloat(discountValue);
        } else if (discountType === 'percentage') {
          discount = (subtotal * parseFloat(discountValue)) / 100;
        }
        
        // Ensure discount doesn't exceed subtotal
        discount = Math.min(discount, subtotal);
      }
      
      const total = subtotal - discount;
      
      // Generate bill ID
      const now = new Date();
      const billId = `HTL-${table.toString().padStart(2, '0')}-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Create bill object
      const bill = {
        id: billId,
        table: parseInt(table),
        date: now.toISOString(),
        items: tableOrder.items,
        subtotal: subtotal,
        discount: discount,
        total: total,
        discountType: discountType,
        discountValue: discountValue
      };
      
      // Save bill
      const billFile = `data/bills/${billId}.json`;
      await fs.writeFile(billFile, JSON.stringify(bill, null, 2));
      
      // Archive order
      const archiveFile = `data/archive/orders/table-${table}-${now.getTime()}.json`;
      await fs.writeFile(archiveFile, JSON.stringify(tableOrder, null, 2));
      
      // Update revenue
      const revenueDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const revenueFile = `data/revenue/${revenueDate}.json`;
      
      let revenueData;
      try {
        const revenueContent = await fs.readFile(revenueFile, 'utf8');
        revenueData = JSON.parse(revenueContent);
      } catch (error) {
        revenueData = {
          date: revenueDate,
          bills: [],
          total: 0
        };
      }
      
      revenueData.bills.push({
        id: billId,
        amount: total
      });
      
      revenueData.total = revenueData.bills.reduce((sum, bill) => sum + bill.amount, 0);
      
      await fs.writeFile(revenueFile, JSON.stringify(revenueData, null, 2));
      
      // Reset table
      const resetTable = {
        table: parseInt(table),
        status: "empty",
        items: [],
        total: 0,
        active: false
      };
      
      await fs.writeFile(tableFile, JSON.stringify(resetTable, null, 2));
      
      res.json({ success: true, bill: bill });
    } catch (error) {
      console.error('Error reading table file:', error);
      return res.status(404).json({ error: 'Table not found' });
    }
  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
});

// Get bill for table
router.get('/', async (req, res) => {
  try {
    const { table } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    // Look for the latest bill for this table
    const billsDir = 'data/bills';
    let latestBill = null;
    
    try {
      const files = await fs.readdir(billsDir);
      
      for (const file of files) {
        if (file.startsWith(`HTL-${table.toString().padStart(2, '0')}`) && file.endsWith('.json')) {
          const billData = await fs.readFile(path.join(billsDir, file), 'utf8');
          const bill = JSON.parse(billData);
          
          if (!latestBill || new Date(bill.date) > new Date(latestBill.date)) {
            latestBill = bill;
          }
        }
      }
    } catch (error) {
      // If bills directory doesn't exist or is empty
    }
    
    if (!latestBill) {
      return res.status(404).json({ error: 'No bill found for this table' });
    }
    
    res.json(latestBill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// View bill (printable page)
router.get('/view', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Bill ID is required' });
    }
    
    const billFile = `data/bills/${id}.json`;
    
    try {
      const billData = await fs.readFile(billFile, 'utf8');
      const bill = JSON.parse(billData);
      
      // Send HTML for printable bill
      const billHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bill ${bill.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .hotel-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .bill-info { margin-bottom: 20px; display: flex; justify-content: space-between; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .totals { text-align: right; margin-bottom: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hotel-name">Grand Hotel Restaurant</div>
            <div>123 Restaurant Street, Food City</div>
            <div>Phone: +91 9876543210</div>
          </div>
          
          <div class="bill-info">
            <div>
              <div><strong>Bill ID:</strong> ${bill.id}</div>
              <div><strong>Table:</strong> ${bill.table}</div>
            </div>
            <div>
              <div><strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</div>
              <div><strong>Time:</strong> ${new Date(bill.date).toLocaleTimeString()}</div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price}</td>
                  <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div><strong>Subtotal:</strong> ₹${bill.subtotal.toFixed(2)}</div>
            ${bill.discount > 0 ? `<div><strong>Discount:</strong> ₹${bill.discount.toFixed(2)}</div>` : ''}
            <div><strong>Total Amount:</strong> ₹${bill.total.toFixed(2)}</div>
          </div>
          
          <div class="footer">
            <div>Thank you for dining with us!</div>
            <div>Visit again soon!</div>
          </div>
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Bill</button>
          </div>
        </body>
        </html>
      `;
      
      res.send(billHtml);
    } catch (error) {
      console.error('Error reading bill file:', error);
      return res.status(404).json({ error: 'Bill not found' });
    }
  } catch (error) {
    console.error('Error viewing bill:', error);
    res.status(500).json({ error: 'Failed to view bill' });
  }
});

module.exports = router;