const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    
    let resourceType = 'auto';
    let folder = 'uploads';
    
    if (file.mimetype.startsWith('image/')) {
      folder = 'uploads/images';
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'uploads/videos';
      resourceType = 'video';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'uploads/documents';
      resourceType = 'raw';
    } else {
      folder = 'uploads/files';
      resourceType = 'raw';
    }

    return {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'pdf', 'mp4', 'avi', 'mov', 'mkv', 'webm'],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// File filter to allow images, videos, PDFs, and other files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/mkv',
    'video/webm',
    'video/quicktime',
    // Documents
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed! Allowed types: images (jpg, png, gif, webp, avif), videos (mp4, avi, mov, mkv, webm), and PDF documents.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

module.exports = upload;
