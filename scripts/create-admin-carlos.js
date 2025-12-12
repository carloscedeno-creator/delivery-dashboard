/**
 * Script para crear usuario admin: Carlos Cedeño
 * Ejecuta el INSERT directamente en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: Supabase URL o Anon Key no configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
    console.log('🚀 Creando usuario admin: Carlos Cedeño...\n');

    try {
        // Datos del usuario
        const email = 'carlos.cedeno@agenticdream.com';
        const passwordHash = 'TWlyYW5kYSoxNA=='; // Base64 de 'Miranda*14'
        const displayName = 'Carlos Cedeño';
        const role = 'admin';

        // Insertar o actualizar usuario usando la función create_user
        const { data: userData, error: userError } = await supabase.rpc('create_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_display_name: displayName,
            p_role: role
        });

        if (userError) {
            // Si la función no existe o falla, intentar INSERT directo
            console.log('⚠️  Función create_user no disponible, usando INSERT directo...');
            
            const { data, error } = await supabase
                .from('app_users')
                .upsert({
                    email: email,
                    password_hash: passwordHash,
                    display_name: displayName,
                    role: role,
                    is_active: true
                }, {
                    onConflict: 'email'
                })
                .select();

            if (error) {
                console.error('❌ Error creando usuario:', error);
                throw error;
            }

            console.log('✅ Usuario creado/actualizado exitosamente!');
            console.log('\n📋 Detalles del usuario:');
            console.log('   ID:', data[0].id);
            console.log('   Email:', data[0].email);
            console.log('   Display Name:', data[0].display_name);
            console.log('   Role:', data[0].role);
            console.log('   Active:', data[0].is_active);
            console.log('   Created:', data[0].created_at);
        } else {
            console.log('✅ Usuario creado exitosamente usando función create_user!');
            console.log('   User ID:', userData);
            
            // Verificar usuario creado
            const { data: verifyData, error: verifyError } = await supabase
                .from('app_users')
                .select('id, email, display_name, role, is_active, created_at')
                .eq('email', email)
                .single();

            if (!verifyError && verifyData) {
                console.log('\n📋 Detalles del usuario:');
                console.log('   ID:', verifyData.id);
                console.log('   Email:', verifyData.email);
                console.log('   Display Name:', verifyData.display_name);
                console.log('   Role:', verifyData.role);
                console.log('   Active:', verifyData.is_active);
                console.log('   Created:', verifyData.created_at);
            }
        }

        console.log('\n🎉 ¡Usuario admin creado exitosamente!');
        console.log('\n📝 Credenciales de acceso:');
        console.log('   Email: carlos.cedeno@agenticdream.com');
        console.log('   Password: Miranda*14');
        console.log('   Role: admin\n');

    } catch (error) {
        console.error('❌ Error ejecutando script:', error);
        console.error('   Mensaje:', error.message);
        if (error.details) {
            console.error('   Detalles:', error.details);
        }
        process.exit(1);
    }
}

// Ejecutar
createAdminUser();
