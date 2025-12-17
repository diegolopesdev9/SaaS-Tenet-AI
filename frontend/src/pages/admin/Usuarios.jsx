
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Loader2, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Settings } from 'lucide-react';
import api from '../../services/api';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    agencia_id: '',
    role: 'admin'
  });

  const navigate = useNavigate();

  const handleConfigureAgency = (agenciaId) => {
    if (!agenciaId) return;
    localStorage.setItem('selectedAgencyId', agenciaId);
    navigate('/config');
    window.location.reload();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosRes, agenciasRes] = await Promise.all([
        api.get('/admin/usuarios'),
        api.get('/admin/agencias')
      ]);
      setUsuarios(usuariosRes.data);
      setAgencias(agenciasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.post('/admin/usuarios', form);
      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
      setForm({ nome: '', email: '', password: '', agencia_id: '', role: 'admin' });
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

  const getAgenciaNome = (agenciaId) => {
    const agencia = agencias.find(a => a.id === agenciaId);
    return agencia?.nome || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-600">Crie e gerencie os usuários do sistema</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
              <select
                value={form.agencia_id}
                onChange={(e) => setForm({ ...form, agencia_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma agência</option>
                {agencias.map((agencia) => (
                  <option key={agencia.id} value={agencia.id}>{agencia.nome}</option>
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
                <option value="admin">Admin da Agência</option>
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

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agência</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50">
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
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{getAgenciaNome(usuario.agencia_id)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    usuario.role === 'super_admin' 
                      ? 'bg-red-100 text-red-700'
                      : usuario.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {usuario.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggle(usuario.id)}
                    disabled={usuario.role === 'super_admin'}
                    className="disabled:opacity-50"
                  >
                    {usuario.ativo ? (
                      <ToggleRight className="w-8 h-8 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {usuario.agencia_id && (
                      <button
                        onClick={() => handleConfigureAgency(usuario.agencia_id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Configurar agência do usuário"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(usuario.id, usuario.nome)}
                      disabled={usuario.role === 'super_admin'}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
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
    </div>
  );
}
