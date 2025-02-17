import { pool } from "../config/db.js";
import fs, { existsSync } from "fs";
import { Parser } from "json2csv";
import moment from "moment";
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

const TOTAL_LEAVES = 12;
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

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
      return res.status(404).send({ message: "User not found" });
    }

    let user_in_leave = await pool.query(
      `select * from leave where user_id=$1 and leave_status= 'Approved'`,
      [user_id]
    );

    let leave_query = await pool.query(
      `INSERT INTO leave (user_id, req_leave, reason, total_leaves, leave_status) VALUES ($1, $2, $3, $4, $5) returning *;`,
      [user_id, req_leave, reason, TOTAL_LEAVES, "Pending"]
    );

    await pool.query(
      `INSERT INTO audit_logs (action, leave_id, performed_by, new_data)
       VALUES ('created', $1, $2, $3)`,
      [
        leave_query.rows[0].leave_id,
        user_id,
        JSON.stringify(leave_query.rows[0]),
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
    await pool.query(
      `INSERT INTO audit_logs (action, leave_id, performed_by, old_data, new_data)
       VALUES ('cancel', $1, $2, $3, $4)`,
      [
        leave_id,
        req.user.user_id,
        JSON.stringify(leave.rows[0]),
        JSON.stringify(update_leave.rows[0]),
      ]
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
    let used_leaves_query = await pool.query(
      `select * from leave where user_id=${leave_query.rows[0].user_id} and leave_status ='Approved'`
    );
    let user_email_query = await pool.query(
      `select email from users join leave on leave.user_id = users.user_id`
    );
    console.log(user_email_query.rows[0]);
    let used_leaves = leave_query.rows[0].req_leave;
    used_leaves_query.rows.forEach((used_lvs) => {
      used_leaves += used_lvs.used_leaves;
    });

    let balance_leaves = TOTAL_LEAVES - used_leaves;
    let approve_query = await pool.query(
      `Update Leave set leave_status='Approved', used_leaves=${used_leaves}, balance_leaves=${balance_leaves} where leave_id='${leave_id}'`
    );
    await pool.query(
      `INSERT INTO audit_logs (action, leave_id, performed_by, old_data, new_data)
       VALUES ('approve', $1, $2, $3, $4)`,
      [
        leave_id,
        req.user.user_id,
        JSON.stringify(leave_query.rows[0]),
        JSON.stringify(approve_query.rows[0]),
      ]
    );
    await sendMail(
      user_email_query.rows[0].email,
      "Leave Approved",
      "Your leave request has been approved."
    );
    return res.status(200).json({
      approved_leave: approve_query.rows[0],
      message: "Leave Approved",
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res
      .status(500)
      .send({ data: "Internal Server Error", error: error });
  }
};

export let rejectLeaveRequest = async (req, res) => {
  let { leave_id } = req.params;
  let { rejection_reason } = req.body;
  if (!rejection_reason) {
    return res.status(400).send({ message: "Need Rejection Reason" });
  }
  if (!leave_id) {
    return res.status(400).send({ message: "Need LeaveId" });
  }
  if (req.user.role != "Manager") {
    return res.status(403).send({ data: "Unauthorized" });
  }
  try {
    let leave_query = await pool.query(
      `select * from leave where leave_id='${leave_id}'`
    );
    if (leave_query.rowCount == 0) {
      return res.status(404).send({ message: "Leave not found" });
    }
    if (leave_query.rows[0].leave_status != "Pending") {
      return res
        .status(400)
        .send({ message: "Cannot reject the non-pending Request" });
    }
    let user_email_query = await pool.query(
      `select email from users join leave on leave.user_id = users.user_id`
    );
    console.log(user_email_query.rows[0]);
    let reject_query = await pool.query(
      `update leave set leave_status='Rejected', rejection_reason='${rejection_reason}' where leave_id='${leave_id}' returning *`
    );
    await pool.query(
      `INSERT INTO audit_logs (action, leave_id, performed_by, old_data, new_data)
       VALUES ('cancel', $1, $2, $3, $4)`,
      [
        leave_id,
        req.user.user_id,
        JSON.stringify(leave_query.rows[0]),
        JSON.stringify(reject_query.rows[0]),
      ]
    );
    await sendMail(
      user_email_query.rows[0].email,
      "Leave Rejected",
      `Your leave request has been reject due to ${rejection_reason}.`
    );
    return res.status(200).send({
      message: "Rejected Successfully",
      rejected_req: reject_query.rows[0],
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ error: "Internal Server Error", error });
  }
};

export let getLeaveBalance = async (req, res) => {
  let { user_id } = req.params;
  if (req.user.role != "HR")
    return res.status(403).send({ message: "Unauthorized" });

  if (!user_id) return res.status(400).send({ message: "Need UserId" });
  try {
    let user = await pool.query(`select * from users where user_id=${user_id}`);
    if (user.rowCount == 0) {
      return res.status(404).json({ message: "NO User Found" });
    }
    let leaves = await pool.query(
      `select * from leave where user_id=${user_id} and leave_status='Approved'`
    );
    let leave_balance = TOTAL_LEAVES,
      used_leave = 0;
    console.log(leaves.rows);
    leaves.rows.forEach((leave) => {
      leave_balance -= leave.req_leave;
      used_leave += leave.req_leave;
    });
    return res.status(200).send({
      user: user.rows[0],
      leave_balance: leave_balance,
      used_leave: used_leave,
      message: "Queried result",
    });
  } catch (err) {
    console.log("Internal Server Error", err);
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: err });
  }
};

export let getLeaveReport = async (req, res) => {
  let { user_id, leave_status } = req.body;
  if (req.user.role != "HR")
    return res.status(403).send({ message: "Unauthorized" });
  try {
    let fields = [];
    let values = [];
    let index = 1;
    let query = "";

    if (user_id) {
      if (fields < 1) {
        fields.push(` where user_id = $${index++}`);
      } else {
        fields.push(`and user_id = $${index++}`);
      }

      values.push(user_id);
    }
    if (leave_status) {
      if (fields < 1) {
        fields.push(` where leave_status = $${index++}`);
      } else {
        fields.push(`and leave_status = $${index++}`);
      }
      values.push(leave_status);
    }
    console.log(fields.length, values.length);
    if (!fields.length == 0 && !values.length == 0) {
      query = `select * from leave ${fields.join(" ")}`;
    } else {
      query = ` select * from leave `;
    }

    let leave_reports = await pool.query(query, values);

    const csv_parser = new Parser({
      defaultValue: "",
    });
    let csv_data = csv_parser.parse(leave_reports.rows);
    const timestamp = moment().format("YYYYMMDD_HHmmss");
    let file_name = `EmpReport${timestamp}.csv`;
    const file_path = `./src/reports/${file_name}`;

    try {
      fs.writeFileSync(file_path, csv_data);
      console.log(`File written successfully: ${file_path}`);
    } catch (writeError) {
      console.error("File writing error:", writeError);
      return res.status(500).send("Failed to write report file");
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${file_name}`);

    res.download(file_path, file_name, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).send("Failed while downloading");
      } else {
        console.log(`Download started for file: ${file_name}`);
      }
    });
    res.on("finish", () => {
      fs.unlink(file_path, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        } else {
          console.log(`File deleted: ${file_path}`);
        }
      });
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).send("Internal server error");
  }
};

export let getAuditReport = async (req, res) => {
  if (req.user.role != "HR") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    let audit_report = await pool.query(`select * from audit_logs`);
    return res.status(200).json({
      message: "Audit Reports are below:",
      audit_logs: audit_report.rows,
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ error: "Internal Server Error", error });
  }
};
let sendMail = async (to, subject, text) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmptMail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmptMail.sender = { name: "HR", email: "hr@gmail.com" };
    sendSmptMail.to = [{ email: to }];
    sendSmptMail.subject = subject;
    sendSmptMail.textContent = text;

    await apiInstance.sendTransacEmail(sendSmptMail);
    console.log("Mail sent successfully");
  } catch (error) {
    console.log("Error while sending email", error);
  }
};
