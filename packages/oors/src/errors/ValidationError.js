class ValidationError extends Error {
  constructor(errors, message) {
    super(message || 'Failed validation!');
    this.errors = errors;
    this.code = 'VALIDATION_ERROR';
  }

  // toString() {
  //   return `${this.message}\n${JSON.stringify(this.errors, null, 2)}`;
  // }
}

export default ValidationError;
