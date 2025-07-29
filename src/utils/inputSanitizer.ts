/**
 * Utility functions for input validation and sanitization
 */

// Common XSS patterns to detect
const XSS_PATTERNS = [
  /<script/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /javascript:/i,
  /on\w+=/i,
  /data:text\/html/i,
  /vbscript:/i,
  /mocha:/i,
  /livescript:/i
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /union\s+select/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /update\s+set/i,
  /exec\s*\(/i,
  /script\s*\(/i,
  /declare\s+@/i,
  /xp_cmdshell/i,
  /sp_executesql/i
];

/**
 * Sanitizes text input by removing dangerous characters
 */
export const sanitizeText = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[&]/g, '&amp;') // Escape ampersands
    .substring(0, 500); // Limit length
};

/**
 * Sanitizes email input
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .substring(0, 255); // Limit length
};

/**
 * Validates if input contains XSS attempts
 */
export const containsXSS = (input: string): boolean => {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
};

/**
 * Validates if input contains SQL injection attempts
 */
export const containsSQLInjection = (input: string): boolean => {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

/**
 * Comprehensive input validation
 */
export const isInputSafe = (input: string): { safe: boolean; reason?: string } => {
  if (!input) return { safe: true };
  
  if (containsXSS(input)) {
    return { safe: false, reason: 'Possível tentativa de XSS detectada' };
  }
  
  if (containsSQLInjection(input)) {
    return { safe: false, reason: 'Possível tentativa de SQL injection detectada' };
  }
  
  if (input.length > 1000) {
    return { safe: false, reason: 'Entrada muito longa' };
  }
  
  return { safe: true };
};

/**
 * Validates and sanitizes form data
 */
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized: any = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    }
  }
  
  return sanitized as T;
};

/**
 * Validates CPF format and removes dangerous patterns
 */
export const sanitizeCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  // Remove all non-numeric characters
  const numericOnly = cpf.replace(/\D/g, '');
  
  // Limit to 11 digits
  return numericOnly.substring(0, 11);
};

/**
 * Validates phone format and removes dangerous patterns  
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except parentheses and dash
  const cleaned = phone.replace(/[^\d\(\)\-\s]/g, '');
  
  // Limit length
  return cleaned.substring(0, 20);
};

/**
 * Validates external API data (like ViaCEP)
 */
export const sanitizeViaCEPData = (data: any): any => {
  if (!data || typeof data !== 'object') return null;
  
  const sanitized: any = {};
  
  // Only allow expected fields and sanitize them
  const allowedFields = ['cep', 'logradouro', 'complemento', 'bairro', 'localidade', 'uf'];
  
  for (const field of allowedFields) {
    if (data[field] && typeof data[field] === 'string') {
      const safety = isInputSafe(data[field]);
      if (safety.safe) {
        sanitized[field] = sanitizeText(data[field]);
      } else {
        console.warn(`Unsafe data detected in ViaCEP field ${field}: ${safety.reason}`);
        sanitized[field] = '';
      }
    }
  }
  
  return sanitized;
};