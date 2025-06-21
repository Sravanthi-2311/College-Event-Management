
// Import the mysql2 library
const mysql = require('mysql');

// Create a connection to the MySQL database
const connection = mysql.createConnection({
  host: 'localhost',     // Database host (change if hosted externally)
  user: 'root',         // Username
  password: null,     // Password
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

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('templates'));


// Set up the static file serving
app.use(express.static(path.join(__dirname, 'templates')));

// Route for serving login page (index)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'loginpage.html'));
});

app.get('/adminevent', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'adminevent.html'));
});

// Serve home page after successful login
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'home.html'));
});

// Serve events page
// Retrieve upcoming events
app.get('/events', (req, res) => {
    const currentDate = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
    connection.query(
      'SELECT * FROM events WHERE event_date >= ?',
      [currentDate],
      (error, results) => {
        if (error) {
          console.error('Error fetching events:', error);
          res.status(500).send('Error fetching events');
        } else {
          res.json(results);
        }
      }
    );    
});

// Serve other static pages
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'about.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'gallery.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.post('/login', (req, res) => {
    const loginType = req.body.loginType;

    // Initialize username and password based on the login type
    let username, password;

    if (loginType === 'cordinator') {
        username = req.body['username'];
        password = req.body['password'];

        const query = 'SELECT * FROM coordinator WHERE username = ?';
        connection.query(query, [username], (err, result) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Server error');
            }

            if (result.length > 0) {
                const coordinator = result[0];  // Assign the result to a variable named coordinator

                if (coordinator.password === password) {
                    return res.redirect('/cordinatorevent.html');
                } else {
                    return res.redirect('/?cordinatorError=Invalid credentials');
                }
            } else {
                return res.redirect('/?cordinatorError=Invalid credentials');
            }
        });
    } else if (loginType === 'admin') {
        username = req.body['username'];
        password = req.body['password'];

        const query = 'SELECT * FROM admin WHERE username = ?';
        connection.query(query, [username], (err, result) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Server error');
            }

            if (result.length > 0) {
                const admin = result[0];  // Assign the result to a variable named admin

                if (admin.password === password) {
                    return res.redirect('/admin.html');
                } else {
                    return res.redirect('/?adminError=Invalid credentials');
                }
            } else {
                return res.redirect('/?adminError=Invalid credentials');
            }
        });
    } else {
        // Handle student login
        username = req.body['username'];
        password = req.body['password'];

        const query = 'SELECT * FROM student WHERE username = ?';
        connection.query(query, [username], (err, result) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Server error');
            }

            if (result.length > 0) {
                const user = result[0];

                if (user.password === password) {
                    return res.redirect('/home');
                } else {
                    return res.redirect('/?studentError=Invalid credentials');
                }
            } else {
                return res.redirect('/?studentError=Invalid credentials');
            }
        });
    }
});


// Handle admin adding a new event
app.post('/registerevent', (req, res) => {
    const { name, rollno, email, sec, department, year } = req.body;

    const query = 'INSERT INTO registrations (name, rollno, email, sec, department, year) VALUES (?, ?, ?, ?, ?, ?)';
    
    connection.query(query, [name, rollno, email, sec, department, year], (err, result) => {
        if (err) {
            console.error('Error registering student for the event:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'chinnu14102004@gmail.com', // Your email
                pass: 'oxbq ifcp zqdp euot'       // App-specific password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: 'chinnu14102004@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYou have successfully registered for the event.\n\nBest Regards,\nEvent Management Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error occurred while sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).json({ success: true });
            }
        });
    });
});


// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const multer = require('multer');
// Set storage engine
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
}).single('event_image');

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Route for adding a coordinator
app.post('/addCoordinator', (req, res) => {
    const { username, password, email, phone } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const query = 'INSERT INTO coordinator (username, password, email, phone) VALUES (?, ?, ?, ?)';
    connection.query(query, [username, password, email, phone], (err, result) => {
        if (err) {
            console.error('Error adding coordinator:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.status(200).json({ success: true, message: 'Coordinator added successfully' });
    });
});

// Route for fetching coordinators
app.get('/getCoordinators', (req, res) => {
    const query = 'SELECT * FROM coordinator';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching coordinators:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json(results);
    });
});

app.post('/addevent', upload, (req, res) => {
    const { name, description, category, event_date, location, start_time, end_time } = req.body;
    const event_image = req.file ? req.file.filename : null;

    if (!name || !description || !category || !event_date || !location || !start_time || !end_time || !event_image) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const query = 'INSERT INTO events (name, description, event_image, category, event_date, location, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(query, [name, description, event_image, category, event_date, location, start_time, end_time], (err, result) => {
        if (err) {
            console.error('Error inserting event:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.status(200).json({ success: true, message: 'Event added successfully' });
    });
});
