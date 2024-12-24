const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { uploadDoct } = require('../../config');
const controller = require('./controller');
const middleware = require('./middleware');

router.get(
	'/matters/by-class/:code_class', 
	controller.getByClass
);
router.get(
	'/matters/:id_matt', 
	middleware.singleMatterAuthor, 
	controller.getSingle
);
router.get(
	'/matters/:id_matt/:filename', 
	middleware.singleMatterAuthor, 
	controller.getAttachment
);
router.post(
	'/matters', 
	multer(uploadDoct).array('attachment') ,
	middleware.addingValid, 
	controller.postMatter
);
router.put(
	'/matters/:id_matt',
	 multer(uploadDoct).array('attachment'), 
	middleware.editingValid, 
	controller.putMatter
);
router.delete(
	'/matters/:id_matt',
	 controller.remove
 );

module.exports = router;