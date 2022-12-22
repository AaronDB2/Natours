const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handles Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Set Environment Variables Based on config.env
dotenv.config({ path: './config.env' });

// Own Modules
const app = require('./app');

// ------------------------------------------------------------------------------------------

// Replace password in MongoDB Atlas Connection String
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Connect to MongoDB DataBase
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection succesful!'));

const port = process.env.PORT || 3000; // Port Number for Server

// Start Server
const server = app.listen(port, () => {
  console.log(`Running on port: ${port}...`);
});

// Handles Rejected Promises
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLES REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
