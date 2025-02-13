import { getEmployee, updateEmployee, updateEmployeeLeave , } from "../controller/employeeController.js";
import { authenticateToken } from "../auth.js";
import express from 'express';
import { applyLeave } from "../controller/leaveController.js";

const router = express.Router();

router.get('/getEmployees', getEmployee);
router.put('/updateEmployee/:id', authenticateToken, updateEmployee);
router.put('/updateEmployeeLeave', authenticateToken, updateEmployeeLeave);
router.post('/applyLeave', authenticateToken, applyLeave);
export default router;