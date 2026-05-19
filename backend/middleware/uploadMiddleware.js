// ============================================================
//  middleware/uploadMiddleware.js  (Hafiz Abdul Rehman – 077011)
//  Handles product image uploads using Multer
// ============================================================
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Storage config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // e.g. product-1699999999999.jpg
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// --- File filter: images only ---
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extOk  = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
});

module.exports = upload;
