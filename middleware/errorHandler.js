// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log error stack ke console server untuk debugging

  const statusCode = err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan internal server.";

  res.status(statusCode).json({
    success: false,
    message: message,
    // Di lingkungan produksi, Anda mungkin tidak ingin mengirim detail error.
    // if (process.env.NODE_ENV === 'development') {
    //   response.error = err.message;
    //   response.stack = err.stack;
    // }
  });
};

module.exports = errorHandler;
