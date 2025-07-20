const router = require('express').Router();
const multer = require('multer');


const ctrlr = require('./controller');

const mdd = require('./middleware');

router.get('/class-students/by-class/:code_class', ctrlr.getByClass);
router.get('/class-students', ctrlr.getStudents);
router.post('/class-students/join', multer().none(), mdd.joinValid, ctrlr.add);
router.post('/class-students', multer().none(), mdd.addValid, ctrlr.add);
router.delete('/class-students/:id_class_student', ctrlr.unenroll);

module.exports = router;
