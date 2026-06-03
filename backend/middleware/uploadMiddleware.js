const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Root uploads folder
const uploadRoot = path.join(__dirname, '..', 'uploads');
// Subdirectories for organization
const productDir = path.join(uploadRoot, 'products');
const documentDir = path.join(uploadRoot, 'documents');

// Ensure all directories exist
[uploadRoot, productDir, documentDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to documents if it's a verification letter, otherwise products
    if (file.fieldname === 'businessApprovalLetter') return cb(null, documentDir);
    return cb(null, productDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const safeName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '')
      .toLowerCase();
    cb(null, `${file.fieldname}-${Date.now()}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const imageFields = ['image', 'images', 'productImage'];
  const documentFields = ['businessApprovalLetter'];

  // Check product images
  if (imageFields.includes(file.fieldname)) {
    const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    return isImage ? cb(null, true) : cb(new Error('Only JPEG, JPG, PNG and WEBP product images are allowed.'));
  }

  // Check verification documents
  if (documentFields.includes(file.fieldname)) {
    const allowedDocs = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    return allowedDocs.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Verification document must be PDF, JPEG, JPG or PNG.'));
  }

  return cb(new Error(`Unsupported upload field: ${file.fieldname}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
