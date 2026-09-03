import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Library, Activity, Music, ChevronRight } from 'lucide-react';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import clienteHttp from '../../compartilhado/api/cliente_http';

export const PaginaDashboardAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [stats, setStats] = React.useState({
    total_lojas: 0,
    total_templates: 0,
    total_eventos: 0,
    total_musicas: 0
  });

  React.useEffect(() => {
    clienteHttp.get('/admin/estatisticas')
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, []);

  const estatisticas = [
    {
      id: 'lojas',
      titulo: 'Lojas Cadastradas',
      valor: stats.total_lojas.toString(),
      icone: <Users className="w-8 h-8 text-cyan-400" />,
      corBg: 'bg-cyan-900/20',
      corBorda: 'border-cyan-800',
      rota: '/admin/lojas'
    },
    {
      id: 'templates',
      titulo: 'Tipos Globais de Sessão',
      valor: stats.total_templates.toString(),
      icone: <Activity className="w-8 h-8 text-purple-400" />,
      corBg: 'bg-purple-900/20',
      corBorda: 'border-purple-800',
      rota: '/admin/templates'
    },
    {
      id: 'eventos',
      titulo: 'Tipos de Eventos (Por Rito)',
      valor: stats.total_eventos.toString(),
      icone: <Library className="w-8 h-8 text-emerald-400" />,
      corBg: 'bg-emerald-900/20',
      corBorda: 'border-emerald-800',
      rota: '/admin/eventos'
    },
    {
      id: 'acervo',
      titulo: 'Acervo Global de Músicas',
      valor: stats.total_musicas.toString(),
      icone: <Music className="w-8 h-8 text-rose-400" />,
      corBg: 'bg-rose-900/20',
      corBorda: 'border-rose-800',
      rota: '/admin/musicas'
    }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-[#080808]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col gap-2 border-b border-gray-800 pb-6 pt-4">
          <h1 className="text-3xl font-bold text-white font-cinzel">Painel Global</h1>
          <p className="text-gray-400">
            Bem-vindo(a), <span className="text-macaonico-dourado font-medium">{usuario?.nome}</span>. 
            Visão gerencial do ecossistema Harmonia.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {estatisticas.map((stat) => (
            <div 
              key={stat.id}
              onClick={() => navigate(stat.rota)}
              className={`cursor-pointer border ${stat.corBorda} ${stat.corBg} rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg group relative overflow-hidden`}
            >
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 bg-[#111111] rounded-xl shadow-inner">
                  {stat.icone}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <div className="relative z-10">
                <h3 className="text-4xl font-bold text-white mb-1">{stat.valor}</h3>
                <p className="text-sm font-medium text-gray-300">{stat.titulo}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150">
                {stat.icone}
              </div>
            </div>
          ))}
        </section>

        <section className="bg-[#111] border border-gray-800 rounded-2xl p-6 h-64 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Gráficos de uso do Player aparecerão aqui em breve.</p>
          </div>
        </section>

      </div>
    </div>
  );
};
