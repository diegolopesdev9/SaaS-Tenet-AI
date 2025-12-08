
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function Agencias() {
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    instance_name: '',
    whatsapp_phone_id: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.post('/admin/agencias', form);
      setMessage({ type: 'success', text: 'Agência criada com sucesso!' });
      setForm({ nome: '', email: '', instance_name: '', whatsapp_phone_id: '' });
      setShowForm(false);
      loadAgencias();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Erro ao criar agência' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja deletar a agência "${nome}"?`)) return;

    try {
      await api.delete(`/admin/agencias/${id}`);
      setMessage({ type: 'success', text: 'Agência deletada!' });
      loadAgencias();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao deletar agência' });
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
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Agências</h1>
          <p className="text-gray-600">Crie e gerencie as agências do sistema</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Agência
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
          <h2 className="text-lg font-semibold mb-4">Nova Agência</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da agência"
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
                placeholder="contato@agencia.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name</label>
              <input
                type="text"
                value={form.instance_name}
                onChange={(e) => setForm({ ...form, instance_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="nome-da-instancia"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone ID</label>
              <input
                type="text"
                value={form.whatsapp_phone_id}
                onChange={(e) => setForm({ ...form, whatsapp_phone_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5511999999999"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3">
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
                Criar Agência
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
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
                    <span className="font-medium text-gray-900">{agencia.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">{agencia.instance_name || '-'}</code>
                </td>
                <td className="px-6 py-4 text-gray-600">{agencia.whatsapp_phone_id || '-'}</td>
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {agencia.created_at ? new Date(agencia.created_at).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(agencia.id, agencia.nome)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {agencias.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  Nenhuma agência cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
