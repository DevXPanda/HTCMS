/**
 * Global Error Handler Middleware
 * Handles all errors and sends appropriate responses
 */
export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error('Error:', err);

    // Sequelize Validation Error
    if (err.name === 'SequelizeValidationError') {
        const message = Object.values(err.errors).map(e => e.message).join(', ');
        error = {
            statusCode: 400,
            message: `Validation Error: ${message}`
        };
    }

    // Sequelize Unique Constraint Error
    if (err.name === 'SequelizeUniqueConstraintError') {
        const message = Object.values(err.errors).map(e => e.message).join(', ');
        error = {
            statusCode: 400,
            message: `Duplicate Entry: ${message}`
        };
    }

    // Sequelize Foreign Key Constraint Error
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        error = {
            statusCode: 400,
            message: 'Referenced record does not exist'
        };
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        error = {
            statusCode: 401,
            message: 'Invalid token'
        };
    }

    if (err.name === 'TokenExpiredError') {
        error = {
            statusCode: 401,
            message: 'Token expired'
        };
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
