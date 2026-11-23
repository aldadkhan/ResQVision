require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

const app = express();
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));
app.get('/api/health', (_req,res) => res.json({ status:'ok', service:'ResQVision API', time:new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use((req,res) => res.status(404).json({ message:'Route not found' }));
app.use((err,req,res,_next) => {
  console.error(err);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 400 : (err.status || 500);
  res.status(status).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 5 MB upload limit' : (err.message || 'Internal server error') });
});
const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`ResQVision API running on ${PORT}`)))
  .catch(err => { console.error('Database connection failed:', err.message); process.exit(1); });
