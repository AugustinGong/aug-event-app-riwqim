
import { Platform } from "react-native";
import * as Crypto from 'expo-crypto';

// Error tracking with automatic cleanup
const errorTracker = new Map<string, NodeJS.Timeout>();

export const clearErrorAfterDelay = (errorKey: string) => {
  if (errorTracker.has(errorKey)) {
    clearTimeout(errorTracker.get(errorKey)!);
  }
  
  const timeout = setTimeout(() => {
    errorTracker.delete(errorKey);
  }, 5000); // Clear after 5 seconds
  
  errorTracker.set(errorKey, timeout);
};

export const sendErrorToParent = (level: string, message: string, data?: any) => {
  const errorKey = `${level}-${message}`;
  
  if (errorTracker.has(errorKey)) {
    return; // Prevent duplicate errors
  }
  
  console.log(`[${level.toUpperCase()}] ${message}`, data);
  clearErrorAfterDelay(errorKey);
};

export const extractSourceLocation = (stack: string): string => {
  const lines = stack.split('\n');
  for (const line of lines) {
    if (line.includes('at ') && !line.includes('node_modules')) {
      return line.trim();
    }
  }
  return 'Unknown location';
};

export const getCallerInfo = (): string => {
  try {
    const stack = new Error().stack || '';
    return extractSourceLocation(stack);
  } catch {
    return 'Unable to determine caller';
  }
};

export const generateSecurePassword = async (length: number = 6): Promise<string> => {
  try {
    // Ensure minimum length of 4 characters
    const actualLength = Math.max(length, 4);
    
    // Generate random bytes
    const randomBytes = await Crypto.getRandomBytesAsync(actualLength);
    
    // Convert to alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < actualLength; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    
    return password;
  } catch (error) {
    console.log('Error generating secure password:', error);
    // Fallback to timestamp-based password
    const timestamp = Date.now().toString();
    return timestamp.slice(-6).toUpperCase();
  }
};
