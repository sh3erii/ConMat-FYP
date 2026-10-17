const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const heicConvert = require('heic-convert');

const root = path.join(__dirname, '..', 'uploads');
const products = path.join(root, 'products');
const verification = path.join(root, 'verification');
const profiles = path.join(root, 'profiles');
for (const dir of [products, verification, profiles]) fs.mkdirSync(dir, { recursive: true });

const verificationFields = new Set(['userPhoto', 'idCardPhoto', 'ntnPhoto', 'businessApprovalLetter']);
const profileFields = new Set(['profilePhoto']);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, verificationFields.has(file.fieldname) ? verification : profileFields.has(file.fieldname) ? profiles : products),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'file';
    cb(null, `${file.fieldname}-${Date.now()}-${base}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const images = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const docs = [...images, 'application/pdf'];
  const allowed = verificationFields.has(file.fieldname) ? docs : images;
  const heicByExtension = ['.heic', '.heif'].includes(extension);
  if (!allowed.includes(file.mimetype) && !heicByExtension) return cb(new Error(`Unsupported file type for ${file.fieldname}.`));
  cb(null, true);
};

const uploader = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadedFiles = (req) => [
  ...(req.file ? [req.file] : []),
  ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat()),
];

async function convertHeicImages(req) {
  for (const file of uploadedFiles(req)) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.heic', '.heif'].includes(extension) && !['image/heic', 'image/heif'].includes(file.mimetype)) continue;

    const nextFilename = `${path.basename(file.filename, path.extname(file.filename))}.jpg`;
    const nextPath = path.join(file.destination, nextFilename);
    const input = await fs.promises.readFile(file.path);
    const jpegBuffer = await heicConvert({ buffer: input, format: 'JPEG', quality: 0.9 });
    await sharp(jpegBuffer).jpeg({ quality: 90 }).toFile(nextPath);
    await fs.promises.unlink(file.path);
    Object.assign(file, {
      filename: nextFilename,
      path: nextPath,
      mimetype: 'image/jpeg',
    });
  }
}

const withConversion = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) return next(error);
    return convertHeicImages(req).then(() => next()).catch(next);
  });
};

module.exports = {
  single: (field) => withConversion(uploader.single(field)),
  fields: (fields) => withConversion(uploader.fields(fields)),
  array: (field, maxCount) => withConversion(uploader.array(field, maxCount)),
  any: () => withConversion(uploader.any()),
};
