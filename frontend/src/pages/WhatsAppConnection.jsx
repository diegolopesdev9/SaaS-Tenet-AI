
import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, QrCode, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import authService from '../services/auth';

export default function WhatsAppConnection({ agencyId }) {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  
  const user = authService.getUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const checkStatus = useCallback(async () => {
    try {
      const response = await api.get('/whatsapp/instance/status');
      setStatus(response.data);
      setError(null);
      if (response.data.connected) {
        setQrCode(null);
        setPolling(false);
      }
      return response.data;
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setError('Erro ao verificar status da conexão');
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkStatus();
      setLoading(false);
    };
    init();
  }, [checkStatus]);

  useEffect(() => {
    let interval;
    if (polling && qrCode) {
      interval = setInterval(async () => {
        const result = await checkStatus();
        if (result?.connected) {
          clearInterval(interval);
          setPolling(false);
          setQrCode(null);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [polling, qrCode, checkStatus]);

  const handleCreateInstance = async () => {
    try {
      setCreating(true);
      setError(null);
      const response = await api.post('/whatsapp/instance/create', {});
      if (response.data.success) {
        setQrCode(response.data.qrcode);
        setPolling(true);
        await checkStatus();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleGetQrCode = async () => {
    try {
      setError(null);
      const response = await api.get('/whatsapp/instance/qrcode');
      if (response.data.success && response.data.qrcode) {
        setQrCode(response.data.qrcode);
        setPolling(true);
      } else {
        setError('QR Code não disponível. Tente criar uma nova conexão.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao obter QR Code');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      setDisconnecting(true);
      setError(null);
      await api.post('/whatsapp/instance/disconnect');
      await checkStatus();
      setQrCode(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isConnected = status?.connected;
  const isConfigured = status?.status !== 'not_configured' && status?.status !== 'not_found';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
        <p className="mt-1 text-sm text-gray-500">Conecte o WhatsApp para seu agente receber e enviar mensagens</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Smartphone className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Status da Conexão</h2>
              <div className="flex items-center gap-2 mt-1">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Desconectado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={checkStatus} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isConnected && status?.phone_number && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-4">
                {status.profile_picture && (
                  <img src={status.profile_picture} alt="Profile" className="w-14 h-14 rounded-full" />
                )}
                <div>
                  <p className="font-semibold text-green-900">{status.profile_name || 'WhatsApp Conectado'}</p>
                  <p className="text-green-700">+{status.phone_number}</p>
                  <p className="text-sm text-green-600 mt-1">Instância: {status.instance_name}</p>
                </div>
                <div className="ml-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {qrCode && !isConnected && (
            <div className="mb-6 text-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-4">Escaneie o QR Code com seu WhatsApp</p>
              <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className="w-64 h-64" />
              </div>
              {polling && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aguardando conexão...</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">WhatsApp → Menu → Dispositivos conectados → Conectar</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {!isConfigured && (
              <button onClick={handleCreateInstance} disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {creating ? <><Loader2 className="w-5 h-5 animate-spin" />Criando...</> : <><Smartphone className="w-5 h-5" />Conectar WhatsApp</>}
              </button>
            )}
            {isConfigured && !isConnected && (
              <>
                <button onClick={handleGetQrCode} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <QrCode className="w-5 h-5" />Gerar QR Code
                </button>
                <button onClick={handleCreateInstance} disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <RefreshCw className="w-5 h-5" />Nova Conexão
                </button>
              </>
            )}
            {isConnected && (
              <button onClick={handleDisconnect} disabled={disconnecting} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100">
                {disconnecting ? <><Loader2 className="w-5 h-5 animate-spin" />Desconectando...</> : <><XCircle className="w-5 h-5" />Desconectar</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📱 Como conectar</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Clique em "Conectar WhatsApp" ou "Gerar QR Code"</li>
          <li>Abra o WhatsApp no seu celular</li>
          <li>Vá em Configurações → Dispositivos conectados</li>
          <li>Toque em "Conectar um dispositivo"</li>
          <li>Escaneie o QR Code exibido na tela</li>
        </ol>
      </div>

      {isSuperAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700">
            <strong>Super Admin:</strong> Esta agência usa <strong>{status?.api_type?.toUpperCase() || 'EVOLUTION'}</strong> API.
          </p>
        </div>
      )}
    </div>
  );
}
