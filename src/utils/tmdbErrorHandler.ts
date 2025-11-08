interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: {
      status_message?: string;
    };
  };
  message?: string;
}

export function handleTMDBError(
  error: unknown,
  defaultMessage: string
): Error {
  const axiosError = error as AxiosErrorResponse;
  
  if (axiosError.response) {
    const statusMessage =
      axiosError.response.data?.status_message || axiosError.message;
    return new Error(
      `TMDB API error: ${axiosError.response.status} - ${statusMessage}`
    );
  }
  
  const errorMessage =
    axiosError.message || (error instanceof Error ? error.message : "Unknown error");
  return new Error(`${defaultMessage}: ${errorMessage}`);
}
