import express from 'express';
import dotenv from 'dotenv';
import userRouter from './routes/userRoutes.js';
import employeesRouter from './routes/employeeRoute.js';

const app = express();
dotenv.config();

app.use(express.json());
app.use('/user', userRouter);
app.use('/employee', employeesRouter);

app.listen(process.env.PORT, () => {
    console.log(`Server Started on http://localhost:${process.env.PORT}`);
})

