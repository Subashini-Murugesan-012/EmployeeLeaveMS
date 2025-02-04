import {loginUser, registerUser} from '../controller/userController.js';
import express from 'express';

const router = express.Router();

router.post('/createUser', registerUser);
router.post('/loginUser', loginUser);



export default router;

