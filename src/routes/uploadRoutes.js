const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const cloudinary = require('../config/cloudinary');


router.post('/single', upload.single('file'), async (req, res) => {
  try {
   
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded successfully:', req.file.path);
    
    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format,
        resourceType: req.file.resource_type,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});


router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      format: file.format,
      resourceType: file.resource_type,
      size: file.size,
    }));

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});


router.delete('/delete/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query; // image, video, or raw

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === 'ok') {
      res.status(200).json({ message: 'File deleted successfully', result });
    } else {
      res.status(404).json({ error: 'File not found or already deleted', result });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

module.exports = router;
