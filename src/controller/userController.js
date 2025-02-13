import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

let registerUser = async (req, res) => {
  let { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res
      .status(401)
      .json({ message: "Need to fill all the required fields" });
  }
  try {
    if (name.length < 4) {
      return res
        .status(401)
        .json({ message: "Name should have atleast 4 characters" });
    }
    let hashedPassword = await bcrypt.hash(password, 10);

    let query = `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)`;

    let user = await pool.query(query, [name, email, hashedPassword, role]);
    return res
      .status(200)
      .json({ message: "User created successfully", user: user.rows[0] });
  } catch (err) {
    console.log("Error while Creating user", err);
    return err;
  }
};

let loginUser = async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(401).json({ message: "Enter email and password" });
  }
  try {
    let query = `SELECT * FROM users where email =$1`;
    let user = await pool.query(query, [email]);
    if (user.rows.length == 0) {
      return res.status(404).json({ message: "User Not Found" });
    }
    let checkPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!checkPassword) {
      return res.status(401).json({ message: "Password Incorrect" });
    }
    let jwt_token = await jwt.sign(
      {
        role: user.rows[0].role,
        user_id: user.rows[0].user_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    return res.json({ user: user.rows[0], session_token: jwt_token });
  } catch (err) {
    console.log("Error while Login", err);
    return res.status(500).json({ message: "Error while login", err });
  }
};

export { registerUser, loginUser };
