/**
 * Componente de Supabase - MÓDULO EN DESARROLLO
 * 
 * Este módulo está preparado para integrar datos de Supabase que se actualizan
 * automáticamente cada 30 minutos desde Jira.
 * 
 * Estado: En desarrollo - No funcional todavía
 * 
 * Para activar este módulo:
 * 1. Configurar variables de entorno (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * 2. Aplicar esquema de base de datos en Supabase
 * 3. Configurar políticas RLS
 * 4. Descomentar el botón en Navbar.jsx
 * 5. Ver documentación en docs/SUPABASE_SETUP.md
 */

import React from 'react';
import { 
  Database, 
  Construction,
  FileText,
  Code
} from 'lucide-react';

const SupabaseTest = () => {
  return (
    <div className="space-y-6">
      {/* Banner de En Desarrollo */}
      <div className="glass rounded-2xl p-8 text-center border-2 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Construction className="w-8 h-8 text-yellow-400" />
          <h2 className="text-3xl font-bold text-white">Módulo Supabase - En Desarrollo</h2>
        </div>
        
        <p className="text-slate-300 text-lg mb-6">
          Este módulo está preparado pero aún no está implementado funcionalmente.
        </p>

        <div className="bg-slate-800/50 rounded-lg p-6 text-left max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            ¿Qué incluye este módulo?
          </h3>
          
          <ul className="space-y-3 text-slate-300 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">✓</span>
              <span><strong>Servicio de API:</strong> <code className="text-cyan-400">src/utils/supabaseApi.js</code> - Funciones para obtener métricas de sprints, desarrolladores, issues, etc.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">✓</span>
              <span><strong>Componente de prueba:</strong> Preparado para mostrar datos de Supabase cuando esté activo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">✓</span>
              <span><strong>Integración con base de datos:</strong> Conecta con Supabase que se actualiza cada 30 min desde Jira</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">✓</span>
              <span><strong>Documentación completa:</strong> Guías de configuración y setup en <code className="text-cyan-400">docs/</code></span>
            </li>
          </ul>

          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-400" />
              Para activar este módulo:
            </h3>
            
            <ol className="space-y-2 text-slate-300 list-decimal list-inside">
              <li>Configurar variables de entorno en <code className="text-cyan-400">.env</code></li>
              <li>Aplicar esquema de base de datos en Supabase (ver <code className="text-cyan-400">docs/supabase/</code>)</li>
              <li>Configurar políticas RLS en Supabase</li>
              <li>Descomentar el botón en <code className="text-cyan-400">Navbar.jsx</code></li>
              <li>Verificar que el servicio de sincronización esté ejecutándose</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <a 
            href="/docs/SUPABASE_SETUP.md" 
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Ver Documentación de Setup
          </a>
        </div>
      </div>

    </div>
  );
};

export default SupabaseTest;
