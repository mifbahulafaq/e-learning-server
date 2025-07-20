const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const { uploadDoct } = require('../../config');

//middlewares
const fileToBody = require('../../middlewares/locateFile');

const ctrlr = require('./controller');
const mdd = require('./middleware');

router.get('/exam-answers/by-exam/:id_exm', ctrlr.getByExam);
router.get('/exam-answers/:id_exm_ans', ctrlr.getSingle);
router.get('/exam-answers/:id_exm_ans/:filename', ctrlr.getAttachment);
router.put('/exam-answers', multer(uploadDoct).single('content') ,fileToBody('content'), mdd.addValid, ctrlr.addAnswer);
router.put('/exam-answers/:id_exm_ans/rate', multer2().none(), mdd.rateValid, ctrlr.rate);

module.exports = router;

