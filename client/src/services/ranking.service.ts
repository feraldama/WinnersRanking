import api from "./api";
import type { AxiosError } from "axios";

export interface JugadorRanking {
  id: string | number;
  nombre: string;
  apellido?: string | null;
  categoria: number;
  sexo: string;
  equipoId?: string | number | null;
  equipoNombre?: string | null;
  puntos: number;
  partidosJugados: number;
  ganados: number;
  perdidos: number;
  subTorneos?: number;
  /** Victorias consecutivas contando desde el último partido */
  racha: number;
}

export interface EquipoRanking {
  id: string | number;
  nombre: string;
  jugadores: number;
  puntos: number;
  partidosJugados: number;
  ganados: number;
  perdidos: number;
  subTorneos?: number;
  promedio: number;
}

// Obtener ranking global de jugadores
export const getRankingGlobal = async (
  categoria: string = "8",
  sexo: string = "M"
): Promise<JugadorRanking[]> => {
  try {
    const response = await api.get("/ranking/global", {
      params: { categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking global",
      }
    );
  }
};

// Obtener ranking de jugadores por competencia
export const getRankingCompetencia = async (
  competenciaId: string | number,
  categoria: string = "8",
  sexo: string = "M"
): Promise<JugadorRanking[]> => {
  try {
    const response = await api.get("/ranking/competencia", {
      params: { competenciaId, categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking de competencia",
      }
    );
  }
};

// Obtener ranking global de equipos
export const getRankingEquipos = async (
  categoria: string = "8",
  sexo: string = "M"
): Promise<EquipoRanking[]> => {
  try {
    const response = await api.get("/ranking/equipos", {
      params: { categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking de equipos",
      }
    );
  }
};

// Obtener ranking de equipos por competencia
export const getRankingEquiposCompetencia = async (
  competenciaId: string | number,
  categoria: string = "8",
  sexo: string = "M"
): Promise<EquipoRanking[]> => {
  try {
    const response = await api.get("/ranking/equipos/competencia", {
      params: { competenciaId, categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking de equipos de la competencia",
      }
    );
  }
};
