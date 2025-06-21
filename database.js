const mysql = require('mysql');

// Create a connection to the MySQL database
const connection = mysql.createConnection({
  host: 'localhost',     // Database host (change if hosted externally)
  user: 'admin',         // Username
  password: 'admin',     // Password
  database: 'de'       // Database name
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the MySQL database as id', connection.threadId);
});

// Close the connection (optional)
// connection.end();