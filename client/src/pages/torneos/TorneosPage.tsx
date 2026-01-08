import { useEffect, useState, useCallback } from "react";
import {
  getTorneosPaginated,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  searchTorneos,
} from "../../services/torneo.service";
import TorneosList from "../../components/torneos/TorneosList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Torneo {
  TorneoId: number;
  TorneoNombre: string;
  TorneoCategoria: string;
  TorneoFechaInicio: string;
  TorneoFechaFin: string;
  id: number;
  campeones?: TorneoJugador[];
  vicecampeones?: TorneoJugador[];
  [key: string]: unknown;
}

interface TorneoJugador {
  TorneoJugadorId: number;
  TorneoId: number;
  ClienteId: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  TorneoJugadorRol: "C" | "V";
  [key: string]: unknown;
}

interface PaginationType {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function TorneosPage() {
  const [torneosData, setTorneosData] = useState<{
    torneos: Torneo[];
    pagination: PaginationType;
  }>({ torneos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTorneo, setCurrentTorneo] = useState<Torneo | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

  const puedeCrear = usePermiso("TORNEOS", "crear");
  const puedeEditar = usePermiso("TORNEOS", "editar");
  const puedeEliminar = usePermiso("TORNEOS", "eliminar");
  const puedeLeer = usePermiso("TORNEOS", "leer");

  const fetchTorneos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchTorneos(
          appliedSearchTerm,
          currentPage,
          itemsPerPage
        );
      } else {
        data = await getTorneosPaginated(currentPage, itemsPerPage);
      }
      setTorneosData({
        torneos: data.data,
        pagination: data.pagination,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, appliedSearchTerm]);

  useEffect(() => {
    fetchTorneos();
  }, [fetchTorneos]);

  const handleCreate = () => {
    setCurrentTorneo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (torneo: Torneo) => {
    setCurrentTorneo({ ...torneo, id: torneo.TorneoId });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteTorneo(id);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Torneo eliminado",
            showConfirmButton: false,
            timer: 2000,
          });
          fetchTorneos();
        } catch {
          Swal.fire({ icon: "error", title: "No se pudo eliminar" });
        }
      }
    });
  };

  const handleSubmit = async (
    torneoData: Torneo & {
      campeones?: { ClienteId: number }[];
      vicecampeones?: { ClienteId: number }[];
    }
  ) => {
    try {
      if (currentTorneo) {
        await updateTorneo(currentTorneo.TorneoId, { ...torneoData });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Torneo actualizado",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await createTorneo({
          TorneoNombre: torneoData.TorneoNombre,
          TorneoCategoria: torneoData.TorneoCategoria,
          TorneoFechaInicio: torneoData.TorneoFechaInicio,
          TorneoFechaFin: torneoData.TorneoFechaFin,
          campeones: torneoData.campeones || [],
          vicecampeones: torneoData.vicecampeones || [],
        });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Torneo creado",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      setIsModalOpen(false);
      fetchTorneos();
    } catch {
      setError("Error al guardar torneo");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  if (!puedeLeer) return <div>No tienes permiso para ver los torneos</div>;
  if (loading) return <div>Cargando torneos...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Torneos</h1>
      <TorneosList
        torneos={torneosData.torneos.map((t) => ({ ...t, id: t.TorneoId }))}
        onEdit={puedeEditar ? handleEdit : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentTorneo={currentTorneo}
        onSubmit={handleSubmit}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={torneosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
