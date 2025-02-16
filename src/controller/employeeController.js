import { pool } from '../config/db.js';
import bcrypt from 'bcrypt';


let getEmployee = async (req, res) => {
    try {
        let query = `select * from users where role='Employee'`;
        let users = await pool.query(query);

        return res.status(200).json({ users: users.rows })
    } catch (err) {
        console.log('Error while getting Employee', err);
        return res.json(err);
    }
}

let updateEmployee = async (req, res) => {
    const { id } = req.params;
    let { name, email, password } = req.body;
    try {
        let user = await pool.query(`Select * from users where user_id = $1`, [id]);
        if (user.rows.length == 0) {
            return res.status(400).json({ message: 'user not found' });
        }

        let updateFields = [];
        let values = [];
        let index = 1;
        if (name) {
            updateFields.push(`name = $${index++}`);
            values.push(name);
        }
        if (email) {
            updateFields.push(`email = $${index++}`);
            values.push(email);
        }
        if (password) {
            updateFields.push(`password = $${index++}`);
            let hash = await bcrypt.hash(password, 10);
            values.push(hash);
        }
        if (updateFields.length == 0) {
            return res.json({ message: 'No fields to update' });
        }
        values.push(id);
        let query = `UPDATE users set ${updateFields.join(', ')} where user_id = $${index} RETURNING * `;
        let updateUser = await pool.query(query, values);
        return res.json({ user: updateUser.rows[0], message: 'User updated successfully' });

    } catch (err) {
        console.log('While updating employee', err);
        return res.json({ message: 'Internal server error while updating', err });
    }
}

let updateEmployeeLeave = async (req, res) => {
    let {user_id, leaves} = req.body;
    if(!user_id){
       return res.status(401).json({error: "Need User Id"});
    }
    if(!leaves){
       return res.status(401).json({error: "Enter the leave field"});
    }
    try{

        if(req.user.role != 'HR'){
           return res.status(403).json({error: 'Unauthorized'});
        }

        let user_query = `SELECT * FROM users where user_id=${user_id}`;
        let user = await pool.query(user_query);
        if(!user){
           return res.status(404).json({user: "User not found"});
        }
        let update_query = `UPDATE users SET leaves = ${leaves} WHERE user_id=${user_id} RETURNING *`;
        let update_leave = await pool.query(update_query);

       return res.status(200).json({success: 'Leave updated successfully', user: update_leave.rows[0]});

    } catch(error){
        console.log("Internal server error", error);
       return res.status(500).json({error: "Internal server error while updating leaves"});
    }
}
export { getEmployee, updateEmployee, updateEmployeeLeave };