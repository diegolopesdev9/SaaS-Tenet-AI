
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Plus, Trash2, Loader2, AlertCircle, CheckCircle, 
  User, Key, Eye, EyeOff, Copy, Settings, Users, MessageSquare,
  Edit2, X, Save, UserPlus, UserX, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

export default function Agencias() {
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  
  // Modal de edição
  const [editingAgencia, setEditingAgencia] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', instance_name: '', whatsapp_phone_id: '' });
  
  // Modal de usuários
  const [viewingUsers, setViewingUsers] = useState(null);
  const [agencyUsers, setAgencyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ nome: '', email: '', senha: '', role: 'admin' });
  
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    instance_name: '',
    whatsapp_phone_id: '',
    admin_nome: '',
    admin_email: '',
    admin_senha: ''
  });

  useEffect(() => {
    loadAgencias();
  }, []);

  const loadAgencias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/agencias');
      setAgencias(response.data);
    } catch (error) {
      console.error('Erro ao carregar agências:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar agências' });
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copiado!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setCreatedUser(null);

    try {
      const response = await api.post('/admin/agencias', {
        nome: form.nome,
        email: form.email,
        instance_name: form.instance_name,
        whatsapp_phone_id: form.whatsapp_phone_id,
        admin_nome: form.admin_nome,
        admin_email: form.admin_email,
        admin_senha: form.admin_senha
      });
      
      if (response.data.usuario) {
        setCreatedUser({
          email: form.admin_email,
          senha: form.admin_senha,
          nome: form.admin_nome
        });
      }
      
      setMessage({ type: 'success', text: 'Agência e usuário admin criados com sucesso!' });
      setForm({ nome: '', email: '', instance_name: '', whatsapp_phone_id: '', admin_nome: '', admin_email: '', admin_senha: '' });
      setShowForm(false);
      loadAgencias();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao criar agência' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja deletar a agência "${nome}"?\n\nIsso também removerá todos os usuários e conversas vinculados.`)) return;

    try {
      await api.delete(`/admin/agencias/${id}`);
      setMessage({ type: 'success', text: 'Agência deletada!' });
      loadAgencias();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao deletar agência' });
    }
  };

  const handleConfigureAgency = (agencyId) => {
    localStorage.setItem('selectedAgencyId', agencyId);
    navigate('/config');
    window.location.reload();
  };

  // Funções de edição
  const openEditModal = (agencia) => {
    setEditingAgencia(agencia);
    setEditForm({
      nome: agencia.nome || '',
      email: agencia.email || '',
      instance_name: agencia.instance_name || '',
      whatsapp_phone_id: agencia.whatsapp_phone_id || ''
    });
  };

  const handleUpdateAgencia = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/agencias/${editingAgencia.id}`, editForm);
      setMessage({ type: 'success', text: 'Agência atualizada!' });
      setEditingAgencia(null);
      loadAgencias();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao atualizar' });
    } finally {
      setSaving(false);
    }
  };

  // Funções de usuários
  const openUsersModal = async (agencia) => {
    setViewingUsers(agencia);
    setLoadingUsers(true);
    try {
      const response = await api.get(`/admin/agencias/${agencia.id}/usuarios`);
      setAgencyUsers(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar usuários' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/usuarios', {
        ...newUserForm,
        password: newUserForm.senha,
        agencia_id: viewingUsers.id
      });
      setMessage({ type: 'success', text: 'Usuário criado!' });
      setShowAddUser(false);
      setNewUserForm({ nome: '', email: '', senha: '', role: 'admin' });
      openUsersModal(viewingUsers);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao criar usuário' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await api.patch(`/admin/usuarios/${userId}/toggle`);
      openUsersModal(viewingUsers);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar status' });
    }
  };

  const handleDeleteUser = async (userId, nome) => {
    if (!confirm(`Deletar usuário "${nome}"?`)) return;
    try {
      await api.delete(`/admin/usuarios/${userId}`);
      setMessage({ type: 'success', text: 'Usuário deletado!' });
      openUsersModal(viewingUsers);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao deletar usuário' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Agências</h1>
          <p className="text-gray-600">Crie e gerencie as agências do sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreatedUser(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Agência
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

      {/* Card com credenciais do usuário criado */}
      {createdUser && (
        <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Credenciais do Usuário Admin</h3>
              <p className="text-sm text-amber-600">Guarde essas informações!</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Nome</label>
              <code className="block px-3 py-2 bg-white border border-amber-200 rounded text-sm">{createdUser.nome}</code>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded text-sm">{createdUser.email}</code>
                <button onClick={() => copyToClipboard(createdUser.email)} className="p-2 hover:bg-amber-100 rounded">
                  <Copy className="w-4 h-4 text-amber-600" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Senha Temporária</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded text-sm font-bold">{createdUser.senha}</code>
                <button onClick={() => copyToClipboard(createdUser.senha)} className="p-2 hover:bg-amber-100 rounded">
                  <Copy className="w-4 h-4 text-amber-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulário Nova Agência */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nova Agência</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Dados da Agência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name *</label>
                  <input type="text" value={form.instance_name} 
                    onChange={(e) => setForm({ ...form, instance_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone ID</label>
                  <input type="text" value={form.whatsapp_phone_id} onChange={(e) => setForm({ ...form, whatsapp_phone_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Usuário Administrador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={form.admin_nome} onChange={(e) => setForm({ ...form, admin_nome: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type={showPassword ? 'text' : 'password'} value={form.admin_senha}
                        onChange={(e) => setForm({ ...form, admin_senha: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="button" onClick={() => setForm({ ...form, admin_senha: generatePassword() })}
                      className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Gerar</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Agência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela de Agências */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agência</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Usuários</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conversas</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qualificados</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {agencias.map((agencia) => (
              <tr key={agencia.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{agencia.nome}</span>
                      <p className="text-xs text-gray-500">{agencia.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">{agencia.instance_name || '-'}</code>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => openUsersModal(agencia)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100">
                    <Users className="w-4 h-4" />
                    {agencia.total_usuarios || 0}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    <MessageSquare className="w-4 h-4" />
                    {agencia.total_conversas || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {agencia.total_qualificados || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {agencia.created_at ? new Date(agencia.created_at).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEditModal(agencia)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleConfigureAgency(agencia.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Configurar">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(agencia.id, agencia.nome)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Deletar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {agencias.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Nenhuma agência cadastrada</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Agência */}
      {editingAgencia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Editar Agência</h2>
              <button onClick={() => setEditingAgencia(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name</label>
                <input type="text" value={editForm.instance_name} onChange={(e) => setEditForm({ ...editForm, instance_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone ID</label>
                <input type="text" value={editForm.whatsapp_phone_id} onChange={(e) => setEditForm({ ...editForm, whatsapp_phone_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setEditingAgencia(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleUpdateAgencia} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usuários da Agência */}
      {viewingUsers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Usuários - {viewingUsers.nome}</h2>
                <p className="text-sm text-gray-500">{agencyUsers.length} usuário(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddUser(!showAddUser)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <UserPlus className="w-4 h-4" /> Adicionar
                </button>
                <button onClick={() => setViewingUsers(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Novo Usuário */}
            {showAddUser && (
              <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Novo Usuário</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Nome" value={newUserForm.nome}
                    onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })}
                    className="px-3 py-2 border rounded-lg" required />
                  <input type="email" placeholder="Email" value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="px-3 py-2 border rounded-lg" required />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Senha" value={newUserForm.senha}
                      onChange={(e) => setNewUserForm({ ...newUserForm, senha: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg" required minLength={6} />
                    <button type="button" onClick={() => setNewUserForm({ ...newUserForm, senha: generatePassword() })}
                      className="px-3 py-2 bg-gray-200 rounded-lg text-sm">Gerar</button>
                  </div>
                  <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="px-3 py-2 border rounded-lg">
                    <option value="admin">Admin</option>
                    <option value="user">Usuário</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button type="button" onClick={() => setShowAddUser(false)} className="px-3 py-2 border rounded-lg">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded-lg">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
                  </button>
                </div>
              </form>
            )}

            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {agencyUsers.map((user) => (
                  <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg border ${user.ativo ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <User className={`w-5 h-5 ${user.role === 'admin' ? 'text-purple-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{user.nome}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {user.role}
                      </span>
                      {user.deve_alterar_senha && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Senha temporária</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggleUser(user.id)}
                        className={`p-2 rounded-lg ${user.ativo ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={user.ativo ? 'Desativar' : 'Ativar'}>
                        {user.ativo ? <UserX className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id, user.nome)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Deletar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {agencyUsers.length === 0 && (
                  <p className="text-center py-8 text-gray-500">Nenhum usuário encontrado</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
