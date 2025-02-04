import { getEmployee, updateEmployee } from "../controller/employeeController.js";
import { authenticateToken } from "../auth.js";
import express from 'express';

const router = express.Router();

router.get('/getEmployees', getEmployee);
router.put('/updateEmployee/:id', authenticateToken, updateEmployee);

export default router;