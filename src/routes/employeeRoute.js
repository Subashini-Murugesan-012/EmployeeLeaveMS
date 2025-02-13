import {
  getEmployee,
  updateEmployee,
  updateEmployeeLeave,
} from "../controller/employeeController.js";
import { authenticateToken } from "../auth.js";
import express from "express";
import {
  applyLeave,
  approveLeaveRequest,
  cancelLeaveRequest,
  pendingLeaveRequest,
  viewLeave,
} from "../controller/leaveController.js";

const router = express.Router();

router.get("/getEmployees", getEmployee);
router.put("/updateEmployee/:id", authenticateToken, updateEmployee);
router.put("/updateEmployeeLeave", authenticateToken, updateEmployeeLeave);
router.post("/applyLeave", authenticateToken, applyLeave);
router.get("/viewLeaves", authenticateToken, viewLeave);
router.patch("/cancelLeaveRequest", authenticateToken, cancelLeaveRequest);
router.get("/pendingLeaveRequest", authenticateToken, pendingLeaveRequest);
router.patch(
  "/approveLeaveRequest/:leave_id",
  authenticateToken,
  approveLeaveRequest
);
export default router;
