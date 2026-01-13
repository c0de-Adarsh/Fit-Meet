require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDB = require('@config/db')

// Initialize Express app
const app = express()


connectDB()


// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));


app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Debug middleware to log request details
app.use((req, res, next) => {
  const contentType = req.get('Content-Type')
  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Content-Type:', contentType)
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('=== END MIDDLEWARE DEBUG ===')
  next()
})


const routes = require('./routes')
routes(app)


app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK' })
})


app.get('/api/test-public', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Public endpoint working!',
    timestamp: new Date().toISOString()
  })
})


app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

module.exports = app
