import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Shield, Mail, User, Clock } from 'lucide-react';
import { supabase } from '../utils/supabaseApi';

const UserAdministration = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            if (!supabase) {
                setError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
                setLoading(false);
                return;
            }

            console.log('[USER ADMIN] 🔍 Intentando cargar usuarios desde producción...');

            // Intentar primero con app_users (mencionado en el hint de producción)
            console.log('[USER ADMIN] 1️⃣ Intentando tabla app_users...');
            let { data, error: fetchError } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('[USER ADMIN] app_users Result:', { 
                hasData: !!data, 
                dataLength: data?.length || 0,
                error: fetchError ? {
                    message: fetchError.message,
                    code: fetchError.code,
                    hint: fetchError.hint
                } : null
            });

            // Si app_users funciona, mapear al formato esperado
            if (!fetchError && data) {
                console.log('[USER ADMIN] ✅ Usando app_users!');
                data = data.map(user => ({
                    id: user.id,
                    email: user.email,
                    display_name: user.display_name || user.name || user.email?.split('@')[0] || 'Unknown',
                    role: user.role || 'Regular',
                    is_active: user.is_active !== undefined ? user.is_active : (user.status === 'active'),
                    last_login_at: user.last_login_at || user.last_sign_in_at || user.updated_at,
                    created_at: user.created_at
                }));
            } else {
                // Si falla, intentar RPC (por si existe en producción)
                console.log('[USER ADMIN] 2️⃣ app_users falló, intentando RPC get_all_users...');
                const rpcResult = await supabase.rpc('get_all_users');
                
                if (!rpcResult.error && rpcResult.data) {
                    console.log('[USER ADMIN] ✅ Usando RPC!');
                    data = rpcResult.data;
                    fetchError = null;
                } else {
                    fetchError = rpcResult.error || fetchError;
                }
            }

            if (fetchError) {
                const errorMsg = fetchError.message || 'Unknown error';
                const errorCode = fetchError.code || '';
                
                console.error('[USER ADMIN] ❌ Error completo:', {
                    message: errorMsg,
                    code: errorCode,
                    hint: fetchError.hint
                });

                // Mensaje simple sin sugerencias de modificar la BD
                setError(
                    `No se pudo cargar usuarios desde Supabase.\n\n` +
                    `Error: ${errorCode} - ${errorMsg}\n\n` +
                    `Verifica que la tabla 'app_users' exista en producción\n` +
                    `o que la función RPC 'get_all_users' esté disponible.`
                );
                return;
            }

            console.log('[USER ADMIN] ✅ Usuarios cargados:', data?.length || 0);
            setUsers(data || []);
        } catch (err) {
            console.error('[USER ADMIN] ❌ Exception:', err);
            setError('Error loading users: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        setError('');
        setSuccess('');
        try {
            const { error: approveError } = await supabase.rpc('approve_user', {
                p_user_id: userId
            });

            if (approveError) {
                setError(approveError.message);
                return;
            }

            setSuccess('User approved successfully');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('[USER ADMIN] Error approving user:', err);
            setError('Error approving user: ' + (err.message || 'Unknown error'));
        }
    };

    const handleDeactivate = async (userId) => {
        setError('');
        setSuccess('');
        if (!confirm('Are you sure you want to deactivate this user? They will be logged out immediately.')) {
            return;
        }

        try {
            const { error: deactivateError } = await supabase.rpc('deactivate_user', {
                p_user_id: userId
            });

            if (deactivateError) {
                setError(deactivateError.message);
                return;
            }

            setSuccess('User deactivated successfully');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('[USER ADMIN] Error deactivating user:', err);
            setError('Error deactivating user: ' + (err.message || 'Unknown error'));
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setError('');
        setSuccess('');
        try {
            const { error: roleError } = await supabase.rpc('update_user_role', {
                p_user_id: userId,
                p_new_role: newRole
            });

            if (roleError) {
                setError(roleError.message);
                return;
            }

            setSuccess('User role updated successfully');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('[USER ADMIN] Error updating role:', err);
            setError('Error updating role: ' + (err.message || 'Unknown error'));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="text-cyan-400" size={28} />
                    <h2 className="text-2xl font-bold text-slate-200">User Administration</h2>
                </div>
                <button
                    onClick={loadUsers}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="flex flex-col gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    <div className="flex items-start gap-2 text-rose-400 text-sm">
                        <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 whitespace-pre-line">{error}</div>
                    </div>
                    <button
                        onClick={() => {
                            setError('');
                            loadUsers();
                        }}
                        className="self-start px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 rounded-lg text-rose-300 text-sm transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    <CheckCircle size={16} />
                    <span>{success}</span>
                </div>
            )}

            <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">User</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Role</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Last Login</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Created</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-slate-400" />
                                                <div>
                                                    <div className="text-slate-200 font-medium">{user.display_name}</div>
                                                    <div className="text-slate-400 text-xs flex items-center gap-1">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="px-2 py-1 bg-slate-700 border border-white/10 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50"
                                            >
                                                <option value="Regular">Regular</option>
                                                <option value="PM">PM</option>
                                                <option value="Stakeholder">Stakeholder</option>
                                                <option value="3amigos">3amigos</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                                user.is_active
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                            }`}>
                                                {user.is_active ? (
                                                    <>
                                                        <CheckCircle size={12} />
                                                        Active
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle size={12} />
                                                        Pending Approval
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatDate(user.last_login_at)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {!user.is_active ? (
                                                    <button
                                                        onClick={() => handleApprove(user.id)}
                                                        className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Approve
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeactivate(user.id)}
                                                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-sm transition-colors flex items-center gap-1"
                                                    >
                                                        <XCircle size={14} />
                                                        Deactivate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserAdministration;
