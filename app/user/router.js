const router = require('express').Router();

const userControllers = require('./controller');

router.get('/users/:user_id', userControllers.getSingle);

module.exports = router;