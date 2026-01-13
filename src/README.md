# Shroomtopia Backend API

## Overview

This is the backend API for Shroomtopia, providing CRUD operations for products with support for multiple image uploads.

## Features

- Create, read, update, and delete products
- Multiple image upload support (local storage or S3)
- Product filtering by category and primary use
- Detailed product information including descriptions, tags, and stock status

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- AWS S3 bucket (optional, for image storage)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shroomtopia

# Optional AWS S3 Configuration
BUCKET_REGION=your-region
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
BUCKET_NAME=your-bucket-name
```

### Installation

1. Install dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

3. Load dummy data (optional):
   ```
   node src/scripts/loadDummyData.js
   ```

## API Documentation

Detailed API documentation is available in the `src/docs/postman_guide.md` file. This guide includes:

- All available endpoints
- Request and response formats
- Example requests
- Troubleshooting tips

## API Endpoints

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get a single product
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product

### Menu

- `GET /api/products/menu/all` - Get all products for menu display

### Testing

- `POST /api/products/test-upload` - Test endpoint for file uploads

## Image Upload

The API supports multiple image uploads using Multer. Images can be stored either:

1. Locally in the `/uploads` directory
2. In an AWS S3 bucket (if configured)

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200` - Success
- `201` - Resource created
- `400` - Bad request
- `404` - Resource not found
- `500` - Server error

## Testing with Postman

Refer to the Postman guide in `src/docs/postman_guide.md` for detailed instructions on testing the API with Postman.
