/**
 * Authentication Service
 * Maneja autenticación y sesiones de usuarios
 */

// Obtener cliente de Supabase desde window (configurado en index.html)
const getSupabase = () => {
    // Intentar obtener desde window (configurado globalmente en index.html)
    if (typeof window !== 'undefined' && window.supabaseClient) {
        return window.supabaseClient;
    }
    
    // Fallback: intentar importar dinámicamente más adelante
    // (no podemos verificar 'import' aquí porque causa problemas en algunos entornos)
    
    return null;
};

// Generar token simple (en producción usar JWT o similar)
const generateToken = () => {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

/**
 * Autenticar usuario con email y password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, user?: object, token?: string, error?: string}>}
 */
export const login = async (email, password) => {
  // Obtener supabase desde window o importar dinámicamente
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      console.error('[AUTH] Error importando supabase:', error);
      return { success: false, error: 'Supabase is not configured' };
    }
  }
  
  if (!supabaseClient) {
    return { success: false, error: 'Supabase no está configurado' };
  }

  try {
    // Normalizar email a minúsculas
    const normalizedEmail = email.toLowerCase().trim();
    
    // Hash simple del password (en producción usar bcrypt o similar)
    // Por ahora, para desarrollo, usamos un hash simple
    const passwordHash = btoa(password); // Base64 encoding (temporal, no seguro para producción)

    // Llamar a la función de autenticación
    const { data, error } = await supabaseClient.rpc('authenticate_user', {
      p_email: normalizedEmail,
      p_password_hash: passwordHash
    });

    if (error) {
      console.error('[AUTH] Error en autenticación:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = data[0];

    // Crear sesión
    const token = generateToken();
    const expiresInHours = 24;

    const { data: sessionData, error: sessionError } = await supabaseClient.rpc('create_session', {
      p_user_id: user.user_id,
      p_token: token,
      p_expires_in_hours: expiresInHours
    });

    if (sessionError) {
      console.error('[AUTH] Error creando sesión:', sessionError);
      return { success: false, error: 'Error creating session' };
    }

    // Guardar en localStorage
    const sessionInfo = {
      token,
      user: {
        id: user.user_id,
        email: user.user_email || user.email, // Soporta ambos nombres por compatibilidad
        displayName: user.display_name,
        role: user.role
      },
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem('auth_session', JSON.stringify(sessionInfo));

    return {
      success: true,
      user: sessionInfo.user,
      token
    };
  } catch (error) {
    console.error('[AUTH] Error en login:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cerrar sesión
 */
export const logout = async () => {
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      // Continuar sin supabase
    }
  }
  
  try {
    const sessionInfo = getSession();
    if (sessionInfo && sessionInfo.token && supabaseClient) {
      await supabaseClient.rpc('logout_session', {
        p_token: sessionInfo.token
      });
    }
  } catch (error) {
    console.error('[AUTH] Error en logout:', error);
  } finally {
    localStorage.removeItem('auth_session');
  }

  return { success: true };
};

/**
 * Obtener sesión actual desde localStorage
 * @returns {object|null}
 */
export const getSession = () => {
  try {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    
    // Verificar si la sesión expiró
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem('auth_session');
      return null;
    }

    return session;
  } catch (error) {
    console.error('[AUTH] Error leyendo sesión:', error);
    return null;
  }
};

/**
 * Validar sesión con el servidor
 * @returns {Promise<{valid: boolean, user?: object}>}
 */
export const validateSession = async () => {
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      console.error('[AUTH] Error importando supabase:', error);
      return { valid: false };
    }
  }
  
  if (!supabaseClient) {
    return { valid: false };
  }

  try {
    const session = getSession();
    if (!session || !session.token) {
      return { valid: false };
    }

    // Validar con el servidor
    const { data, error } = await supabaseClient.rpc('validate_session', {
      p_token: session.token
    });

    if (error || !data || data.length === 0) {
      localStorage.removeItem('auth_session');
      return { valid: false };
    }

    const userData = data[0];
    
    // Actualizar información del usuario en localStorage
    const updatedSession = {
      ...session,
      user: {
        id: userData.user_id,
        email: userData.email,
        displayName: userData.display_name,
        role: userData.role
      }
    };

    localStorage.setItem('auth_session', JSON.stringify(updatedSession));

    return {
      valid: true,
      user: updatedSession.user
    };
  } catch (error) {
    console.error('[AUTH] Error validando sesión:', error);
    return { valid: false };
  }
};

/**
 * Obtener usuario actual
 * @returns {object|null}
 */
export const getCurrentUser = () => {
  const session = getSession();
  return session ? session.user : null;
};

