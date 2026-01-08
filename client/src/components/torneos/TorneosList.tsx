import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getClientes } from "../../services/clientes.service";
import Swal from "sweetalert2";

interface Torneo {
  id: number;
  TorneoId: number;
  TorneoNombre: string;
  TorneoCategoria: string;
  TorneoFechaInicio: string;
  TorneoFechaFin: string;
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

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteCategoria: string;
  ClienteSexo?: "M" | "F" | null;
  [key: string]: unknown;
}

interface TorneosListProps {
  torneos: Torneo[];
  onEdit?: (torneo: Torneo) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentTorneo: Torneo | null;
  onSubmit: (torneo: Torneo) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
}

export default function TorneosList({
  torneos,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentTorneo,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
}: TorneosListProps) {
  const [formData, setFormData] = useState({
    TorneoNombre: "",
    TorneoCategoria: "",
    TorneoFechaInicio: "",
    TorneoFechaFin: "",
  });
  const [campeones, setCampeones] = useState<TorneoJugador[]>([]);
  const [vicecampeones, setVicecampeones] = useState<TorneoJugador[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nuevoCampeon, setNuevoCampeon] = useState<TorneoJugador>({
    TorneoJugadorId: 0,
    TorneoId: 0,
    ClienteId: 0,
    TorneoJugadorRol: "C",
  });
  const [nuevoVicecampeon, setNuevoVicecampeon] = useState<TorneoJugador>({
    TorneoJugadorId: 0,
    TorneoId: 0,
    ClienteId: 0,
    TorneoJugadorRol: "V",
  });
  const [busquedaCampeon, setBusquedaCampeon] = useState("");
  const [busquedaVicecampeon, setBusquedaVicecampeon] = useState("");
  const [isDropdownCampeonOpen, setIsDropdownCampeonOpen] = useState(false);
  const [isDropdownVicecampeonOpen, setIsDropdownVicecampeonOpen] =
    useState(false);

  useEffect(() => {
    if (isModalOpen) {
      // Cargar clientes
      getClientes(1, 1000).then((res) => {
        setClientes(res.data || []);
      });

      if (currentTorneo) {
        setFormData({
          TorneoNombre: currentTorneo.TorneoNombre || "",
          TorneoCategoria: (currentTorneo.TorneoCategoria as string) || "",
          TorneoFechaInicio: convertirFechaParaInput(
            currentTorneo.TorneoFechaInicio
          ),
          TorneoFechaFin: convertirFechaParaInput(currentTorneo.TorneoFechaFin),
        });
        setCampeones(currentTorneo.campeones || []);
        setVicecampeones(currentTorneo.vicecampeones || []);
      } else {
        setFormData({
          TorneoNombre: "",
          TorneoCategoria: "",
          TorneoFechaInicio: "",
          TorneoFechaFin: "",
        });
        setCampeones([]);
        setVicecampeones([]);
      }
      setBusquedaCampeon("");
      setBusquedaVicecampeon("");
      setIsDropdownCampeonOpen(false);
      setIsDropdownVicecampeonOpen(false);
    }
  }, [isModalOpen, currentTorneo]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownCampeonOpen && !target.closest(".dropdown-campeon")) {
        setIsDropdownCampeonOpen(false);
      }
      if (
        isDropdownVicecampeonOpen &&
        !target.closest(".dropdown-vicecampeon")
      ) {
        setIsDropdownVicecampeonOpen(false);
      }
    };

    if (isDropdownCampeonOpen || isDropdownVicecampeonOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownCampeonOpen, isDropdownVicecampeonOpen]);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Convertir TorneoNombre a mayúsculas
    const processedValue =
      name === "TorneoNombre" ? value.toUpperCase() : value;
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleAgregarCampeon = () => {
    if (!nuevoCampeon.ClienteId || nuevoCampeon.ClienteId === 0) {
      Swal.fire({
        icon: "warning",
        title: "Jugador requerido",
        text: "Por favor seleccione un jugador",
      });
      return;
    }

    // Validar que el jugador no esté ya agregado como campeón
    const jugadorYaExiste = campeones.some(
      (c) => c.ClienteId === nuevoCampeon.ClienteId
    );

    if (jugadorYaExiste) {
      Swal.fire({
        icon: "warning",
        title: "Jugador duplicado",
        text: "Este jugador ya está en la lista de campeones",
      });
      return;
    }

    // Validar que no esté en vicecampeones
    const estaEnVicecampeones = vicecampeones.some(
      (v) => v.ClienteId === nuevoCampeon.ClienteId
    );

    if (estaEnVicecampeones) {
      Swal.fire({
        icon: "warning",
        title: "Jugador ya asignado",
        text: "Este jugador ya está en la lista de vicecampeones",
      });
      return;
    }

    // Validar que no se excedan 2 campeones
    if (campeones.length >= 2) {
      Swal.fire({
        icon: "warning",
        title: "Límite alcanzado",
        text: "Ya se han agregado 2 campeones (máximo permitido)",
      });
      return;
    }

    const cliente = clientes.find(
      (c) => c.ClienteId === nuevoCampeon.ClienteId
    );

    setCampeones((prev) => [
      ...prev,
      {
        ...nuevoCampeon,
        TorneoJugadorId: Date.now(),
        ClienteNombre: cliente?.ClienteNombre || "",
        ClienteApellido: cliente?.ClienteApellido || "",
      },
    ]);

    setNuevoCampeon({
      TorneoJugadorId: 0,
      TorneoId: 0,
      ClienteId: 0,
      TorneoJugadorRol: "C",
    });
    setBusquedaCampeon("");
    setIsDropdownCampeonOpen(false);
  };

  const handleAgregarVicecampeon = () => {
    if (!nuevoVicecampeon.ClienteId || nuevoVicecampeon.ClienteId === 0) {
      Swal.fire({
        icon: "warning",
        title: "Jugador requerido",
        text: "Por favor seleccione un jugador",
      });
      return;
    }

    // Validar que el jugador no esté ya agregado como vicecampeón
    const jugadorYaExiste = vicecampeones.some(
      (v) => v.ClienteId === nuevoVicecampeon.ClienteId
    );

    if (jugadorYaExiste) {
      Swal.fire({
        icon: "warning",
        title: "Jugador duplicado",
        text: "Este jugador ya está en la lista de vicecampeones",
      });
      return;
    }

    // Validar que no esté en campeones
    const estaEnCampeones = campeones.some(
      (c) => c.ClienteId === nuevoVicecampeon.ClienteId
    );

    if (estaEnCampeones) {
      Swal.fire({
        icon: "warning",
        title: "Jugador ya asignado",
        text: "Este jugador ya está en la lista de campeones",
      });
      return;
    }

    // Validar que no se excedan 2 vicecampeones
    if (vicecampeones.length >= 2) {
      Swal.fire({
        icon: "warning",
        title: "Límite alcanzado",
        text: "Ya se han agregado 2 vicecampeones (máximo permitido)",
      });
      return;
    }

    const cliente = clientes.find(
      (c) => c.ClienteId === nuevoVicecampeon.ClienteId
    );

    setVicecampeones((prev) => [
      ...prev,
      {
        ...nuevoVicecampeon,
        TorneoJugadorId: Date.now(),
        ClienteNombre: cliente?.ClienteNombre || "",
        ClienteApellido: cliente?.ClienteApellido || "",
      },
    ]);

    setNuevoVicecampeon({
      TorneoJugadorId: 0,
      TorneoId: 0,
      ClienteId: 0,
      TorneoJugadorRol: "V",
    });
    setBusquedaVicecampeon("");
    setIsDropdownVicecampeonOpen(false);
  };

  const handleEliminarCampeon = (index: number) => {
    setCampeones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEliminarVicecampeon = (index: number) => {
    setVicecampeones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBusquedaCampeon = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusquedaCampeon(e.target.value);
  };

  const handleBusquedaVicecampeon = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setBusquedaVicecampeon(e.target.value);
  };

  const clientesFiltradosCampeon = formData.TorneoCategoria
    ? clientes
        .filter((cliente) => {
          // Filtrar por búsqueda de texto
          const nombreCompleto =
            `${cliente.ClienteNombre} ${cliente.ClienteApellido}`.toLowerCase();
          const coincideTexto = nombreCompleto.includes(
            busquedaCampeon.toLowerCase()
          );

          // Filtrar por categoría del cliente en función de la categoría del torneo
          let coincideCategoria = false;
          if (formData.TorneoCategoria === "SUMA11") {
            // Para SUMA11 permitimos jugadores de 3,4,5,6,7,8
            const permitidas = ["3", "4", "5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else if (formData.TorneoCategoria === "SUMA13") {
            // Para SUMA13 permitimos jugadores de 5,6,7,8
            const permitidas = ["5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else {
            // Categorías tradicionales: igualdad exacta
            coincideCategoria =
              cliente.ClienteCategoria === formData.TorneoCategoria;
          }

          // Excluir jugadores que ya están en campeones o vicecampeones
          const yaEstaEnCampeones = campeones.some(
            (c) => c.ClienteId === cliente.ClienteId
          );
          const yaEstaEnVicecampeones = vicecampeones.some(
            (v) => v.ClienteId === cliente.ClienteId
          );

          return (
            coincideTexto &&
            coincideCategoria &&
            !yaEstaEnCampeones &&
            !yaEstaEnVicecampeones
          );
        })
        .sort((a, b) => {
          const nombreA =
            `${a.ClienteNombre} ${a.ClienteApellido}`.toLowerCase();
          const nombreB =
            `${b.ClienteNombre} ${b.ClienteApellido}`.toLowerCase();
          return nombreA.localeCompare(nombreB);
        })
    : [];

  const clientesFiltradosVicecampeon = formData.TorneoCategoria
    ? clientes
        .filter((cliente) => {
          // Filtrar por búsqueda de texto
          const nombreCompleto =
            `${cliente.ClienteNombre} ${cliente.ClienteApellido}`.toLowerCase();
          const coincideTexto = nombreCompleto.includes(
            busquedaVicecampeon.toLowerCase()
          );

          // Filtrar por categoría del cliente en función de la categoría del torneo
          let coincideCategoria = false;
          if (formData.TorneoCategoria === "SUMA11") {
            // Para SUMA11 permitimos jugadores de 3,4,5,6,7,8
            const permitidas = ["3", "4", "5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else if (formData.TorneoCategoria === "SUMA13") {
            // Para SUMA13 permitimos jugadores de 5,6,7,8
            const permitidas = ["5", "6", "7", "8"];
            coincideCategoria = permitidas.includes(cliente.ClienteCategoria);
          } else {
            // Categorías tradicionales: igualdad exacta
            coincideCategoria =
              cliente.ClienteCategoria === formData.TorneoCategoria;
          }

          // Excluir jugadores que ya están en campeones o vicecampeones
          const yaEstaEnCampeones = campeones.some(
            (c) => c.ClienteId === cliente.ClienteId
          );
          const yaEstaEnVicecampeones = vicecampeones.some(
            (v) => v.ClienteId === cliente.ClienteId
          );

          return (
            coincideTexto &&
            coincideCategoria &&
            !yaEstaEnCampeones &&
            !yaEstaEnVicecampeones
          );
        })
        .sort((a, b) => {
          const nombreA =
            `${a.ClienteNombre} ${a.ClienteApellido}`.toLowerCase();
          const nombreB =
            `${b.ClienteNombre} ${b.ClienteApellido}`.toLowerCase();
          return nombreA.localeCompare(nombreB);
        })
    : [];

  const handleSelectCampeon = (cliente: Cliente) => {
    setNuevoCampeon((prev) => ({
      ...prev,
      ClienteId: cliente.ClienteId,
    }));
    setBusquedaCampeon(`${cliente.ClienteNombre} ${cliente.ClienteApellido}`);
    setIsDropdownCampeonOpen(false);
  };

  const handleSelectVicecampeon = (cliente: Cliente) => {
    setNuevoVicecampeon((prev) => ({
      ...prev,
      ClienteId: cliente.ClienteId,
    }));
    setBusquedaVicecampeon(
      `${cliente.ClienteNombre} ${cliente.ClienteApellido}`
    );
    setIsDropdownVicecampeonOpen(false);
  };

  const handleToggleDropdownCampeon = () => {
    setIsDropdownCampeonOpen(!isDropdownCampeonOpen);
    if (!isDropdownCampeonOpen) {
      setBusquedaCampeon("");
    }
  };

  const handleToggleDropdownVicecampeon = () => {
    setIsDropdownVicecampeonOpen(!isDropdownVicecampeonOpen);
    if (!isDropdownVicecampeonOpen) {
      setBusquedaVicecampeon("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validar que haya exactamente 2 campeones
    if (campeones.length !== 2) {
      Swal.fire({
        icon: "warning",
        title: "Campeones insuficientes",
        text: "Debe agregar exactamente 2 campeones",
      });
      return;
    }

    // Validar que haya exactamente 2 vicecampeones
    if (vicecampeones.length !== 2) {
      Swal.fire({
        icon: "warning",
        title: "Vicecampeones insuficientes",
        text: "Debe agregar exactamente 2 vicecampeones",
      });
      return;
    }

    onSubmit({
      ...formData,
      TorneoId: currentTorneo?.TorneoId,
      campeones: campeones.map((c) => ({ ClienteId: c.ClienteId })),
      vicecampeones: vicecampeones.map((v) => ({ ClienteId: v.ClienteId })),
    } as unknown as Torneo);
  };

  // Función para formatear los campeones y vicecampeones en la tabla
  const formatearJugadores = (torneo: Torneo) => {
    const campeonesList = torneo.campeones || [];
    const vicecampeonesList = torneo.vicecampeones || [];

    return (
      <div className="text-sm">
        <div className="mb-1">
          <span className="font-semibold text-yellow-600">🏆 Campeones: </span>
          {campeonesList.length > 0 ? (
            <span className="text-yellow-700">
              {campeonesList
                .map((c) => `${c.ClienteNombre} ${c.ClienteApellido}`)
                .join(", ")}
            </span>
          ) : (
            <span className="text-gray-500">No asignados</span>
          )}
        </div>
        <div>
          <span className="font-semibold text-gray-600">
            🥈 Vicecampeones:{" "}
          </span>
          {vicecampeonesList.length > 0 ? (
            <span className="text-gray-700">
              {vicecampeonesList
                .map((v) => `${v.ClienteNombre} ${v.ClienteApellido}`)
                .join(", ")}
            </span>
          ) : (
            <span className="text-gray-500">No asignados</span>
          )}
        </div>
      </div>
    );
  };

  const columns = [
    { key: "TorneoId", label: "ID" },
    { key: "TorneoNombre", label: "Nombre" },
    { key: "TorneoCategoria", label: "Categoría" },
    { key: "TorneoFechaInicio", label: "Fecha Inicio" },
    { key: "TorneoFechaFin", label: "Fecha Fin" },
    {
      key: "jugadores",
      label: "Campeones y Vicecampeones",
      render: (item: Torneo) => formatearJugadores(item),
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
            placeholder="Buscar torneos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Torneo"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <DataTable<Torneo>
        columns={columns}
        data={torneos}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.TorneoId) : undefined}
        emptyMessage="No se encontraron torneos"
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
                  {currentTorneo
                    ? `Editar torneo ID: ${currentTorneo.TorneoId} - ${currentTorneo.TorneoNombre}`
                    : "Crear nuevo torneo"}
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
                {/* Información del Torneo */}
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Nombre del Torneo
                    </label>
                    <input
                      type="text"
                      name="TorneoNombre"
                      value={formData.TorneoNombre}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                      placeholder="Ej: Torneo Verano 2024"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      name="TorneoFechaInicio"
                      value={formData.TorneoFechaInicio}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      name="TorneoFechaFin"
                      value={formData.TorneoFechaFin}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Categoría
                    </label>
                    <select
                      name="TorneoCategoria"
                      value={formData.TorneoCategoria}
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
                </div>

                {/* Campeones */}
                <div className="col-span-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    🏆 Campeones (2 jugadores)
                  </label>

                  {/* Formulario para agregar campeón */}
                  <div className="grid grid-cols-6 gap-4 mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="col-span-6 sm:col-span-4 dropdown-campeon">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Seleccionar Campeón
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaCampeon}
                          onChange={handleBusquedaCampeon}
                          onFocus={() => setIsDropdownCampeonOpen(true)}
                          className="bg-white border border-gray-300 text-gray-900 text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          placeholder="Buscar jugador..."
                        />
                        <button
                          type="button"
                          onClick={handleToggleDropdownCampeon}
                          className="absolute inset-y-0 right-0 flex items-center pr-2"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isDropdownCampeonOpen ? "rotate-180" : ""
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
                        {isDropdownCampeonOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {formData.TorneoCategoria ? (
                              <>
                                <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-gray-200 font-medium">
                                  Mostrando jugadores de categoría:{" "}
                                  {formData.TorneoCategoria}
                                </div>
                                {clientesFiltradosCampeon.length > 0 ? (
                                  clientesFiltradosCampeon.map((cliente) => (
                                    <div
                                      key={cliente.ClienteId}
                                      onClick={() =>
                                        handleSelectCampeon(cliente)
                                      }
                                      className="px-3 py-2 text-xs text-gray-900 cursor-pointer hover:bg-yellow-50 hover:text-yellow-600"
                                    >
                                      {cliente.ClienteNombre}{" "}
                                      {cliente.ClienteApellido}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-xs text-gray-500">
                                    No se encontraron jugadores en la categoría{" "}
                                    {formData.TorneoCategoria}
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
                        Acción
                      </label>
                      <button
                        type="button"
                        onClick={handleAgregarCampeon}
                        className="w-full bg-yellow-600 text-white text-xs px-3 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={campeones.length >= 2}
                      >
                        {campeones.length >= 2 ? "Máximo 2" : "Agregar Campeón"}
                      </button>
                    </div>
                  </div>

                  {/* Indicador de campeones */}
                  <div
                    className={`mb-2 p-2 rounded-lg ${
                      campeones.length === 2
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-yellow-100"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        campeones.length === 2
                          ? "text-yellow-800 font-semibold"
                          : "text-yellow-700"
                      }`}
                    >
                      Campeones agregados: {campeones.length}/2
                      {campeones.length === 2 && " ✓"}
                    </p>
                  </div>

                  {/* Lista de campeones */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {campeones.map((campeon, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">
                            🏆 {campeon.ClienteNombre} {campeon.ClienteApellido}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarCampeon(index)}
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

                {/* Vicecampeones */}
                <div className="col-span-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    🥈 Vicecampeones (2 jugadores)
                  </label>

                  {/* Formulario para agregar vicecampeón */}
                  <div className="grid grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="col-span-6 sm:col-span-4 dropdown-vicecampeon">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Seleccionar Vicecampeón
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaVicecampeon}
                          onChange={handleBusquedaVicecampeon}
                          onFocus={() => setIsDropdownVicecampeonOpen(true)}
                          className="bg-white border border-gray-300 text-gray-900 text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          placeholder="Buscar jugador..."
                        />
                        <button
                          type="button"
                          onClick={handleToggleDropdownVicecampeon}
                          className="absolute inset-y-0 right-0 flex items-center pr-2"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isDropdownVicecampeonOpen ? "rotate-180" : ""
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
                        {isDropdownVicecampeonOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {formData.TorneoCategoria ? (
                              <>
                                <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-gray-200 font-medium">
                                  Mostrando jugadores de categoría:{" "}
                                  {formData.TorneoCategoria}
                                </div>
                                {clientesFiltradosVicecampeon.length > 0 ? (
                                  clientesFiltradosVicecampeon.map(
                                    (cliente) => (
                                      <div
                                        key={cliente.ClienteId}
                                        onClick={() =>
                                          handleSelectVicecampeon(cliente)
                                        }
                                        className="px-3 py-2 text-xs text-gray-900 cursor-pointer hover:bg-gray-50 hover:text-gray-600"
                                      >
                                        {cliente.ClienteNombre}{" "}
                                        {cliente.ClienteApellido}
                                      </div>
                                    )
                                  )
                                ) : (
                                  <div className="px-3 py-2 text-xs text-gray-500">
                                    No se encontraron jugadores en la categoría{" "}
                                    {formData.TorneoCategoria}
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
                        Acción
                      </label>
                      <button
                        type="button"
                        onClick={handleAgregarVicecampeon}
                        className="w-full bg-gray-600 text-white text-xs px-3 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={vicecampeones.length >= 2}
                      >
                        {vicecampeones.length >= 2
                          ? "Máximo 2"
                          : "Agregar Vicecampeón"}
                      </button>
                    </div>
                  </div>

                  {/* Indicador de vicecampeones */}
                  <div
                    className={`mb-2 p-2 rounded-lg ${
                      vicecampeones.length === 2
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-gray-100"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        vicecampeones.length === 2
                          ? "text-gray-800 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      Vicecampeones agregados: {vicecampeones.length}/2
                      {vicecampeones.length === 2 && " ✓"}
                    </p>
                  </div>

                  {/* Lista de vicecampeones */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {vicecampeones.map((vicecampeon, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            🥈 {vicecampeon.ClienteNombre}{" "}
                            {vicecampeon.ClienteApellido}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarVicecampeon(index)}
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
                  label={currentTorneo ? "Actualizar" : "Crear"}
                  type="submit"
                  disabled={
                    campeones.length !== 2 || vicecampeones.length !== 2
                  }
                  className={
                    campeones.length !== 2 || vicecampeones.length !== 2
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
    </>
  );
}
