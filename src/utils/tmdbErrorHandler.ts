export function handleTMDBError(error: any, defaultMessage: string): Error {
  if (error.response) {
    const statusMessage =
      error.response.data?.status_message || error.message;
    return new Error(
      `TMDB API error: ${error.response.status} - ${statusMessage}`
    );
  }
  return new Error(
    `${defaultMessage}: ${error.message || 'Unknown error'}`
  );
}