/**
 * Verificar si el usuario tiene un rol específico
 * @param {string} role 
 * @returns {boolean}
 */
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

/**
 * Verificar si el usuario tiene alguno de los roles especificados
 * @param {string[]} roles 
 * @returns {boolean}
 */
export const hasAnyRole = (roles) => {
  const user = getCurrentUser();
  return user && roles.includes(user.role);
};

/**
 * Registrar nuevo usuario
 * @param {string} email 
 * @param {string} password 
 * @param {string} displayName 
 * @param {string} role 
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export const register = async (email, password, displayName, role = 'Regular') => {
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      console.error('[AUTH] Error importando supabase:', error);
      return { success: false, error: 'Supabase is not configured' };
    }
  }
  
  if (!supabaseClient) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const passwordHash = btoa(password);
    
    const { data, error } = await supabaseClient.rpc('register_user', {
      p_email: email,
      p_password_hash: passwordHash,
      p_display_name: displayName,
      p_role: role
    });

    if (error) {
      console.error('[AUTH] Error en registro:', error);
      if (error.message.includes('already registered')) {
        return { success: false, error: 'Email already registered' };
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      userId: data
    };
  } catch (error) {
    console.error('[AUTH] Error en register:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Solicitar recuperación de contraseña
 * @param {string} email 
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export const requestPasswordReset = async (email) => {
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      console.error('[AUTH] Error importando supabase:', error);
      return { success: false, error: 'Supabase is not configured' };
    }
  }
  
  if (!supabaseClient) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // 1. Obtener token de la función SQL
    const { data, error } = await supabaseClient.rpc('request_password_reset', {
      p_email: email
    });

    if (error) {
      console.error('[AUTH] Error solicitando reset:', error);
      return { success: false, error: error.message };
    }

    // Si no hay data, el email no existe (por seguridad no lo revelamos)
    if (!data || data.length === 0) {
      // Por seguridad, siempre retornamos éxito
      return { success: true };
    }

    const { token, display_name } = data[0];

    // Validar que el token existe antes de enviar el email
    if (!token) {
      console.error('[AUTH] Token no generado correctamente');
      // Por seguridad, retornamos éxito aunque no se pueda enviar el email
      return { success: true };
    }

    // 2. Enviar email usando Edge Function
    try {
      const supabaseUrl = supabaseClient.supabaseUrl || window.supabaseUrl || 'https://sywkskwkexwwdzrbwinp.supabase.co';
      const anonKey = supabaseClient.supabaseKey || window.supabaseAnonKey;

      // Validar que todos los parámetros requeridos estén presentes
      if (!email || !token) {
        console.error('[AUTH] Email o token faltante para enviar email');
        return { success: true }; // Por seguridad, no revelar el error
      }

      const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-password-reset-email', {
        body: {
          email: email,
          token: token,
          display_name: display_name || 'User'
        }
      });

      if (emailError) {
        console.error('[AUTH] Error enviando email:', emailError);
        console.error('[AUTH] Detalles del error:', {
          name: emailError.name,
          message: emailError.message,
          status: emailError.status
        });
        // No fallar si el email no se puede enviar, el token ya está creado
        // El usuario puede usar el token directamente si lo tiene
      } else if (emailData) {
        console.log('[AUTH] Email enviado correctamente:', emailData);
      }
    } catch (emailError) {
      console.error('[AUTH] Error llamando Edge Function:', emailError);
      console.error('[AUTH] Stack:', emailError.stack);
      // Continuar aunque falle el envío del email
    }

    // Por seguridad, siempre retornamos éxito (no revelamos si el email existe)
    return { success: true };
  } catch (error) {
    console.error('[AUTH] Error en requestPasswordReset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resetear contraseña con token
 * @param {string} token 
 * @param {string} newPassword 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetPassword = async (token, newPassword) => {
  let supabaseClient = getSupabase();
  
  if (!supabaseClient) {
    try {
      const supabaseModule = await import('./supabaseApi.js');
      supabaseClient = supabaseModule.supabase;
    } catch (error) {
      console.error('[AUTH] Error importando supabase:', error);
      return { success: false, error: 'Supabase is not configured' };
    }
  }
  
  if (!supabaseClient) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const passwordHash = btoa(newPassword);
    
    const { data, error } = await supabaseClient.rpc('reset_password', {
      p_token: token,
      p_new_password_hash: passwordHash
    });

    if (error) {
      console.error('[AUTH] Error reseteando contraseña:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Invalid or expired token' };
    }

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Error en resetPassword:', error);
    return { success: false, error: error.message };
  }
};
