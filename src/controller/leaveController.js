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
      `select * from leave where user_id=$1 and leave_status= 'Approved'`, [user_id]
    );
    let balance_leaves = 0;
    if (user_in_leave) {
      user_in_leave.rows.forEach((entry) => {
        balance_leaves += entry.balance_leaves;
      });
    }

    let leave_query = await pool.query(
      `INSERT INTO leave (user_id, req_leave, reason, total_leaves, balance_leaves) VALUES ($1, $2, $3, $4, $5);`,
      [user_id, req_leave, reason, TOTAL_LEAVES, balance_leaves]
    );
    return res
      .status(200)
      .send({ data: "Leave successfully applied", leave: leave_query.rows[0] });
  } catch (error) {
    console.log(
        "Internal server error", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};
