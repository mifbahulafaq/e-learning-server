const apiRouter = require('express').Router()
const authRouter = require('express').Router()

//import routers
authRouter.use(require('../app/auth/router'));
apiRouter.use(require('../app/class/router'));
apiRouter.use(require('../app/class-student/router'));
apiRouter.use(require('../app/class-discussion/router'));
apiRouter.use(require('../app/matter-discussion/router'));
apiRouter.use(require('../app/schedule/router'));
apiRouter.use(require('../app/matter/router'));
//apiRouter.use(require('../app/exam/router'));
apiRouter.use(require('../app/exam-answer/router'));
apiRouter.use(require('../app/exam-ans-comment/router'));
apiRouter.use(require('../app/matt-ass/router'))
apiRouter.use(require('../app/ass-answer/router'))
apiRouter.use(require('../app/user/router'))

module.exports = {
	authRouter,
	apiRouter
}