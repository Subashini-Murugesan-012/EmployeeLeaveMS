import pkg from "pg";
import dotenv from 'dotenv';
dotenv.config();

const {Pool} = pkg;
const pool = new Pool({
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER
});

let connectDB = async () => {
    try {
        await pool.connect();
        console.log("Db connected successfuly")
    } catch(err){
        console.log("Error while connecting db", err);
        return err;
    }
}

export {pool, connectDB};