// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const circularRoutes = require('./routes/circulars');
const systemRoutes = require('./routes/systems');
const userRoutes = require('./routes/users'); // This line is added
const signatoryRoutes = require('./routes/signatories'); // Add this line

// Initialize the app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
    serverApi: { version: '1', strict: true, deprecationErrors: true }
})
    .then(() => console.log('Successfully connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
// This tells the server to use our route files
app.use('/api/auth', authRoutes);
app.use('/api/circulars', circularRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/users', userRoutes); // This line is added
app.use('/api/signatories', signatoryRoutes); // Add this line

app.get('/', (req, res) => {
    res.send('Circular Portal Backend is running!');
});

// --- Start the Server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

