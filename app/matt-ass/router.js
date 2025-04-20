const router = require('express').Router();
const multer = require('../../middlewares/upload')
const config = require('../../config')

const controller = require('./controller');
const mdd = require('./middleware');

router.get('/matter-assignments/by-matter/:id_matt', controller.getByMatter)
router.get('/matter-assignments', controller.get)
router.get('/matter-assignments/:id_matt_ass', mdd.singleAssignmentAuthor, controller.getSingle)
router.get('/matter-assignments/:id_matt_ass/:filename', mdd.singleAssignmentAuthor, controller.getAttachment)
router.post('/matter-assignments', multer(config.uploadDoct).single('attachment'), mdd.addValidation, controller.add)
router.delete('/matter-assignments/:id_matt_ass', controller.delete)

module.exports = router
