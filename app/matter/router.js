const router = require('express').Router();
const multer = require('../../middlewares/upload'); 
const { uploadDoct } = require('../../config');
const controller = require('./controller');
const middleware = require('./middleware');

//middleware
// router.use('*', middleware.author)

router.get(
	'/matters/by-class/:code_class', 
	controller.getByClass
);
router.get(
	'/matters/:id_matt', 
	controller.getSingle
);
router.get(
	'/matters/:id_matt/:filename', 
	controller.getAttachment
);
router.post(
	'/matters', 
	multer(uploadDoct).array('attachment') ,
	middleware.addingValid, 
	controller.add
);
router.put(
	'/matters/:id_matt',
	 multer(uploadDoct).array('attachment'), 
	middleware.editingValid, 
	controller.edit
);
router.delete(
	'/matters/:id_matt',
	 controller.remove
 );

module.exports = router;