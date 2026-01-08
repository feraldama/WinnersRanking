import { useState, useEffect } from "react";
import { getCompetencias } from "../../services/competencia.service";
import {
  getRankingGlobal,
  getRankingCompetencia,
} from "../../services/ranking.service";
import type { JugadorRanking } from "../../services/ranking.service";

interface RankingTableProps {
  title: string;
  loading?: boolean;
  showSubTorneos?: boolean;
  onFilterChange?: (categoria: string, sexo: string) => void;
}

export default function RankingTable({
  title,
  loading = false,
  showSubTorneos = false,
  onFilterChange,
}: RankingTableProps) {
  const [categoria, setCategoria] = useState("8");
  const [sexo, setSexo] = useState("M");
  const [competencias, setCompetencias] = useState<
    { CompetenciaId: string | number; CompetenciaNombre: string }[]
  >([]);
  const [competenciaSeleccionada, setCompetenciaSeleccionada] = useState("");
  const [jugadores, setJugadores] = useState<JugadorRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCompetencias = async () => {
      try {
        // Obtener todas las competencias ordenadas por ID descendente (última primero)
        const response = await getCompetencias({
          sortBy: "CompetenciaId",
          sortOrder: "desc",
          limit: 1000, // Límite alto para obtener todas las competencias
        });
        const competenciasList = response.data || [];
        setCompetencias(competenciasList);
        if (competenciasList.length > 0) {
          // Seleccionar la última competencia cargada (primera en la lista ordenada por ID DESC)
          setCompetenciaSeleccionada(competenciasList[0].CompetenciaId);
        }
      } catch (error) {
        console.error("Error al cargar competencias:", error);
      }
    };
    loadCompetencias();
  }, []);

  // Cargar datos de ranking
  useEffect(() => {
    const loadRanking = async () => {
      setIsLoading(true);
      try {
        let data: JugadorRanking[];
        if (title.includes("Competencia") && competenciaSeleccionada) {
          data = await getRankingCompetencia(
            competenciaSeleccionada,
            categoria,
            sexo
          );
        } else {
          data = await getRankingGlobal(categoria, sexo);
        }
        setJugadores(data);
      } catch (error) {
        console.error("Error al cargar ranking:", error);
        setJugadores([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRanking();
  }, [categoria, sexo, competenciaSeleccionada, title]);

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoria = e.target.value;
    setCategoria(newCategoria);
    onFilterChange?.(newCategoria, sexo);
  };

  const handleSexoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSexo = e.target.value;
    setSexo(newSexo);
    onFilterChange?.(categoria, newSexo);
  };

  const getPositionBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 text-white";
    if (position === 2) return "bg-gray-500 text-white";
    return "bg-orange-500 text-white";
  };

  const getPositionBadgeSize = (position: number) => {
    if (position <= 3) return "w-8 h-8 text-sm";
    return "w-6 h-6 text-xs";
  };

  if (loading || isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            value={categoria}
            onChange={handleCategoriaChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="8">8</option>
            <option value="7">7</option>
            <option value="6">6</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Sexo</label>
          <select
            value={sexo}
            onChange={handleSexoChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>

        {title.includes("Competencia") && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Competencia
            </label>
            <select
              value={competenciaSeleccionada}
              onChange={(e) => setCompetenciaSeleccionada(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {competencias.map((competencia) => (
                <option
                  key={competencia.CompetenciaId}
                  value={competencia.CompetenciaId}
                >
                  {competencia.CompetenciaNombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla de ranking */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Pos. Nombre
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                Puntos
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                Cat.
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                Jug.
              </th>
              {showSubTorneos && (
                <th className="text-center py-3 px-4 font-medium text-gray-700">
                  SubT.
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {jugadores.length === 0 ? (
              <tr>
                <td
                  colSpan={showSubTorneos ? 5 : 4}
                  className="text-center py-8 text-gray-500"
                >
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              jugadores.map((jugador, index) => (
                <tr
                  key={jugador.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`${getPositionBadgeColor(
                          index + 1
                        )} ${getPositionBadgeSize(
                          index + 1
                        )} rounded-full flex items-center justify-center font-bold`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-800">
                        {jugador.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                      {jugador.puntos}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                      #{jugador.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                      {jugador.partidosJugados}
                    </span>
                  </td>
                  {showSubTorneos && (
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                        {jugador.subTorneos || 0}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
