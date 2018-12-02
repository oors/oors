class ErrorWrapper extends Error {
  constructor(error, message) {
    super(message, error.message);
    this.error = error;
    Error.captureStackTrace(this, ErrorWrapper);
  }

  toString() {
    return `${this.message}\n${this.error.toString()}`;
  }
}

export default ErrorWrapper;
