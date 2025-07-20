const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { uploadDoct } = require('../../config');

//middlewares
const fileToBody = require('../../middlewares/locateFile')

const ctrlr = require('./controller');
const mdd = require('./middleware');

router.get('/assignment-answers/by-matt-ass/:id_matt_ass', ctrlr.getByAss);
router.get('/assignment-answers/:id_ass_ans', ctrlr.getSingle);
router.get('/assignment-answers/:id_ass_ans/:filename', ctrlr.getAttachment);
router.put('/assignment-answers', multer(uploadDoct).single('content') ,fileToBody('content'), mdd.addValid, ctrlr.addAnswer);

module.exports = router;
