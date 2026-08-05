const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Ensure upload directories exist
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const uploadPath = process.env.NODE_ENV === 'production' && process.env.UPLOAD_PATH ? process.env.UPLOAD_PATH : '/uploads';

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create subdirectory by user to prevent filename collision between users
        const userDir = path.join(uploadDir, `user_${req.session.userId || 'anonymous'}`);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        // Generate secure random filename with original extension
        const fileExtension = path.extname(file.originalname);
        const randomName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
        cb(null, randomName);
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});

// Helper to get public URL for uploaded file
const getFileUrl = (req, filename) => {
    if (!filename) return null;

    // Sanitize filename
    const sanitizedFilename = path.basename(filename).replace(/[^\w.\-_]/g, '_');

    const userId = req.session.userId || 'anonymous';

    if (process.env.NODE_ENV === 'production' && process.env.EXTERNAL_UPLOAD_URL) {
        return `${process.env.EXTERNAL_UPLOAD_URL}/user_${userId}/${sanitizedFilename}`;
    }

    return `${uploadPath}/user_${userId}/${sanitizedFilename}`;
};

module.exports = {
    upload,
    getFileUrl,
    uploadDir
};
