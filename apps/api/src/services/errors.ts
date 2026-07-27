/** Maps to a 400 response in the controller layer. */
export class ValidationError extends Error {}

/** Maps to a 404 response. */
export class NotFoundError extends Error {}

/** Maps to a 403 response. */
export class ForbiddenError extends Error {}
