/**
 * Upload Routes with Vercel Blob - Agent 6
 * File upload system for DoramaFlix
 */

const express = require('express');
const multer = require('multer');
const { put, del, list } = require('@vercel/blob');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = {
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      subtitle: ['text/vtt', 'application/x-subrip']
    };

    const allAllowed = [
      ...allowedTypes.video,
      ...allowedTypes.image,
      ...allowedTypes.subtitle
    ];

    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Vercel Blob configuration
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_placeholder_configure_with_real_token';

// Helper function to upload to Vercel Blob
async function uploadToVercelBlob(file, folder = 'uploads') {
  try {
    if (!BLOB_TOKEN || BLOB_TOKEN.includes('placeholder')) {
      // Mock upload for development
      return {
        url: `https://mock-blob.vercel-storage.com/${folder}/${Date.now()}-${file.originalname}`,
        downloadUrl: `https://mock-blob.vercel-storage.com/${folder}/${Date.now()}-${file.originalname}`,
        pathname: `${folder}/${Date.now()}-${file.originalname}`,
        size: file.size
      };
    }

    const filename = `${folder}/${Date.now()}-${file.originalname}`;
    
    const blob = await put(filename, file.buffer, {
      access: 'public',
      token: BLOB_TOKEN,
      addRandomSuffix: true
    });

    return blob;
  } catch (error) {
    console.error('Vercel Blob upload error:', error);
    throw error;
  }
}

// Upload video endpoint
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    // Validate video file
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'File must be a video'
      });
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadToVercelBlob(req.file, 'videos');

    // Save to database (mock for now)
    const videoRecord = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: uploadResult.url,
      downloadUrl: uploadResult.downloadUrl,
      pathname: uploadResult.pathname,
      uploadedAt: new Date().toISOString(),
      courseId: req.body.courseId,
      episodeId: req.body.episodeId,
      title: req.body.title || req.file.originalname,
      description: req.body.description
    };

    res.json({
      success: true,
      data: videoRecord,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Video upload failed',
      details: error.message
    });
  }
});

// Upload image endpoint
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'File must be an image'
      });
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadToVercelBlob(req.file, 'images');

    // Save to database (mock for now)
    const imageRecord = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: uploadResult.url,
      downloadUrl: uploadResult.downloadUrl,
      pathname: uploadResult.pathname,
      uploadedAt: new Date().toISOString(),
      type: req.body.type || 'thumbnail', // thumbnail, banner, avatar
      entityId: req.body.entityId,
      alt: req.body.alt || req.file.originalname
    };

    res.json({
      success: true,
      data: imageRecord,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Image upload failed',
      details: error.message
    });
  }
});

// Upload subtitle endpoint
router.post('/subtitle', upload.single('subtitle'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No subtitle file provided'
      });
    }

    // Validate subtitle file
    const allowedSubtitleTypes = ['text/vtt', 'application/x-subrip'];
    if (!allowedSubtitleTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'File must be a subtitle (VTT or SRT)'
      });
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadToVercelBlob(req.file, 'subtitles');

    // Save to database (mock for now)
    const subtitleRecord = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: uploadResult.url,
      downloadUrl: uploadResult.downloadUrl,
      pathname: uploadResult.pathname,
      uploadedAt: new Date().toISOString(),
      episodeId: req.body.episodeId,
      language: req.body.language || 'en',
      label: req.body.label || 'Default'
    };

    res.json({
      success: true,
      data: subtitleRecord,
      message: 'Subtitle uploaded successfully'
    });

  } catch (error) {
    console.error('Subtitle upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Subtitle upload failed',
      details: error.message
    });
  }
});

// Delete file endpoint
router.delete('/file', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'File URL required'
      });
    }

    if (!BLOB_TOKEN || BLOB_TOKEN.includes('placeholder')) {
      // Mock delete for development
      return res.json({
        success: true,
        message: 'File deleted successfully (mock)'
      });
    }

    // Delete from Vercel Blob
    await del(url, { token: BLOB_TOKEN });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      error: 'File deletion failed',
      details: error.message
    });
  }
});

// List files endpoint
router.get('/files', async (req, res) => {
  try {
    if (!BLOB_TOKEN || BLOB_TOKEN.includes('placeholder')) {
      // Mock file list for development
      return res.json({
        success: true,
        data: {
          blobs: [
            {
              url: 'https://mock-blob.vercel-storage.com/videos/sample-video.mp4',
              pathname: 'videos/sample-video.mp4',
              size: 50000000,
              uploadedAt: new Date().toISOString()
            },
            {
              url: 'https://mock-blob.vercel-storage.com/images/sample-image.jpg',
              pathname: 'images/sample-image.jpg', 
              size: 2000000,
              uploadedAt: new Date().toISOString()
            }
          ]
        }
      });
    }

    const { blobs } = await list({ token: BLOB_TOKEN });

    res.json({
      success: true,
      data: { blobs }
    });

  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      details: error.message
    });
  }
});

// Get upload stats
router.get('/stats', async (req, res) => {
  try {
    // Mock stats for now
    const stats = {
      totalFiles: 42,
      totalSize: 2150000000, // ~2GB
      videoFiles: 15,
      imageFiles: 25,
      subtitleFiles: 2,
      storageUsed: '2.1 GB',
      storageLimit: '100 GB'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      details: error.message
    });
  }
});

module.exports = router;