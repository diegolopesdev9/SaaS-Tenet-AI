import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Settings, X, Save, Eye, EyeOff, Key } from 'lucide-react';
import api from '../../services/api';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [tenets, setTenets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal de edição
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    role: '',
    tenet_id: '',
    nova_senha: '',
    forcar_troca_senha: true
  });
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    tenet_id: '',
    role: 'admin'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosRes, tenetsRes] = await Promise.all([
        api.get('/admin/usuarios'),
        api.get('/admin/agencias')
      ]);
      setUsuarios(usuariosRes.data);
      setTenets(tenetsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.post('/admin/usuarios', form);
      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
      setForm({ nome: '', email: '', password: '', tenet_id: '', role: 'admin' });
      setShowForm(false);
      loadData();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Erro ao criar usuário' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/admin/usuarios/${id}/toggle`);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar status' });
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${nome}"?`)) return;

    try {
      await api.delete(`/admin/usuarios/${id}`);
      setMessage({ type: 'success', text: 'Usuário deletado!' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao deletar usuário' });
    }
  };

  const getTenetNome = (tenetId) => {
    const tenet = tenets.find(a => a.id === tenetId);
    return tenet?.nome || '-';
  };

  // Funções de edição
  const openEditModal = (usuario) => {
    setEditingUser(usuario);
    setEditForm({
      nome: usuario.nome || '',
      email: usuario.email || '',
      role: usuario.role || 'admin',
      tenet_id: usuario.tenet_id || '',
      nova_senha: '',
      forcar_troca_senha: true
    });
    setShowPassword(false);
  };

  const handleUpdateUser = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const dataToSend = {
        nome: editForm.nome,
        email: editForm.email,
        role: editForm.role,
        tenet_id: editForm.tenet_id || null
      };

      // Só envia senha se foi preenchida
      if (editForm.nova_senha) {
        dataToSend.nova_senha = editForm.nova_senha;
        dataToSend.forcar_troca_senha = editForm.forcar_troca_senha;
      }

      await api.patch(`/admin/usuarios/${editingUser.id}`, dataToSend);
      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
      setEditingUser(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao atualizar usuário' });
    } finally {
      setSaving(false);
    }
  };

  // Mock function for formatDate if it's not defined elsewhere
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Carregando dados</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="mt-1 text-sm text-gray-400">Gerencie os usuários do tenet</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black rounded-lg hover:from-cyan-600 hover:to-cyan-700 font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Novo Usuário</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenet</label>
              <select
                value={form.tenet_id}
                onChange={(e) => setForm({ ...form, tenet_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um Tenet</option>
                {tenets.map((tenet) => (
                  <option key={tenet.id} value={tenet.id}>{tenet.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin do Tenet</option>
                <option value="user">Usuário</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#2D2D2D] rounded-lg shadow-sm border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1A1A1A] border-b border-white/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tenet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-[#2D2D2D] divide-y divide-white/10">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium">
                        {usuario.nome?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{usuario.nome}</div>
                      <div className="text-sm text-gray-500">{usuario.email}</div>
                    </div>
                    {usuario.deve_alterar_senha && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                        Senha temp.
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{getTenetNome(usuario.tenet_id)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    usuario.role === 'super_admin' 
                      ? 'bg-red-500/20 text-red-400'
                      : usuario.role === 'admin'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {usuario.role === 'super_admin' ? 'Super Admin' : usuario.role === 'admin' ? 'Admin do Tenet' : 'Usuário'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggle(usuario.id)}
                    disabled={usuario.role === 'super_admin'}
                    className="disabled:opacity-50"
                  >
                    {usuario.ativo ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-500" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(usuario)}
                      className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
                      title="Editar usuário"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id, usuario.nome)}
                      disabled={usuario.role === 'super_admin'}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
                      title="Deletar usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2D2D2D] rounded-xl shadow-xl max-w-lg w-full p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Editar Usuário</h2>
                <p className="text-sm text-gray-400">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={editForm.nome} 
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 bg-[#1A1A1A] text-white" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 bg-[#1A1A1A] text-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tenet</label>
                  <select 
                    value={editForm.tenet_id} 
                    onChange={(e) => setEditForm({ ...editForm, tenet_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-[#1A1A1A] text-white"
                    disabled={editingUser.role === 'super_admin'}
                  >
                    <option value="">Sem Tenet</option>
                    {tenets.map((tenet) => (
                      <option key={tenet.id} value={tenet.id}>{tenet.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nível de Acesso</label>
                  <select 
                    value={editForm.role} 
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 bg-[#1A1A1A] text-white"
                    disabled={editingUser.role === 'super_admin'}
                  >
                    <option value="admin">Admin do Tenet</option>
                    <option value="user">Usuário</option>
                  </select>
                </div>
              </div>

              {/* Seção de Reset de Senha */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Resetar Senha</span>
                  <span className="text-xs text-gray-500">(deixe em branco para manter a atual)</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={editForm.nova_senha} 
                      onChange={(e) => setEditForm({ ...editForm, nova_senha: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-cyan-500 bg-[#1A1A1A] text-white"
                      placeholder="Nova senha (mín. 6 caracteres)"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, nova_senha: generatePassword() })}
                    className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap text-white"
                  >
                    Gerar
                  </button>
                </div>

                {editForm.nova_senha && (
                  <label className="flex items-center gap-2 mt-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={editForm.forcar_troca_senha}
                      onChange={(e) => setEditForm({ ...editForm, forcar_troca_senha: e.target.checked })}
                      className="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    Forçar troca de senha no próximo login
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => setEditingUser(null)} 
                className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-700 text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateUser} 
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 font-medium shadow-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}