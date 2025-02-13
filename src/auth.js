import jwt from "jsonwebtoken";
import dotenv from "dotenv";

let authenticateToken = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) {
    return res.json({ message: "No token given" });
  }
  try {
    let verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    console.log("Verified", verified);
    req.user = verified;
    next();
  } catch (err) {
    console.log("Error while auth", err);
    return res.json({ message: "Internal server error while auth", err });
  }
};

export { authenticateToken };
