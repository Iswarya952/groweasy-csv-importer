import { Router } from 'express';
import { uploadCsv } from '../middleware/upload.middleware';
import { confirmImport, previewCsv } from '../controllers/import.controller';

const router = Router();

router.post('/preview', uploadCsv.single('file'), previewCsv);
router.post('/confirm', uploadCsv.single('file'), confirmImport);

export default router;
