import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getPartidoJugadoresByPartidoId } from "../../services/partidojugador.service";
import { getClientes } from "../../services/clientes.service";
import { getCanchasAll } from "../../services/cancha.service";
import { setWinner } from "../../services/partido.service";
import Swal from "sweetalert2";

interface Partido {
  id: number;
  PartidoId: number;
  PartidoFecha: string;
  PartidoHoraInicio: string;
  PartidoHoraFin: string;
  PartidoCategoria: string;
  PartidoEstado: boolean;
  CanchaId: number;
  CanchaNombre?: string;
  PartidoSexo?: "M" | "F" | "X" | null;
  jugadores?: PartidoJugador[];
  [key: string]: unknown;
}

interface PartidoJugador {
  PartidoJugadorId: number;
  PartidoId: number;
  ClienteId: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PartidoJugadorPareja: string;
  PartidoJugadorResultado: string;
  PartidoJugadorObs: string;
  [key: string]: unknown;
}

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteCategoria: string;
  ClienteSexo?: "M" | "F" | null;
  [key: string]: unknown;
}

interface Cancha {
  CanchaId: number;
  CanchaNombre: string;
  CanchaEstado: boolean;
  SucursalId: number;
  [key: string]: unknown;
}

interface PartidosListProps {
  partidos: Partido[];
  onEdit?: (partido: Partido) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentPartido: Partido | null;
  onSubmit: (partido: Partido) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
}

