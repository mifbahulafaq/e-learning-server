const router = require('express').Router();
const multer = require('multer');
const middleware = require('./middleware');
const controller = require('./controller');

router.get('/matter-discussions/by-matter/:id_matt', controller.getMattDiscuss);
router.post('/matter-discussions', multer().none(), middleware.addValid, controller.addMattDiscuss);

module.exports = router;

