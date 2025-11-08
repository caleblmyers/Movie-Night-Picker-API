export function handleError(error: unknown, defaultMessage: string): Error {
  console.error("[ERROR HANDLER] Processing error:", error);
  console.error("[ERROR HANDLER] Default message:", defaultMessage);
  
  if (error instanceof Error) {
    console.error("[ERROR HANDLER] Error name:", error.name);
    console.error("[ERROR HANDLER] Error message:", error.message);
    console.error("[ERROR HANDLER] Error stack:", error.stack);
    return new Error(`${defaultMessage}: ${error.message}`);
  }
  
  console.error("[ERROR HANDLER] Unknown error type:", typeof error);
  return new Error(`${defaultMessage}: Unknown error`);
}
