export function handleError(error: unknown, defaultMessage: string): Error {
  if (error instanceof Error) {
    return new Error(`${defaultMessage}: ${error.message}`);
  }
  return new Error(`${defaultMessage}: Unknown error`);
}

