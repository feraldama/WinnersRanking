import { useState, useEffect } from "react";
import { getCompetencias } from "../../services/competencia.service";
import {
  getRankingEquipos,
  getRankingEquiposCompetencia,
} from "../../services/ranking.service";
import type { EquipoRanking } from "../../services/ranking.service";
import type { Equipo } from "../../services/equipo.service";

interface RankingEquiposTableProps {
  title: string;
  loading?: boolean;
  /** Si es true muestra el selector de competencia y filtra por sus fechas */
  porCompetencia?: boolean;
  /** Lo trae el Dashboard una sola vez: sirve para resolver los logos */
  equipos?: Equipo[];
  onFilterChange?: (categoria: string, sexo: string) => void;
}

export default function RankingEquiposTable({
  title,
  loading = false,
  porCompetencia = false,
  equipos = [],
  onFilterChange,
}: RankingEquiposTableProps) {
  const [categoria, setCategoria] = useState("8");
  const [sexo, setSexo] = useState("M");
  const [competencias, setCompetencias] = useState<
    { CompetenciaId: string | number; CompetenciaNombre: string }[]
  >([]);
  const [competenciaSeleccionada, setCompetenciaSeleccionada] = useState("");
  const [filas, setFilas] = useState<EquipoRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!porCompetencia) return;
    const loadCompetencias = async () => {
      try {
        const response = await getCompetencias({
          sortBy: "CompetenciaId",
          sortOrder: "desc",
          limit: 1000,
        });
        const competenciasList = response.data || [];
        setCompetencias(competenciasList);
        if (competenciasList.length > 0) {
          setCompetenciaSeleccionada(competenciasList[0].CompetenciaId);
        }
      } catch (error) {
        console.error("Error al cargar competencias:", error);
      }
    };
    loadCompetencias();
  }, [porCompetencia]);

  useEffect(() => {
    const loadRanking = async () => {
      // Si es por competencia hay que esperar a tener una seleccionada
      if (porCompetencia && !competenciaSeleccionada) return;
      setIsLoading(true);
      try {
        const data = porCompetencia
          ? await getRankingEquiposCompetencia(
              competenciaSeleccionada,
              categoria,
              sexo
            )
          : await getRankingEquipos(categoria, sexo);
        setFilas(data);
      } catch (error) {
        console.error("Error al cargar ranking de equipos:", error);
        setFilas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRanking();
  }, [categoria, sexo, competenciaSeleccionada, porCompetencia]);

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

  const getLogo = (equipoId: string | number) =>
    equipos.find((e) => e.EquipoId == equipoId)?.EquipoLogo;

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

        {porCompetencia && (
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

      {/* Tabla de ranking por equipo */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Pos. Equipo
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                Jug.
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                PJ
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                G
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                P
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                PTS
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                Prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              filas.map((equipo, index) => {
                const logo = getLogo(equipo.id);
                return (
                  <tr
                    key={equipo.id}
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
                        {logo && (
                          <img
                            src={`data:image/png;base64,${logo}`}
                            alt={equipo.nombre}
                            className="w-7 h-7 object-contain"
                          />
                        )}
                        <span className="font-medium text-gray-800">
                          {equipo.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-700">
                      {equipo.jugadores}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                        {equipo.partidosJugados}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium text-green-600">
                      {equipo.ganados}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium text-red-600">
                      {equipo.perdidos}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                        {equipo.puntos}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-700">
                      {equipo.promedio}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Suma los puntos de los jugadores del equipo que cumplen la categoría y
        sexo seleccionados. Jug.: jugadores con actividad. Prom.: puntos por
        jugador.
      </p>
    </div>
  );
}
