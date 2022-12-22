const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// Router
const router = express.Router();

router.post('/signup', authController.signup);

router.post('/login', authController.login);
router.get('/signout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);

router.patch('/resetPassword/:token', authController.resetPassword);

// Protect All Routes Below
router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUserById);

router.patch('/updateMyPassword', authController.updatePassword);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

// Restrict All Routes Below to Admins
router.use(authController.restrictTo('admin'));

router.route('/').get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUserById)
  .patch(userController.updateUserById)
  .delete(userController.deleteUserById);

module.exports = router;
