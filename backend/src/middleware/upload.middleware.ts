import multer from 'multer';

const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/csv' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (!isCsv) {
    cb(new Error('Only .csv files are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadCsv = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});
