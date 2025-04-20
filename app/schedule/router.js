const router = require('express').Router();
const multer = require('multer');
const middleware = require('./middleware');
const controller = require('./controller');

router.post('/schedules', multer().none(), middleware.createValid, controller.createSchedule);
router.get('/schedules/by-class/:code_class',  controller.readSchedules);

module.exports = router;