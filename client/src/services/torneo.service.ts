import api from "./api";
import type { AxiosError } from "axios";

// Traer todos los torneos sin paginación
export const getTorneos = async (params = {}) => {
  const res = await api.get("/torneos/all", { params });
  return res.data;
};

// Traer torneos paginados
export const getTorneosPaginated = async (
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
    const response = await api.get("/torneos", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener torneos" };
  }
};

export const getTorneosAll = async () => {
  const res = await api.get("/torneos/all");
  return res.data;
};

export const getTorneoById = async (id: string | number) => {
  try {
    const response = await api.get(`/torneos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener torneo" };
  }
};

export const createTorneo = async (torneoData: {
  TorneoNombre: string;
  TorneoCategoria: string;
  TorneoFechaInicio: string;
  TorneoFechaFin: string;
  campeones: { ClienteId: number }[];
  vicecampeones: { ClienteId: number }[];
}) => {
  try {
    const response = await api.post("/torneos", torneoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear torneo" };
  }
};

export const updateTorneo = async (
  id: string | number,
  torneoData: {
    TorneoNombre?: string;
    TorneoCategoria?: string;
    TorneoFechaInicio?: string;
    TorneoFechaFin?: string;
    campeones?: { ClienteId: number }[];
    vicecampeones?: { ClienteId: number }[];
  }
) => {
  try {
    const response = await api.put(`/torneos/${id}`, torneoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar torneo" }
    );
  }
};

export const deleteTorneo = async (id: string | number) => {
  try {
    const response = await api.delete(`/torneos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar torneo" };
  }
};

export const searchTorneos = async (
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
    const response = await api.get("/torneos/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar torneos" };
  }
};
