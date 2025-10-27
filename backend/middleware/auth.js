const jwt = require('jsonwebtoken');

// This function will be our "security guard"
module.exports = function (req, res, next) {
    // Log entry point and the route being accessed
    console.log(`--- authMiddleware checking route: ${req.method} ${req.originalUrl} ---`);

    // Get the token from the request header
    const token = req.header('x-auth-token');

    // Check if there's no token
    if (!token) {
        console.log("AuthMiddleware: No token found."); // Log no token case
        // Don't send response yet, maybe some routes don't require auth?
        // Let specific routes handle required auth. For now, just call next()
        // Or, if ALL protected routes use this, then send 401:
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // If there is a token, verify it
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Basic check if decoded structure is as expected
        if (!decoded || !decoded.user || !decoded.user.id || !decoded.user.role) {
            console.log("AuthMiddleware: Token decoded but structure is invalid.", decoded);
            return res.status(401).json({ message: 'Token is not valid (invalid structure)' });
        }

        req.user = decoded.user; // Add the user's info (id, role, name) to the request object

        // Log successful validation
        console.log(`AuthMiddleware: Token valid. User ID: ${req.user.id}, Role: ${req.user.role}`);

        next(); // The user is valid, proceed to the next step (the actual API route)

    } catch (err) {
        // Log the specific error during verification (e.g., expired, malformed)
        console.log("AuthMiddleware: Token is invalid.", err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

