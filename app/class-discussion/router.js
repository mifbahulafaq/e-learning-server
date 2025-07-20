const router = require('express').Router();
const multer = require('multer');

const controller = require('./controller');
const mdd = require('./middleware');

router.get('/class-discussions/by-class/:code_class', controller.get);
router.post('/class-discussions', multer().none(), mdd.addValid, controller.add);

module.exports = router;
