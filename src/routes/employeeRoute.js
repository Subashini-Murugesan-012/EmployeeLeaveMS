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
  getAuditReport,
  getLeaveBalance,
  getLeaveReport,
  pendingLeaveRequest,
  rejectLeaveRequest,
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
router.patch(
  "/rejectLeaveRequest/:leave_id",
  authenticateToken,
  rejectLeaveRequest
);
router.get(
  "/getLeaveBalance/:user_id/balance",
  authenticateToken,
  getLeaveBalance
);
router.get("/getLeaveReport", authenticateToken, getLeaveReport);
router.get("/getAuditReport", authenticateToken, getAuditReport);
export default router;
