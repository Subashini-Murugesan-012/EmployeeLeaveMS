import { pool } from "../config/db.js";

const TOTAL_LEAVES = 12;

export let applyLeave = async (req, res) => {
  let { user_id, req_leave, reason } = req.body;
  if (!user_id) {
    return res.status(401).send({ data: "Need UserId" });
  }
  if (!req_leave || !reason) {
    return res.status(401).send({ data: "Need Leave Count and Reason" });
  }

  try {
    console.log(user_id, "user_id");
    let user = await pool.query(`select * from users where user_id=${user_id}`);
    if (!user) {
      return res.send({ message: "User not found" });
    }

    let user_in_leave = await pool.query(
      `select * from leave where user_id=$1 and leave_status= 'Approved'`,
      [user_id]
    );
    let user_leaves = 0;
    let balance_leaves = TOTAL_LEAVES;
    if (user_in_leave) {
      user_in_leave.rows.forEach((entry) => {
        user_leaves += entry.user_leaves;
        balance_leaves = TOTAL_LEAVES - entry.balance_leaves;
      });
    }

    let leave_query = await pool.query(
      `INSERT INTO leave (user_id, req_leave, reason, total_leaves, user_leaves, leave_status, balance_leaves) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        user_id,
        req_leave,
        reason,
        TOTAL_LEAVES,
        user_leaves,
        "Pending",
        balance_leaves,
      ]
    );
    return res
      .status(200)
      .send({ data: "Leave successfully applied", leave: leave_query.rows[0] });
  } catch (error) {
    console.log("Internal server error", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

export let viewLeave = async (req, res) => {
  let { user_id } = req.body;
  if (!user_id) {
    return res.status(401).send({ data: "Need UserId" });
  }
  if (req.user.user_id != user_id) {
    return res.status(403).send({ data: "Unauthorized" });
  }
  try {
    let user = await pool.query(`SELECT * FROM users where user_id=${user_id}`);
    if (user.rowCount == 0) {
      return res.status(404).send({ data: "User not found" });
    }
    let leaves = await pool.query(
      `SELECT * FROM leave where user_id=${user_id}`
    );
    return res.status(200).send({ data: leaves.rows });
  } catch (error) {
    console.log("Internal server error", error);
    return res.status(500).send({ data: "Internal server error", error });
  }
};

export let cancelLeaveRequest = async (req, res) => {
  let { leave_id, user_id } = req.body;
  if (!leave_id || !user_id) {
    return res
      .status(401)
      .send({ data: "Need to fill all the required fields" });
  }
  if (req.user.user_id != user_id) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    let user = await pool.query(
      `SELECT * FROM users where user_id=${user_id};`
    );
    if (!user) {
      return res.status(400).json({ message: "User Not found" });
    }
    let leave = await pool.query(
      `SELECT * FROM Leave where leave_id ='${leave_id}' and user_id=${user_id}`
    );
    if (leave.rows == 0) {
      return res.status(404).json({ message: "Leave Not found" });
    }
    if (leave?.rows[0].leave_status != "Pending") {
      return res
        .status(405)
        .json({ data: "You cannot cancel the progressed Leave Request" });
    }
    let update_leave = await pool.query(
      `UPDATE Leave set leave_status='Cancelled' where leave_id='${leave_id}' returning * ;`
    );
    return res.status(200).json({
      message: "Leave Request Cancelled",
      cancelled_leave: update_leave.rows[0],
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).send({ error: "Internal Server error", error });
  }
};

export let pendingLeaveRequest = async (req, res) => {
  if (req.user.role != "Manager") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    let pending_leaves = await pool.query(
      `SELECT * FROM Leave where leave_status='Pending';`
    );
    if (pending_leaves.rowCount == 0) {
      return res.status(200).send({ data: "No Pending Leave Requests" });
    }
    return res.status(200).send({
      data: "Pending Leave Requests",
      leave_requests: pending_leaves.rows,
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res
      .status(500)
      .send({ data: "Internal server error", error: error });
  }
};

export let approveLeaveRequest = async (req, res) => {
  let { leave_id } = req.params;
  if (!leave_id) {
    return res.status(404).send({ data: "Need Leave Id" });
  }
  if (req.user.role != "Manager") {
    return res.status(403).send({ data: "Unauthorized" });
  }
  try {
    let leave_query = await pool.query(
      `select * from Leave where leave_id='${leave_id}'`
    );
    if (leave_query.rowCount == 0) {
      return res.status(404).send({ data: "Leave Not found" });
    }
    if (leave_query.rows[0].leave_status != "Pending") {
      return res
        .status(400)
        .send({ data: "The Leave is not in Pending Status" });
    }
    let approve_query = await pool.query(
      `Update Leave set leave_status='Approved' where leave_id='${leave_id}'`
    );
    return res
      .status(200)
      .send({ message: "Leave Request Approved", data: approve_query.rows[0] });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res
      .status(500)
      .send({ data: "Internal Server Error", error: error });
  }
};
