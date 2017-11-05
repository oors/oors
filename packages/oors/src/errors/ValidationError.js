class ValidationError extends Error {
  constructor(errors, message) {
    super(message || 'Failed validation!');
    this.errors = errors;
    this.code = 'VALIDATION_ERROR';
    Error.captureStackTrace(this, ValidationError);
  }
}

export default ValidationError;
