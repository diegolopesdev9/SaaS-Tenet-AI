import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { notify } from 'react-notify-toast';
import Select from 'react-select';

function Agencias() {
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [telefone, setTelefone] = useState('');
  const [gerente, setGerente] = useState('');
  const [gerenteOptions, setGerenteOptions] = useState([]);
  const [selectedGerente, setSelectedGerente] = useState(null);

  const loadAgencias = async () => {
    try {
      const response = await api.get('/agencias');
      setAgencias(response.data);
      setLoading(false);
    } catch (error) {
      notify.show('Erro ao carregar agências.', 'error', 3000);
      setLoading(false);
    }
  };

  const loadGerentes = async () => {
    try {
      const response = await api.get('/gerentes');
      const options = response.data.map(gerente => ({
        value: gerente.id,
        label: gerente.nome
      }));
      setGerenteOptions(options);
    } catch (error) {
      notify.show('Erro ao carregar gerentes.', 'error', 3000);
    }
  };

  useEffect(() => {
    loadAgencias();
    loadGerentes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/agencias', {
        nome,
        endereco,
        cidade,
        estado,
        telefone,
        gerenteId: selectedGerente ? selectedGerente.value : null
      });
      setNome('');
      setEndereco('');
      setCidade('');
      setEstado('');
      setTelefone('');
      setSelectedGerente(null);
      loadAgencias();
      notify.show('Agência cadastrada com sucesso!', 'success', 3000);
    } catch (error) {
      notify.show('Erro ao cadastrar agência.', 'error', 3000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta agência?')) {
      try {
        await api.delete(`/agencias/${id}`);
        loadAgencias();
        notify.show('Agência excluída com sucesso!', 'success', 3000);
      } catch (error) {
        notify.show('Erro ao excluir agência.', 'error', 3000);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Agências</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Agência</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">Nome</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endereco">Endereço</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="endereco"
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cidade">Cidade</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="estado">Estado</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="estado"
              type="text"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefone">Telefone</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="telefone"
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gerente">Gerente</label>
            <Select
              id="gerente"
              options={gerenteOptions}
              value={selectedGerente}
              onChange={setSelectedGerente}
              placeholder="Selecione um gerente"
              className="basic-multi-select"
              classNamePrefix="select"
              required
            />
          </div>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-6"
          type="submit"
        >
          Adicionar Agência
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold mb-4">Agências Cadastradas</h2>
        {loading ? (
          <p>Carregando agências...</p>
        ) : agencias.length === 0 ? (
          <p>Nenhuma agência cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="py-3 px-4 text-left">Nome</th>
                  <th className="py-3 px-4 text-left">Endereço</th>
                  <th className="py-3 px-4 text-left">Cidade</th>
                  <th className="py-3 px-4 text-left">Estado</th>
                  <th className="py-3 px-4 text-left">Telefone</th>
                  <th className="py-3 px-4 text-left">Gerente</th>
                  <th className="py-3 px-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agencias.map((agencia) => (
                  <tr key={agencia.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-4">{agencia.nome}</td>
                    <td className="py-3 px-4">{agencia.endereco}</td>
                    <td className="py-3 px-4">{agencia.cidade}</td>
                    <td className="py-3 px-4">{agencia.estado}</td>
                    <td className="py-3 px-4">{agencia.telefone}</td>
                    <td className="py-3 px-4">{agencia.gerente ? agencia.gerente.nome : 'N/A'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(agencia.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Agencias;