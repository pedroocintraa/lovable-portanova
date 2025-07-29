import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RateLimitError {
  message: string;
  retryAfter?: number;
}

export const useAuthSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  const validateInput = useCallback((email: string, password: string): string[] => {
    const errors: string[] = [];
    
    // Email validation
    if (!email.trim()) {
      errors.push('Email é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email inválido');
    }
    
    // Password validation
    if (!password) {
      errors.push('Senha é obrigatória');
    } else if (password.length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres');
    }
    
    // Check for common injection patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i
    ];
    
    const combinedInput = `${email} ${password}`;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(combinedInput)) {
        errors.push('Entrada contém caracteres não permitidos');
        break;
      }
    }
    
    return errors;
  }, []);

  const sanitizeInput = useCallback((input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .substring(0, 255); // Limit length
  }, []);

  const checkRateLimit = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_ip: '0.0.0.0', // Browser can't get real IP, server-side would be better
        p_email: email
      });
      
      if (error) {
        console.warn('Rate limit check failed:', error);
        return true; // Allow if check fails to avoid blocking legitimate users
      }
      
      return data === true;
    } catch (error) {
      console.warn('Rate limit check error:', error);
      return true;
    }
  }, []);

  const logLoginAttempt = useCallback(async (email: string, success: boolean) => {
    try {
      await supabase.rpc('log_login_attempt', {
        p_ip: '0.0.0.0',
        p_email: email,
        p_success: success
      });
    } catch (error) {
      console.warn('Failed to log login attempt:', error);
    }
  }, []);

  const secureLogin = useCallback(async (email: string, password: string) => {
    // Client-side rate limiting
    if (isBlocked) {
      throw new Error('Muitas tentativas de login. Tente novamente em 15 minutos.');
    }
    
    // Input validation
    const validationErrors = validateInput(email, password);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0]);
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);
    
    // Server-side rate limiting check
    const isAllowed = await checkRateLimit(sanitizedEmail);
    if (!isAllowed) {
      await logLoginAttempt(sanitizedEmail, false);
      throw new Error('Muitas tentativas de login. Tente novamente em 1 hora.');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword
      });
      
      if (error) {
        await logLoginAttempt(sanitizedEmail, false);
        
        // Increment client-side attempt counter
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsBlocked(true);
          setTimeout(() => {
            setIsBlocked(false);
            setLoginAttempts(0);
          }, BLOCK_DURATION);
          
          throw new Error('Muitas tentativas incorretas. Conta temporariamente bloqueada.');
        }
        
        throw new Error('Email ou senha incorretos');
      }
      
      // Success - reset attempts and log
      setLoginAttempts(0);
      setIsBlocked(false);
      await logLoginAttempt(sanitizedEmail, true);
      
      return { data, error: null };
    } catch (error: any) {
      throw error;
    }
  }, [loginAttempts, isBlocked, validateInput, sanitizeInput, checkRateLimit, logLoginAttempt]);

  return {
    secureLogin,
    validateInput,
    sanitizeInput,
    isBlocked,
    loginAttempts,
    remainingAttempts: MAX_ATTEMPTS - loginAttempts
  };
};