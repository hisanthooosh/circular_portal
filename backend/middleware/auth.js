const jwt = require('jsonwebtoken');

// This function will be our "security guard"
module.exports = function(req, res, next) {
    // Get the token from the request header
    const token = req.header('x-auth-token');

    // Check if there's no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // If there is a token, verify it
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Add the user's info (id, role) to the request object
        next(); // The user is valid, proceed to the next step (the actual API route)
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