export default function PartidosList({
  partidos,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentPartido,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
}: PartidosListProps) {
  const [formData, setFormData] = useState({
    PartidoFecha: "",
    PartidoHoraInicio: "",
    PartidoHoraFin: "",
    PartidoCategoria: "",
    PartidoEstado: false,
    CanchaId: "",
    PartidoSexo: "X" as "M" | "F" | "X",
  });
  const [jugadores, setJugadores] = useState<PartidoJugador[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [filtroSexo, setFiltroSexo] = useState<"M" | "F" | "MIXTO">("M");
  const [nuevoJugador, setNuevoJugador] = useState<PartidoJugador>({
    PartidoJugadorId: 0,
    PartidoId: 0,
    ClienteId: 0,
    PartidoJugadorPareja: "1",
    PartidoJugadorResultado: "",
    PartidoJugadorObs: "",
  });
  const [busquedaJugador, setBusquedaJugador] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null);

  // Cargar canchas al montar el componente
  useEffect(() => {
    getCanchasAll().then((res) => {
      setCanchas(res.data || []);
    });
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      // Cargar clientes
      getClientes(1, 1000).then((res) => {
        setClientes(res.data || []);
      });

      if (currentPartido) {
        setFormData({
          PartidoFecha: convertirFechaParaInput(currentPartido.PartidoFecha),
          PartidoHoraInicio: currentPartido.PartidoHoraInicio,
          PartidoHoraFin: currentPartido.PartidoHoraFin ?? "",
          PartidoCategoria: currentPartido.PartidoCategoria,
          PartidoEstado: Boolean(currentPartido.PartidoEstado),
          CanchaId: currentPartido.CanchaId?.toString() || "",
          PartidoSexo:
            (currentPartido.PartidoSexo as "M" | "F" | "X" | null) ?? "X",
        });
        // Sincronizar filtro con PartidoSexo del partido
        const sexo =
          (currentPartido.PartidoSexo as "M" | "F" | "X" | null) ?? "X";
        setFiltroSexo(sexo === "X" ? "MIXTO" : sexo);

        // Cargar jugadores del partido
        getPartidoJugadoresByPartidoId(currentPartido.PartidoId).then((res) => {
          const jugadoresData = res.data || [];
          // Convertir PartidoJugadorPareja de número a string para compatibilidad
          const jugadoresFormateados = jugadoresData.map(
            (jugador: PartidoJugador) => ({
              ...jugador,
              PartidoJugadorPareja: jugador.PartidoJugadorPareja.toString(),
            })
          );
          setJugadores(jugadoresFormateados);
        });
      } else {
        setFormData({
          PartidoFecha: "",
          PartidoHoraInicio: "",
          PartidoHoraFin: "",
          PartidoCategoria: "",
          PartidoEstado: false,
          CanchaId: "",
          PartidoSexo: "X",
        });
        setJugadores([]);
      }
      // Reiniciar filtro de sexo por defecto (no mixto) si es creación
      if (!currentPartido) setFiltroSexo("M");
      setBusquedaJugador("");
      setIsDropdownOpen(false);
    }
  }, [isModalOpen, currentPartido]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownOpen && !target.closest(".relative")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Actualizar pareja por defecto según disponibilidad
  useEffect(() => {
    const pareja1Count = jugadores.filter(
      (j) => j.PartidoJugadorPareja === "1"
    ).length;
    const pareja2Count = jugadores.filter(
      (j) => j.PartidoJugadorPareja === "2"
    ).length;

    // Si la pareja 1 está completa (2 jugadores) y la pareja 2 no, cambiar a pareja 2
    if (pareja1Count >= 2 && pareja2Count < 2) {
      setNuevoJugador((prev) => ({ ...prev, PartidoJugadorPareja: "2" }));
    }
    // Si la pareja 1 no está completa, usar pareja 1
    else if (pareja1Count < 2) {
      setNuevoJugador((prev) => ({ ...prev, PartidoJugadorPareja: "1" }));
    }
  }, [jugadores]);

  // Limpiar búsqueda de jugadores cuando cambie la categoría
  useEffect(() => {
    setBusquedaJugador("");
    setIsDropdownOpen(false);
  }, [formData.PartidoCategoria]);

  // Función para convertir fecha de dd-mm-aaaa a aaaa-mm-dd
  const convertirFechaParaInput = (fechaFormateada: string) => {
    if (!fechaFormateada) return "";
    const partes = fechaFormateada.split("-");
    if (partes.length === 3) {
      const [dia, mes, año] = partes;
      return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }
    return fechaFormateada;
  };

  // Función para formatear el versus de jugadores con colores
  const formatearVersus = (
    jugadores: PartidoJugador[] = [],
    vertical: boolean = false,
    partidoEstado?: boolean
  ) => {
    if (!jugadores || jugadores.length === 0) return "Sin jugadores";

    // Separar jugadores por pareja
    const pareja1 = jugadores.filter(
      (j) => String(j.PartidoJugadorPareja) === "1"
    );
    const pareja2 = jugadores.filter(
      (j) => String(j.PartidoJugadorPareja) === "2"
    );

    // Formatear nombres de cada pareja
    const nombresPareja1 = pareja1
      .map((j) => `${j.ClienteNombre} ${j.ClienteApellido}`.trim())
      .join(" - ");
    const nombresPareja2 = pareja2
      .map((j) => `${j.ClienteNombre} ${j.ClienteApellido}`.trim())
      .join(" - ");

    // Determinar qué equipo ganó (si el partido está finalizado)
    let equipoGanador = null;
    if (partidoEstado && jugadores.length > 0) {
      const jugadorGanador = jugadores.find(
        (j) => j.PartidoJugadorResultado === "G"
      );
      if (jugadorGanador) {
        equipoGanador = String(jugadorGanador.PartidoJugadorPareja);
      }
    }

    // Función para obtener el color de cada equipo
    const getColorEquipo = (pareja: string) => {
      if (partidoEstado && equipoGanador === pareja) {
        return "text-green-600"; // Verde para el ganador
      }
      if (partidoEstado && equipoGanador && equipoGanador !== pareja) {
        return "text-gray-700"; // Color por defecto para el perdedor
      }
      return pareja === "1" ? "text-blue-600" : "text-red-600"; // Colores normales para partidos pendientes
    };

    if (nombresPareja1 && nombresPareja2) {
      if (vertical) {
        return (
          <div className="text-sm text-center">
            <div className={`${getColorEquipo("1")} font-medium`}>
              {nombresPareja1}
            </div>
            <div className="text-gray-500 my-1">vs</div>
            <div className={`${getColorEquipo("2")} font-medium`}>
              {nombresPareja2}
            </div>
          </div>
        );
      } else {
        return (
          <span className="text-sm">
            <span className={getColorEquipo("1")}>{nombresPareja1}</span>
            <span className="mx-2 text-gray-500">vs</span>
            <span className={getColorEquipo("2")}>{nombresPareja2}</span>
          </span>
        );
      }
    } else if (nombresPareja1) {
      if (vertical) {
        return (
          <div className="text-sm text-center">
            <div className={`${getColorEquipo("1")} font-medium`}>
              {nombresPareja1}
            </div>
            <div className="text-gray-500 my-1">vs</div>
            <div className="text-gray-500">TBD</div>
          </div>
        );
      } else {
        return (
          <span className="text-sm">
            <span className={getColorEquipo("1")}>{nombresPareja1}</span>
            <span className="mx-2 text-gray-500">vs</span>
            <span className="text-gray-500">TBD</span>
          </span>
        );
      }
    } else if (nombresPareja2) {
      if (vertical) {
        return (
          <div className="text-sm text-center">
            <div className="text-gray-500">TBD</div>
            <div className="text-gray-500 my-1">vs</div>
            <div className={`${getColorEquipo("2")} font-medium`}>
              {nombresPareja2}
            </div>
          </div>
        );
      } else {
        return (
          <span className="text-sm">
            <span className="text-gray-500">TBD</span>
            <span className="mx-2 text-gray-500">vs</span>
            <span className={getColorEquipo("2")}>{nombresPareja2}</span>
          </span>
        );
      }
    }

    return "Sin jugadores asignados";
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleJugadorChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNuevoJugador((prev) => ({
      ...prev,
      [name]: name === "ClienteId" ? parseInt(value) : value,
    }));
  };

  const handleAgregarJugador = () => {
    // Validar campos requeridos con mensajes específicos
    if (!nuevoJugador.ClienteId || nuevoJugador.ClienteId === 0) {
      Swal.fire({
        icon: "warning",
        title: "Jugador requerido",
        text: "Por favor seleccione un jugador",
      });
      return;
    }

    if (
      !nuevoJugador.PartidoJugadorPareja ||
      nuevoJugador.PartidoJugadorPareja === ""
    ) {
      Swal.fire({
        icon: "warning",
        title: "Pareja requerida",
        text: "Por favor seleccione una pareja (1 o 2)",
      });
      return;
    }

    // Validar que el jugador no esté ya agregado
    const jugadorYaExiste = jugadores.some(
      (j) => j.ClienteId === nuevoJugador.ClienteId
    );

    if (jugadorYaExiste) {
      Swal.fire({
        icon: "warning",
        title: "Jugador duplicado",
        text: "Este jugador ya ha sido agregado al partido",
      });
      return;
    }

    // Validar que no se excedan 2 jugadores por pareja
    const jugadoresEnPareja = jugadores.filter(
      (j) => j.PartidoJugadorPareja === nuevoJugador.PartidoJugadorPareja
    ).length;

    if (jugadoresEnPareja >= 2) {
      Swal.fire({
        icon: "warning",
        title: "Pareja completa",
        text: `La pareja ${nuevoJugador.PartidoJugadorPareja} ya tiene 2 jugadores (máximo permitido por pareja)`,
      });
      return;
    }

    // Validar que no se excedan los 4 jugadores totales
    if (jugadores.length >= 4) {
      Swal.fire({
        icon: "warning",
        title: "Límite alcanzado",
        text: "Ya se han agregado 4 jugadores (máximo permitido)",
      });
      return;
    }

    const cliente = clientes.find(
      (c) => c.ClienteId === nuevoJugador.ClienteId
    );

    setJugadores((prev) => [
      ...prev,
      {
        ...nuevoJugador,
        PartidoJugadorId: Date.now(), // ID temporal
        ClienteNombre: cliente?.ClienteNombre || "",
        ClienteApellido: cliente?.ClienteApellido || "",
      },
    ]);

    setNuevoJugador({
      PartidoJugadorId: 0,
      PartidoId: 0,
      ClienteId: 0,
      PartidoJugadorPareja: "1", // Siempre iniciar con pareja 1, el useEffect se encargará de cambiarlo si es necesario
      PartidoJugadorResultado: "",
      PartidoJugadorObs: "",
    });
    setBusquedaJugador("");
    setIsDropdownOpen(false);
  };

  const handleEliminarJugador = (index: number) => {
    setJugadores((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBusquedaJugador = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusquedaJugador(e.target.value);
  };

  const clientesFiltrados = formData.PartidoCategoria
    ? clientes
        .filter((cliente) => {
          // Filtrar por búsqueda de texto
          const nombreCompleto =
            `${cliente.ClienteNombre} ${cliente.ClienteApellido}`.toLowerCase();
          const coincideTexto = nombreCompleto.includes(
            busquedaJugador.toLowerCase()
          );

          // Filtrar por categoría del cliente en función de la categoría del partido
          let coincideCategoria = false;
          if (formData.PartidoCategoria === "SUMA11") {
            // Para SUMA11 permitimos jugadores de 3,4,5,6,7,8
            const permitidas = ["3", "4", "5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else if (formData.PartidoCategoria === "SUMA13") {
            // Para SUMA13 permitimos jugadores de 5,6,7,8
            const permitidas = ["5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else {
            // Categorías tradicionales: igualdad exacta
            coincideCategoria =
              cliente.ClienteCategoria === formData.PartidoCategoria;
          }

          // Filtrar por sexo según selección (M/F) o MIXTO (no filtra por sexo)
          const coincideSexo =
            filtroSexo === "MIXTO" ? true : cliente.ClienteSexo === filtroSexo;

          return coincideTexto && coincideCategoria && coincideSexo;
        })
        .sort((a, b) => {
          const nombreA =
            `${a.ClienteNombre} ${a.ClienteApellido}`.toLowerCase();
          const nombreB =
            `${b.ClienteNombre} ${b.ClienteApellido}`.toLowerCase();
          return nombreA.localeCompare(nombreB);
        })
    : [];

  const handleSelectJugador = (cliente: Cliente) => {
    setNuevoJugador((prev) => ({
      ...prev,
      ClienteId: cliente.ClienteId,
    }));
    setBusquedaJugador(`${cliente.ClienteNombre} ${cliente.ClienteApellido}`);
    setIsDropdownOpen(false);
  };

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setBusquedaJugador("");
    }
  };

  const handleSelectWinner = (partido: Partido) => {
    setSelectedPartido(partido);
    setIsWinnerModalOpen(true);
  };

  const handleCloseWinnerModal = () => {
    setIsWinnerModalOpen(false);
    setSelectedPartido(null);
  };

  const handleConfirmWinner = async (equipoGanador: "1" | "2") => {
    if (!selectedPartido) return;

    try {
      // Llamar al API para actualizar el ganador
      const response = await setWinner(
        selectedPartido.PartidoId,
        equipoGanador
      );

      Swal.fire({
        icon: "success",
        title: "Ganador seleccionado",
        text:
          response.message ||
          `Equipo ${equipoGanador} ha sido marcado como ganador`,
      }).then(() => {
        // Recargar la página solo después de cerrar el modal
        window.location.reload();
      });

      handleCloseWinnerModal();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el resultado del partido";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validar que se haya seleccionado una cancha
    if (!formData.CanchaId || formData.CanchaId === "") {
      Swal.fire({
        icon: "warning",
        title: "Cancha requerida",
        text: "Por favor seleccione una cancha",
      });
      return;
    }

    // Validar que haya exactamente 4 jugadores
    if (jugadores.length !== 4) {
      Swal.fire({
        icon: "warning",
        title: "Jugadores insuficientes",
        text: "Debe agregar exactamente 4 jugadores (2 por pareja) para crear el partido",
      });
      return;
    }

    // Validar que cada pareja tenga exactamente 2 jugadores
    const pareja1 = jugadores.filter(
      (j) => j.PartidoJugadorPareja === "1"
    ).length;
    const pareja2 = jugadores.filter(
      (j) => j.PartidoJugadorPareja === "2"
    ).length;

    if (pareja1 !== 2 || pareja2 !== 2) {
      Swal.fire({
        icon: "warning",
        title: "Parejas incompletas",
        text: `Cada pareja debe tener exactamente 2 jugadores. Pareja 1: ${pareja1}/2, Pareja 2: ${pareja2}/2`,
      });
      return;
    }

    // Convertir CanchaId a número
    const formDataToSubmit = {
      ...formData,
      CanchaId: Number(formData.CanchaId),
      // Mapear filtro de UI a PartidoSexo del backend (M/F/X)
      PartidoSexo: filtroSexo === "MIXTO" ? "X" : filtroSexo,
    };

    onSubmit({
      ...formDataToSubmit,
      PartidoId: currentPartido?.PartidoId,
      jugadores,
    } as unknown as Partido);
  };

  const columns = [
    { key: "PartidoId", label: "ID" },
    {
      key: "versus",
      label: "Partido",
      render: (item: Partido) =>
        formatearVersus(item.jugadores, false, item.PartidoEstado),
    },
    { key: "PartidoFecha", label: "Fecha" },
    { key: "PartidoHoraInicio", label: "Hora Inicio" },
    { key: "PartidoHoraFin", label: "Hora Fin" },
    { key: "PartidoCategoria", label: "Categoría" },
    {
      key: "PartidoSexo",
      label: "Sexo",
      render: (item: Partido) =>
        item.PartidoSexo === "M"
          ? "MASCULINO"
          : item.PartidoSexo === "F"
          ? "FEMENINO"
          : "MIXTO",
    },
    {
      key: "CanchaId",
      label: "Cancha",
      render: (item: Partido) => {
        const cancha = canchas.find((c) => c.CanchaId === item.CanchaId);
        return cancha ? cancha.CanchaNombre : `ID: ${item.CanchaId}`;
      },
    },
    {
      key: "PartidoEstado",
      label: "Estado",
      render: (item: Partido) =>
        item.PartidoEstado ? "FINALIZADO" : "PENDIENTE",
    },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar partidos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Partido"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <DataTable<Partido>
        columns={columns}
        data={partidos}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.PartidoId) : undefined}
        onSelectWinner={handleSelectWinner}
        emptyMessage="No se encontraron partidos"
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseModal();
          }}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-4xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[calc(100vh-2rem)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentPartido
                    ? `Editar partido ID: ${currentPartido.PartidoId} - Categoría: ${currentPartido.PartidoCategoria}`
                    : "Crear nuevo partido"}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                  onClick={onCloseModal}
                >
                  <svg
                    className="w-3 h-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Información del Partido */}
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Fecha
                    </label>
                    <input
                      type="date"
                      name="PartidoFecha"
                      value={formData.PartidoFecha}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      name="PartidoHoraInicio"
                      value={formData.PartidoHoraInicio}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Hora Fin
                    </label>
                    <input
                      type="time"
                      name="PartidoHoraFin"
                      value={formData.PartidoHoraFin}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Categoría
                    </label>
                    <select
                      name="PartidoCategoria"
                      value={formData.PartidoCategoria}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="SUMA11">SUMA11</option>
                      <option value="SUMA13">SUMA13</option>
                      <option value="INICIAL">INICIAL</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Sexo
                    </label>
                    <select
                      name="FiltroSexo"
                      value={filtroSexo}
                      onChange={(e) =>
                        setFiltroSexo(
                          e.target.value === "M"
                            ? "M"
                            : e.target.value === "F"
                            ? "F"
                            : "MIXTO"
                        )
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="MIXTO">Mixto</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Estado
                    </label>
                    <select
                      name="PartidoEstado"
                      value={formData.PartidoEstado ? "true" : "false"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          PartidoEstado: e.target.value === "true",
                        })
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="false">PENDIENTE</option>
                      <option value="true">FINALIZADO</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Cancha
                    </label>
                    <select
                      name="CanchaId"
                      value={formData.CanchaId}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccionar cancha</option>
                      {canchas.map((cancha) => (
                        <option key={cancha.CanchaId} value={cancha.CanchaId}>
                          {cancha.CanchaNombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Jugadores del Partido */}
                <div className="col-span-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    Jugadores del Partido
                  </label>

                  {/* Formulario para agregar nuevo jugador */}
                  <div className="grid grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Jugador
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaJugador}
                          onChange={handleBusquedaJugador}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="bg-white border border-gray-300 text-gray-900 text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          placeholder="Buscar jugador..."
                        />
                        <button
                          type="button"
                          onClick={handleToggleDropdown}
                          className="absolute inset-y-0 right-0 flex items-center pr-2"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isDropdownOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {isDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {formData.PartidoCategoria ? (
                              <>
                                <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-gray-200 font-medium">
                                  Mostrando jugadores de categoría:{" "}
                                  {formData.PartidoCategoria}
                                </div>
                                {clientesFiltrados.length > 0 ? (
                                  clientesFiltrados.map((cliente) => (
                                    <div
                                      key={cliente.ClienteId}
                                      onClick={() =>
                                        handleSelectJugador(cliente)
                                      }
                                      className="px-3 py-2 text-xs text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600"
                                    >
                                      {cliente.ClienteNombre}{" "}
                                      {cliente.ClienteApellido}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-xs text-gray-500">
                                    No se encontraron jugadores en la categoría{" "}
                                    {formData.PartidoCategoria}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="px-3 py-2 text-xs text-orange-600 bg-orange-50 font-medium">
                                Primero selecciona una categoría para buscar
                                jugadores
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Pareja
                      </label>
                      <select
                        name="PartidoJugadorPareja"
                        value={nuevoJugador.PartidoJugadorPareja}
                        onChange={handleJugadorChange}
                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                        required
                      >
                        <option value="1">Pareja 1</option>
                        <option value="2">Pareja 2</option>
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Acción
                      </label>
                      <button
                        type="button"
                        onClick={handleAgregarJugador}
                        className="w-full bg-green-600 text-white text-xs px-3 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={
                          jugadores.length >= 4 ||
                          (nuevoJugador.PartidoJugadorPareja !== "" &&
                            jugadores.filter(
                              (j) =>
                                j.PartidoJugadorPareja ===
                                nuevoJugador.PartidoJugadorPareja
                            ).length >= 2)
                        }
                      >
                        {jugadores.length >= 4
                          ? "Máximo 4"
                          : nuevoJugador.PartidoJugadorPareja !== "" &&
                            jugadores.filter(
                              (j) =>
                                j.PartidoJugadorPareja ===
                                nuevoJugador.PartidoJugadorPareja
                            ).length >= 2
                          ? `Pareja ${nuevoJugador.PartidoJugadorPareja} completa`
                          : "Agregar"}
                      </button>
                    </div>
                  </div>

                  {/* Indicador de jugadores */}
                  <div
                    className={`mb-2 p-2 rounded-lg ${
                      jugadores.length === 4
                        ? "bg-green-50 border border-green-200"
                        : "bg-blue-50"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        jugadores.length === 4
                          ? "text-green-800 font-semibold"
                          : "text-blue-800"
                      }`}
                    >
                      Jugadores agregados: {jugadores.length}/4
                      {jugadores.length === 4 && " ✓ Listo para crear partido"}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <span
                        className={`text-xs ${
                          jugadores.filter(
                            (j) => j.PartidoJugadorPareja === "1"
                          ).length === 2
                            ? "text-green-600 font-semibold"
                            : "text-blue-600"
                        }`}
                      >
                        Pareja 1:{" "}
                        {
                          jugadores.filter(
                            (j) => j.PartidoJugadorPareja === "1"
                          ).length
                        }
                        /2
                        {jugadores.filter((j) => j.PartidoJugadorPareja === "1")
                          .length === 2 && " ✓"}
                      </span>
                      <span
                        className={`text-xs ${
                          jugadores.filter(
                            (j) => j.PartidoJugadorPareja === "2"
                          ).length === 2
                            ? "text-green-600 font-semibold"
                            : "text-blue-600"
                        }`}
                      >
                        Pareja 2:{" "}
                        {
                          jugadores.filter(
                            (j) => j.PartidoJugadorPareja === "2"
                          ).length
                        }
                        /2
                        {jugadores.filter((j) => j.PartidoJugadorPareja === "2")
                          .length === 2 && " ✓"}
                      </span>
                    </div>
                    {jugadores.length < 4 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Faltan {4 - jugadores.length} para completar los 2
                        equipos
                      </p>
                    )}
                    {jugadores.length === 4 && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ¡Perfecto! Ya puedes crear el partido
                      </p>
                    )}
                  </div>

                  {/* Lista de jugadores */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {jugadores.map((jugador, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Cliente:
                            </span>
                            <p className="text-sm font-medium">
                              {jugador.ClienteNombre} {jugador.ClienteApellido}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Pareja:
                            </span>
                            <p className="text-sm font-bold text-blue-600">
                              {jugador.PartidoJugadorPareja}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Resultado:
                            </span>
                            <p
                              className={`text-sm font-medium ${
                                jugador.PartidoJugadorResultado === "G" ||
                                jugador.PartidoJugadorResultado === "GANADOR"
                                  ? "text-green-600"
                                  : jugador.PartidoJugadorResultado === "P" ||
                                    jugador.PartidoJugadorResultado ===
                                      "PERDEDOR"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {jugador.PartidoJugadorResultado === "G"
                                ? "GANADOR"
                                : jugador.PartidoJugadorResultado === "P"
                                ? "PERDEDOR"
                                : "PENDIENTE"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Obs:
                            </span>
                            <p className="text-sm text-gray-600">
                              {jugador.PartidoJugadorObs || "Sin observaciones"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarJugador(index)}
                          className="ml-4 text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentPartido ? "Actualizar" : "Crear"}
                  type="submit"
                  disabled={jugadores.length !== 4}
                  className={
                    jugadores.length !== 4
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                />
                <ActionButton
                  label="Cancelar"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                  onClick={onCloseModal}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de selección de ganador */}
      {isWinnerModalOpen && selectedPartido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseWinnerModal();
          }}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-md z-10">
            <div
              className="relative bg-white rounded-lg shadow p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Seleccionar Ganador
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                  onClick={handleCloseWinnerModal}
                >
                  <svg
                    className="w-3 h-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">ID:</span>{" "}
                  {selectedPartido.PartidoId}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Categoría:</span>{" "}
                  {selectedPartido.PartidoCategoria}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Fecha:</span>{" "}
                  {selectedPartido.PartidoFecha}
                </div>
                <div className="text-sm text-gray-700">
                  {formatearVersus(
                    selectedPartido.jugadores,
                    true,
                    selectedPartido.PartidoEstado
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  ¿Cuál equipo fue el ganador?
                </p>

                {/* Equipo 1 */}
                <button
                  onClick={() => handleConfirmWinner("1")}
                  className="w-full p-4 text-left border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-600">Equipo 1</div>
                      <div className="text-sm text-gray-600">
                        {selectedPartido.jugadores
                          ?.filter(
                            (j) => String(j.PartidoJugadorPareja) === "1"
                          )
                          .map((j) => `${j.ClienteNombre} ${j.ClienteApellido}`)
                          .join(" - ")}
                      </div>
                    </div>
                    <div className="text-2xl">🏆</div>
                  </div>
                </button>

                {/* Equipo 2 */}
                <button
                  onClick={() => handleConfirmWinner("2")}
                  className="w-full p-4 text-left border-2 border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-red-600">Equipo 2</div>
                      <div className="text-sm text-gray-600">
                        {selectedPartido.jugadores
                          ?.filter(
                            (j) => String(j.PartidoJugadorPareja) === "2"
                          )
                          .map((j) => `${j.ClienteNombre} ${j.ClienteApellido}`)
                          .join(" - ")}
                      </div>
                    </div>
                    <div className="text-2xl">🏆</div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <ActionButton
                  label="Cancelar"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                  onClick={handleCloseWinnerModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
