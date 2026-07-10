// Network utilities for better error handling, retry logic, and offline detection

export type NetworkStatus = "online" | "offline" | "unknown";

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs
        );
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("enotfound") ||
      message.includes("econnrefused") ||
      message.includes("offline")
    );
  }
  return false;
}

/**
 * Format error message for user display (French)
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("failed to fetch")) {
      return "Problème de connexion. Vérifiez votre internet.";
    }
    if (msg.includes("timeout")) {
      return "La requête a pris trop de temps. Réessayez.";
    }
    if (msg.includes("404") || msg.includes("not found")) {
      return "Données introuvables.";
    }
    if (msg.includes("500") || msg.includes("server")) {
      return "Serveur indisponible. Réessayez plus tard.";
    }
    
    return error.message;
  }
  return "Une erreur est survenue";
}

/**
 * Ping the API to check connectivity
 */
export async function checkApiConnectivity(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const resp = await fetch(`${baseUrl}/ping`, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Check if navigator is online (web/mobile)
 */
export function isOnline(): boolean {
  if (typeof navigator !== "undefined") {
    return navigator.onLine;
  }
  return true;
}
