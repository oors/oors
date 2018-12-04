class ErrorWrapper extends Error {
  constructor(error, message, props = {}) {
    super(message, error.message);
    this.error = error;
    Error.captureStackTrace(this, ErrorWrapper);
    Object.assign(this, props);
  }

  toString() {
    return `${this.message}\n${this.error.toString()}`;
  }
}

export default ErrorWrapper;
