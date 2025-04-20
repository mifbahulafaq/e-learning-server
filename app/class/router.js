const router = require('express').Router();
const multer = require('multer');

const controller = require('./controller');
const middleware = require('./middleware');

router.get('/classes', controller.get);
router.get('/classes/:code_class', controller.getSingle);
router.delete('/classes/:code_class', controller.delete);
router.post('/classes', multer().none(), middleware.addValid, controller.add);
router.put('/classes/:code_class', multer().none(), middleware.updateValid, controller.edit);

module.exports = router;