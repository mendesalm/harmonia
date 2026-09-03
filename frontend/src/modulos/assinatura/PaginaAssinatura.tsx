import React, { useEffect, useState } from 'react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import { CreditCard, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface StatusAssinatura {
  status: string;
  plano: string;
  validade: string | null;
  customer_id: string | null;
  subscription_id: string | null;
  invoice_url: string | null;
}

const PaginaAssinatura: React.FC = () => {
  const { usuario } = useAuth();
  const [dados, setDados] = useState<StatusAssinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const res = await clienteHttp.get('/assinaturas/minha-loja');
      setDados(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarCheckout = async (ciclo: 'MENSAL' | 'ANUAL') => {
    setLoadingCheckout(true);
    try {
      await clienteHttp.post('/assinaturas/checkout', { ciclo });
      alert('Assinatura gerada com sucesso! Verifique o painel para realizar o pagamento inicial.');
      carregarDados();
    } catch (error: any) {
      console.error(error);
      alert('Erro ao processar assinatura: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoadingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="animate-spin mr-3 h-6 w-6 border-2 border-macaonico-dourado border-t-transparent rounded-full"></div>
        Carregando...
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Assinatura Harmonia</h1>
        <p className="text-gray-400">Não foi possível carregar os dados financeiros da sua Loja.</p>
      </div>
    );
  }

  const renderIconeStatus = () => {
    switch (dados.status) {
      case 'ATIVA':
      case 'ESPECIAL':
        return <CheckCircle className="text-green-500 w-12 h-12" />;
      case 'PENDENTE':
        return <AlertTriangle className="text-yellow-500 w-12 h-12" />;
      case 'BLOQUEADO':
      case 'INATIVA':
        return <XCircle className="text-red-500 w-12 h-12" />;
      default:
        return <CheckCircle className="text-green-500 w-12 h-12" />;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-macaonico-dourado" />
          Financeiro e Assinatura
        </h1>
        <p className="text-gray-400 mt-2">
          Gerencie o acesso da sua Loja ao sistema Harmonia.
        </p>
      </div>

      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-8 mb-8 flex items-center gap-6">
        <div>
          {renderIconeStatus()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white mb-1">
            Status: <span className="uppercase">{dados.status}</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Plano atual: <strong>{dados.plano.replace('_', ' ')}</strong>
          </p>
          {dados.validade && (
            <p className="text-gray-400 text-sm">
              Validade: {new Date(dados.validade).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        
        {dados.invoice_url && (
          <a
            href={dados.invoice_url}
            target="_blank"
            rel="noreferrer"
            className="bg-macaonico-dourado text-black px-6 py-3 rounded-lg font-bold hover:brightness-110 flex items-center gap-2"
          >
            Pagar Fatura
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>

      {(!dados.subscription_id || dados.status === 'INATIVA') && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Escolha seu Ciclo de Cobrança</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121212] border border-[#2a2a2a] p-6 rounded-xl hover:border-macaonico-dourado cursor-pointer transition">
              <h4 className="text-lg font-bold text-white">Plano Mensal</h4>
              <p className="text-3xl font-bold text-macaonico-dourado mt-4 mb-2">R$ 30<span className="text-sm text-gray-500">/mês</span></p>
              <ul className="text-sm text-gray-400 space-y-2 mb-6">
                <li>• Acesso completo ao Acervo Global</li>
                <li>• Sistema de Sessões Customizadas</li>
                <li>• Suporte prioritário</li>
              </ul>
              <button
                onClick={() => iniciarCheckout('MENSAL')}
                disabled={loadingCheckout}
                className="w-full bg-[#1c1c1c] text-white border border-[#2a2a2a] py-2 rounded font-semibold hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                {loadingCheckout ? 'Processando...' : 'Assinar Mensal'}
              </button>
            </div>

            <div className="bg-[#1c1c1c] border border-macaonico-dourado p-6 rounded-xl relative shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <div className="absolute -top-3 right-4 bg-macaonico-dourado text-black text-xs font-bold px-2 py-1 rounded">
                MAIS VANTAJOSO
              </div>
              <h4 className="text-lg font-bold text-white">Plano Anual</h4>
              <p className="text-3xl font-bold text-macaonico-dourado mt-4 mb-2">R$ 300<span className="text-sm text-gray-500">/ano</span></p>
              <ul className="text-sm text-gray-400 space-y-2 mb-6">
                <li>• Acesso completo ao Acervo Global</li>
                <li>• Sistema de Sessões Customizadas</li>
                <li>• <strong className="text-green-400">2 meses gratuitos</strong> (desconto de R$ 60)</li>
              </ul>
              <button
                onClick={() => iniciarCheckout('ANUAL')}
                disabled={loadingCheckout}
                className="w-full bg-macaonico-dourado text-black py-2 rounded font-bold hover:brightness-110 disabled:opacity-50"
              >
                {loadingCheckout ? 'Processando...' : 'Assinar Anual'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaAssinatura;
