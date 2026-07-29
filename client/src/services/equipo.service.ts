import api from "./api";
import type { AxiosError } from "axios";

export interface Equipo {
  EquipoId: string | number;
  EquipoNombre: string;
  /** Logo en base64 (sin el prefijo data:image/...) */
  EquipoLogo?: string;
  EquipoEstado: boolean;
  EquipoJugadores?: number;
}

// Traer todos los equipos sin paginación real (límite alto para selects)
export const getEquipos = async (params = {}) => {
  try {
    const response = await api.get("/equipos", {
      params: { page: 1, limit: 1000, sortBy: "EquipoNombre", ...params },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener equipos" };
  }
};

export const getEquiposPaginated = async (
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  try {
    const response = await api.get("/equipos", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener equipos" };
  }
};

export const getEquipoById = async (id: string | number) => {
  try {
    const response = await api.get(`/equipos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener equipo" };
  }
};

export const createEquipo = async (equipoData: Record<string, unknown>) => {
  try {
    const response = await api.post("/equipos", equipoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear equipo" };
  }
};

export const updateEquipo = async (
  id: string | number,
  equipoData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/equipos/${id}`, equipoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar equipo" }
    );
  }
};

export const deleteEquipo = async (id: string | number) => {
  try {
    const response = await api.delete(`/equipos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar equipo" };
  }
};

export const searchEquipos = async (
  searchTerm: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    q: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  try {
    const response = await api.get("/equipos/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar equipos" };
  }
};
