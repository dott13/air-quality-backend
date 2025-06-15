const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite DB
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB open error:', err);
    else console.log('Connected to SQLite database.');
});

// Create table if not exists
const createTable = `
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId TEXT,
  humidity REAL,
  temperature REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

db.run(createTable, (err) => {
    if (err) console.error('Table creation error:', err);
});

// Endpoints

// POST /api/readings
// Body: { deviceId, humidity, temperature? }
app.post('/api/readings', (req, res) => {
    const { deviceId, humidity, temperature } = req.body;
    if (deviceId == null || humidity == null) {
        return res.status(400).json({ error: 'deviceId and humidity are required' });
    }
    const stmt = db.prepare(`INSERT INTO readings (deviceId, humidity, temperature) VALUES (?, ?, ?)`);
    stmt.run(deviceId, humidity, temperature || null, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'DB insert failed' });
        }
        res.json({ id: this.lastID, deviceId, humidity, temperature, timestamp: new Date().toISOString() });
    });
    stmt.finalize();
});

// GET /api/readings
app.get('/api/readings', (req, res) => {
    db.all('SELECT * FROM readings ORDER BY timestamp DESC LIMIT 100', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB query failed' });
        res.json(rows);
    });
});

// GET /api/readings/latest
app.get('/api/readings/latest', (req, res) => {
    db.get('SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1', [], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB query failed' });
        res.json(row);
    });
});

// GET /api/test
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok' });
});

// GET /api/window/open
app.post('/api/window/open', (req, res) => {
    // TODO: save to a `commands` table or publish to MQTT/WebSocket
    console.log('Received window open command');
    res.json({
        success: true,
        message: 'Window open command registered'
    });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));