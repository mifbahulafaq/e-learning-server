const router = require('express').Router();
const multer = require('multer');

const ctrlr = require('./controller');
const mdd = require('./middleware');

router.get('/exm-ans-comments/by-exm-ans/:id_exm_ans', ctrlr.getByAns);
router.post('/exm-ans-comments', multer().none(), mdd.addValid, ctrlr.add);

module.exports = router;
