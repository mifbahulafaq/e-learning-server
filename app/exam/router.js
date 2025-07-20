const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { uploadDoct } = require('../../config');

const ctrlr = require('./controller');
const mdd = require('./middleware');

router.get('/exams/by-class/:code_class', ctrlr.getByClass);
router.get('/exams/:id_exm', ctrlr.getSingle);
router.get('/exams/:id_exm/:filename', ctrlr.getAttachment);
router.post('/exams', multer(uploadDoct).single('attachment'),  mdd.addValid, ctrlr.create);
router.put('/exams/:id_exm', multer(uploadDoct).single('attachment'), mdd.editValid, ctrlr.put);
router.delete('/exams/:id_exm', ctrlr.remove);

module.exports = router;