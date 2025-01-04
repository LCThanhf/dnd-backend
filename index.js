const express = require('express');
const cors = require('cors');
const db = require('./src/configs/database.js');

const app = express();



app.use(cors());
app.use(express.json());

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


//food items
app.get('/api/food-items', (req, res) => {
  const type = req.query.type;
  
  // Basic query without type filter
  let query = `
    SELECT id, name, price, type, image, published_at 
    FROM food_items 
    WHERE published_at IS NOT NULL`;
  
  let queryParams = [];

  // Add type filter if specified
  if (type && type !== 'ALL') {
    query += ' AND type = ?';
    queryParams.push(type);
  }

  // Add ordering
  query += ' ORDER BY id ASC';

  console.log('Executing query:', query, queryParams); // Debug log

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching food items:', err);
      return res.status(500).send('Database error');
    }

    try {
      if (!results || !Array.isArray(results)) {
        throw new Error('No results or invalid format');
      }

      const foodItems = results.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price || 0),
        type: item.type || 'ALL',
        image: item.image || ''
      }));

      res.json(foodItems);
      
    } catch (error) {
      console.error('Error processing food items:', error);
      res.status(500).send('Data processing error');
    }
  });
});


//qr code and url
app.get('/api/table-info', (req, res) => {
  const qrCodeImage = req.query.qrCodeImage;
  const tableNumber = req.query.tableNumber;
  let query = '';
  let queryParam = '';

  if (qrCodeImage) {
    query = 'SELECT * FROM tables WHERE qr_code_image = ?';
    queryParam = qrCodeImage;
  } else if (tableNumber) {
    query = 'SELECT * FROM tables WHERE table_number = ?';
    queryParam = tableNumber;
  } else {
    res.status(400).send('Bad request');
    return;
  }

  db.query(query, [queryParam], (err, results) => {
    if (err) {
      console.error('Error fetching table info:', err);
      res.status(500).send('Server error');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Table not found');
      return;
    }
    res.json(results[0]);
  });
});


// order
app.post('/api/orders', (req, res) => {
  const { tableNumber, orderItems, totalAmount, paymentMethod } = req.body;
  
  console.log('Received order data:', {
    tableNumber,
    orderItems,
    totalAmount,
    paymentMethod
  });
  
  // Input validation
  if (!tableNumber || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).send('Invalid order data');
  }

  const orderDate = new Date();
  const status = 'waiting';
  const items = JSON.stringify(orderItems);

  const query = `
    INSERT INTO orders (
      table_number,
      items,
      total_amount,
      payment_method, 
      order_date,
      status,
      total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    tableNumber,
    items,
    totalAmount,
    paymentMethod,
    orderDate,
    status,
    totalAmount // total_price is same as totalAmount
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error saving order:', err);
      return res.status(500).send('Database error');
    }

    res.status(201).json({
      message: 'Order created successfully',
      orderId: results.insertId
    });
  });
});

// update order status
app.put('/api/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const query = `
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `;

  db.query(query, [status, orderId], (err, results) => {
    if (err) {
      console.error('Error updating order status:', err);
      res.status(500).send('Server error');
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).send('Order not found');
      return;
    }
    res.status(200).send('Order status updated successfully');
  });
});


// service request
app.post('/api/requests', (req, res) => {
  const { tableNumber, notes } = req.body;

  const query = `
    INSERT INTO requests (table_number, notes)
    VALUES (?, ?)
  `;

  db.query(query, [tableNumber, notes], (err, results) => {
    if (err) {
      console.error('Error saving request:', err);
      res.status(500).send('Server error');
      return;
    }
    res.status(201).send('Request saved successfully');
  });
});