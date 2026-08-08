import { AppError } from './errors.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    error: 'NOT_FOUND',
    message: `No route for ${request.method} ${request.path}.`,
  });
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof AppError) {
    return response.status(error.status).json({
      error: error.code,
      message: error.message,
    });
  }

  console.error(error);
  return response.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
}
