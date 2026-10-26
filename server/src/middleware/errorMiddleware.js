export const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    if (field === 'mobileNumber') {
      message = 'Customer with this mobile number already exists.';
    } else if (field === 'orderNumber') {
      message = 'Order number collision detected. Please retry.';
    } else if (field === 'email') {
      message = 'Email is already registered.';
    } else {
      message = `${field} already exists (Duplicate entry).`;
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid ID provided.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
