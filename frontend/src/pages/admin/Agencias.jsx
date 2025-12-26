
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
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.patch(`/admin/tenets/${selectedTenet.id}`, {
        nome: selectedTenet.nome,
        email: selectedTenet.email,
        nicho: selectedTenet.nicho
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Tenet</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Tenet
                </label>
                <input
                  type="text"
                  value={selectedTenet.nome}
                  onChange={(e) => setSelectedTenet({ ...selectedTenet, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedTenet.email}
                  onChange={(e) => setSelectedTenet({ ...selectedTenet, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nicho
                </label>
                <select
                  value={selectedTenet.nicho || 'SDR'}
                  onChange={(e) => setSelectedTenet({ ...selectedTenet, nicho: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
