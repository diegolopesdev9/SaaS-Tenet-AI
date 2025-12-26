import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Users, MessageSquare, X, Search, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function Agencias() {
  const [tenets, setTenets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenet, setEditingTenet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    instance_name: '',
    whatsapp_phone_id: '',
    nicho: 'sdr',
    admin_nome: '',
    admin_email: '',
    admin_senha: ''
  });

  useEffect(() => {
    loadTenets();
  }, []);

  const loadTenets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/agencias');
      setTenets(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar Tenets:', err);
      setError('Erro ao carregar Tenets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingTenet) {
        await api.patch(`/admin/agencias/${editingTenet.id}`, {
          nome: formData.nome,
          email: formData.email,
          instance_name: formData.instance_name,
          whatsapp_phone_id: formData.whatsapp_phone_id,
          nicho: formData.nicho
        });
        setSuccess('Tenet atualizado com sucesso!');
      } else {
        await api.post('/admin/agencias', formData);
        setSuccess('Tenet criado com sucesso!');
      }

      resetForm();
      loadTenets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar Tenet:', err);
      setError(err.response?.data?.detail || 'Erro ao salvar Tenet');
    }
  };

  const handleEdit = (tenet) => {
    setEditingTenet(tenet);
    setFormData({
      nome: tenet.nome || '',
      email: tenet.email || '',
      instance_name: tenet.instance_name || '',
      whatsapp_phone_id: tenet.whatsapp_phone_id || '',
      nicho: tenet.nicho || 'sdr',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id, nome, totalUsuarios) => {
    const mensagem = totalUsuarios > 0
      ? `⚠️ ATENÇÃO!\n\nAo deletar o Tenet "${nome}", os seguintes dados serão PERMANENTEMENTE removidos:\n\n• ${totalUsuarios} usuário(s) vinculado(s)\n• Todas as conversas\n• Todas as mensagens\n• Configurações e integrações\n\nEsta ação NÃO pode ser desfeita.\n\nDeseja continuar?`
      : `Tem certeza que deseja deletar o Tenet "${nome}"?\n\nTodas as conversas e configurações serão removidas.\n\nEsta ação NÃO pode ser desfeita.`;

    if (!confirm(mensagem)) return;

    try {
      await api.delete(`/admin/agencias/${id}`);
      setSuccess(`Tenet "${nome}" deletado com sucesso!`);
      loadTenets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao excluir Tenet');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      instance_name: '',
      whatsapp_phone_id: '',
      nicho: 'sdr',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setEditingTenet(null);
    setShowModal(false);
    setError(null);
  };

  const getNichoColor = (nicho) => {
    const colors = {
      sdr: 'bg-blue-100 text-blue-800',
      suporte: 'bg-green-100 text-green-800',
      rh: 'bg-purple-100 text-purple-800',
      vendas: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[nicho?.toLowerCase()] || colors.custom;
  };

  const filteredTenets = tenets.filter(a =>
    a.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Tenets</h1>
          <p className="mt-1 text-sm text-gray-500">Crie e gerencie os Tenets do TENET AI</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Novo Tenet
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar Tenets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TENET</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TIPO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuários</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTenets.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Nenhum Tenet encontrado</p>
                </td>
              </tr>
            ) : (
              filteredTenets.map((tenet) => (
                <tr key={tenet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{tenet.nome}</div>
                        <div className="text-sm text-gray-500">{tenet.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNichoColor(tenet.nicho)}`}>
                      {tenet.nicho?.toUpperCase() || 'SDR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{tenet.total_usuarios || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MessageSquare className="w-4 h-4" />
                      <span>{tenet.total_conversas || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tenet.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(tenet)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tenet.id, tenet.nome, tenet.total_usuarios || 0)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTenet ? 'Editar Tenet' : 'Novo Tenet'}
              </h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Dados do Tenet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Tenet *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name *</label>
                    <input
                      type="text"
                      value={formData.instance_name}
                      onChange={(e) => setFormData({...formData, instance_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone ID</label>
                    <input
                      type="text"
                      value={formData.whatsapp_phone_id}
                      onChange={(e) => setFormData({...formData, whatsapp_phone_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nicho do Tenet *</label>
                    <select
                      value={formData.nicho}
                      onChange={(e) => setFormData({...formData, nicho: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="sdr">🎯 Tenet SDR - Qualificação de Leads</option>
                      <option value="suporte">🛠️ Tenet Suporte - Atendimento Técnico</option>
                      <option value="rh">👥 Tenet RH - Recursos Humanos</option>
                      <option value="vendas">💰 Tenet Vendas - Atendimento Comercial</option>
                      <option value="custom">⚙️ Tenet Custom - Personalizado</option>
                    </select>
                  </div>
                </div>
              </div>

              {!editingTenet && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Administrador</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={formData.admin_nome}
                        onChange={(e) => setFormData({...formData, admin_nome: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                      <input
                        type="password"
                        value={formData.admin_senha}
                        onChange={(e) => setFormData({...formData, admin_senha: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingTenet ? 'Salvar' : 'Novo Tenet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}