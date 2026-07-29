import { useEffect, useState, useCallback } from "react";
import {
  getEquiposPaginated,
  deleteEquipo,
  searchEquipos,
  createEquipo,
  updateEquipo,
} from "../../services/equipo.service";
import EquiposList from "../../components/equipos/EquiposList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Equipo {
  id: string | number;
  EquipoId: string | number;
  EquipoNombre: string;
  EquipoLogo?: string;
  EquipoEstado: boolean;
  EquipoJugadores?: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function EquiposPage() {
  const [equiposData, setEquiposData] = useState<{
    equipos: Equipo[];
    pagination: Pagination;
  }>({ equipos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEquipo, setCurrentEquipo] = useState<Equipo | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("EQUIPOS", "crear");
  const puedeEditar = usePermiso("EQUIPOS", "editar");
  const puedeEliminar = usePermiso("EQUIPOS", "eliminar");
  const puedeLeer = usePermiso("EQUIPOS", "leer");

  const fetchEquipos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchEquipos(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getEquiposPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setEquiposData({
        equipos: data.data,
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
  }, [currentPage, appliedSearchTerm, itemsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    fetchEquipos();
  }, [fetchEquipos]);

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

  const handleDelete = async (id: string | number) => {
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
          await deleteEquipo(id);
          Swal.fire({
            icon: "success",
            title: "Equipo eliminado exitosamente",
          });
          fetchEquipos();
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el equipo";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentEquipo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (equipo: Equipo) => {
    setCurrentEquipo(equipo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (equipoData: Equipo) => {
    let mensaje = "";
    try {
      const payload = {
        EquipoNombre: equipoData.EquipoNombre,
        EquipoLogo: equipoData.EquipoLogo || "",
        EquipoEstado: equipoData.EquipoEstado,
      };
      if (currentEquipo) {
        await updateEquipo(currentEquipo.EquipoId, payload);
        mensaje = "Equipo actualizado exitosamente";
      } else {
        const response = await createEquipo(payload);
        mensaje = response.message || "Equipo creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchEquipos();
    } catch (error: unknown) {
      const err = error as { message?: string };
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "No se pudo guardar el equipo",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) return <div>Cargando equipos...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver los equipos</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Equipos</h1>
      <EquiposList
        equipos={equiposData.equipos.map((e) => ({ ...e, id: e.EquipoId }))}
        onDelete={
          puedeEliminar ? (equipo) => handleDelete(equipo.EquipoId) : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={equiposData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentEquipo={
          currentEquipo
            ? { ...currentEquipo, id: currentEquipo.EquipoId }
            : null
        }
        onSubmit={handleSubmit}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={equiposData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
