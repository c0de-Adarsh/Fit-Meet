'use strict'
const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri)
    console.log('Mongoose connected')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }

  mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected')
  })

  mongoose.connection.on(
    'error',
    console.error.bind(console, 'MongoDB connection error'),
  )

  process.on('SIGINT', function () {
    mongoose.connection.close(function () {
      console.log(
        'Mongoose default connection disconnected through app termination',
      )
      process.exit(0)
    })
  })
}

module.exports = connectDB
