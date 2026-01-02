import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function Agencias() {
  const navigate = useNavigate();
  const [tenets, setTenets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenet, setSelectedTenet] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenet, setNewTenet] = useState({ 
    nome: '', 
    email: '', 
    nicho: 'sdr',
    instance_name: '',
    admin_nome: '',
    admin_email: '',
    admin_senha: ''
  });
  const [editTenet, setEditTenet] = useState({
    nome: '',
    email: '',
    nicho: 'sdr'
  });

  useEffect(() => {
    loadTenets();
  }, []);

  const loadTenets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/tenets');
      setTenets(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar tenets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenets = tenets.filter(tenet =>
    tenet.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenet.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTenet = (tenetId) => {
    // Selecionar o tenet e ir para o dashboard
    localStorage.setItem('selectedAgencyId', tenetId);
    navigate('/');
    window.location.reload(); // Recarregar para atualizar o contexto da agência
  };

  const handleEditTenet = (tenet) => {
    setSelectedTenet(tenet);
    setEditTenet({
      nome: tenet.nome,
      email: tenet.email,
      nicho: tenet.nicho
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.patch(`/admin/tenets/${selectedTenet.id}`, {
        nome: editTenet.nome,
        email: editTenet.email,
        nicho: editTenet.nicho
      });
      alert('Tenet atualizado com sucesso');
      setShowEditModal(false);
      loadTenets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao atualizar tenet');
      console.error('Erro ao atualizar tenet:', err);
    }
  };

  const handleDeleteTenet = async (tenetId) => {
    try {
      // Buscar preview do que será deletado
      const preview = await api.get(`/admin/tenets/${tenetId}/delete-preview`);
      const { tenet, usuarios, total_usuarios, total_conversas } = preview.data;

      // Montar mensagem de confirmação
      let mensagem = `⚠️ ATENÇÃO!\n\nAo deletar o Tenet "${tenet.nome}", os seguintes dados serão PERMANENTEMENTE removidos:\n\n`;

      if (total_usuarios > 0) {
        mensagem += `• ${total_usuarios} usuário(s):\n`;
        usuarios.slice(0, 5).forEach(u => {
          mensagem += `  - ${u.nome} (${u.email})\n`;
        });
        if (total_usuarios > 5) {
          mensagem += `  - e mais ${total_usuarios - 5} usuário(s)...\n`;
        }
      }

      mensagem += `• ${total_conversas} conversa(s) e suas mensagens\n`;
      mensagem += `• Todas as configurações e integrações\n\n`;
      mensagem += `Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?`;

      if (!confirm(mensagem)) return;

      // Confirmar novamente para tenets com usuários
      if (total_usuarios > 0) {
        const confirmar = prompt(`Digite "${tenet.nome}" para confirmar a exclusão:`);
        if (confirmar !== tenet.nome) {
          alert('Nome incorreto. Exclusão cancelada.');
          return;
        }
      }

      // Deletar
      await api.delete(`/admin/tenets/${tenetId}`);
      alert(`Tenet "${tenet.nome}" deletado com sucesso`);
      loadTenets(); // Recarregar lista

    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao deletar tenet');
      console.error('Erro ao deletar tenet:', err);
    }
  };

  const handleCreateTenet = async () => {
    try {
      // Validação de campos obrigatórios
      if (!newTenet.nome || !newTenet.email) {
        alert('Nome e email são obrigatórios');
        return;
      }

      // Criar dados completos para o backend
      const tenetData = {
        nome: newTenet.nome,
        email: newTenet.email,
        nicho: newTenet.nicho || 'custom',
        // Gerar instance_name automaticamente se não informado
        instance_name: newTenet.instance_name || newTenet.nome.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
        // Usar email do tenet como admin se não informado
        admin_nome: newTenet.admin_nome || newTenet.nome + ' Admin',
        admin_email: newTenet.admin_email || newTenet.email,
        // Gerar senha aleatória se não informada
        admin_senha: newTenet.admin_senha || Math.random().toString(36).slice(-8) + 'A1!'
      };

      const response = await api.post('/admin/tenets', tenetData);
      
      // Mostrar credenciais do admin criado
      if (response.data?.usuario) {
        alert(`Tenet criado com sucesso!\n\nCredenciais do Admin:\nEmail: ${tenetData.admin_email}\nSenha: ${tenetData.admin_senha}\n\nGuarde essas informações!`);
      } else {
        alert('Tenet criado com sucesso!');
      }
      
      setShowCreateModal(false);
      setNewTenet({ nome: '', email: '', nicho: 'sdr', instance_name: '', admin_nome: '', admin_email: '', admin_senha: '' });
      loadTenets();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao criar tenet';
      alert('Erro ao criar tenet: ' + errorMessage);
      console.error('Erro ao criar tenet:', err);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Modal de Edição */}
      {showEditModal && selectedTenet && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#2D2D2D] rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Editar Tenet</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome do Tenet
                </label>
                <input
                  type="text"
                  value={editTenet.nome}
                  onChange={(e) => setEditTenet({ ...editTenet, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editTenet.email}
                  onChange={(e) => setEditTenet({ ...editTenet, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nicho
                </label>
                <select
                  value={editTenet.nicho}
                  onChange={(e) => setEditTenet({ ...editTenet, nicho: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="sdr">SDR</option>
                  <option value="suporte">Suporte</option>
                  <option value="vendas">Vendas</option>
                  <option value="rh">RH</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#2D2D2D] rounded-lg p-6 max-w-lg w-full mx-4 border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Novo Tenet</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Dados do Tenet */}
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Dados do Tenet</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nome do Tenet *
                    </label>
                    <input
                      type="text"
                      value={newTenet.nome}
                      onChange={(e) => setNewTenet({ ...newTenet, nome: e.target.value })}
                      placeholder="Ex: Empresa XYZ"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email do Tenet *
                    </label>
                    <input
                      type="email"
                      value={newTenet.email}
                      onChange={(e) => setNewTenet({ ...newTenet, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nicho
                    </label>
                    <select
                      value={newTenet.nicho}
                      onChange={(e) => setNewTenet({ ...newTenet, nicho: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="sdr">SDR</option>
                      <option value="suporte">Suporte</option>
                      <option value="vendas">Vendas</option>
                      <option value="rh">RH</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dados do Admin */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Admin do Tenet (opcional)</h3>
                <p className="text-xs text-gray-500 mb-3">Se não preencher, serão gerados automaticamente</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nome do Admin
                    </label>
                    <input
                      type="text"
                      value={newTenet.admin_nome}
                      onChange={(e) => setNewTenet({ ...newTenet, admin_nome: e.target.value })}
                      placeholder="Será gerado automaticamente"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email do Admin
                    </label>
                    <input
                      type="email"
                      value={newTenet.admin_email}
                      onChange={(e) => setNewTenet({ ...newTenet, admin_email: e.target.value })}
                      placeholder="Usará o email do tenet se vazio"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Senha do Admin
                    </label>
                    <input
                      type="text"
                      value={newTenet.admin_senha}
                      onChange={(e) => setNewTenet({ ...newTenet, admin_senha: e.target.value })}
                      placeholder="Será gerada automaticamente"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-white/20 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTenet}
                className="flex-1 px-4 py-2 bg-cyan-500 text-black font-medium rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Criar Tenet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gerenciar Tenets</h1>
        <p className="text-gray-600">Visualize e gerencie todos os tenets do sistema</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Tenet
            </button>
      </div>

      {/* Tenets List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nicho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhum tenet encontrado
                  </td>
                </tr>
              ) : (
                filteredTenets.map((tenet) => (
                  <tr key={tenet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{tenet.nome}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenet.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {tenet.nicho || 'SDR'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenet.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewTenet(tenet.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar Tenet"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleEditTenet(tenet)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar Tenet"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTenet(tenet.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Deletar Tenet"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
}

export default Agencias;