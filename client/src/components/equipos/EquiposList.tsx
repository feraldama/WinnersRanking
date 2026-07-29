import { useEffect, useRef, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

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
}

interface EquiposListProps {
  equipos: Equipo[];
  onDelete?: (item: Equipo) => void;
  onEdit?: (item: Equipo) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentEquipo?: Equipo | null;
  onSubmit: (formData: Equipo) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

const formularioVacio = {
  id: "",
  EquipoId: "",
  EquipoNombre: "",
  EquipoLogo: "",
  EquipoEstado: true,
};

export default function EquiposList({
  equipos,
  onDelete,
  onEdit,
  onCreate,
  pagination,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  isModalOpen,
  onCloseModal,
  currentEquipo,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: EquiposListProps) {
  const [formData, setFormData] = useState(formularioVacio);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentEquipo) {
      setFormData({
        id: String(currentEquipo.id ?? currentEquipo.EquipoId),
        EquipoId: String(currentEquipo.EquipoId),
        EquipoNombre: currentEquipo.EquipoNombre,
        EquipoLogo: currentEquipo.EquipoLogo || "",
        EquipoEstado: Boolean(currentEquipo.EquipoEstado),
      });
    } else {
      setFormData(formularioVacio);
    }
  }, [currentEquipo]);

  // El logo se envía como base64 sin el prefijo data:
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        EquipoLogo: (reader.result as string).split(",")[1] || "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, EquipoLogo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData as unknown as Equipo);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "EquipoId", label: "ID" },
    {
      key: "EquipoLogo",
      label: "Logo",
      render: (item: Equipo) =>
        item.EquipoLogo ? (
          <img
            src={`data:image/png;base64,${item.EquipoLogo}`}
            alt={item.EquipoNombre}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-gray-400 text-xs">Sin logo</span>
        ),
    },
    { key: "EquipoNombre", label: "Nombre" },
    { key: "EquipoJugadores", label: "Jugadores" },
    {
      key: "EquipoEstado",
      label: "Estado",
      render: (item: Equipo) => (item.EquipoEstado ? "ACTIVO" : "INACTIVO"),
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
            placeholder="Buscar equipos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Equipo"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {equipos.length} de {pagination?.totalItems} equipos
        </div>
      </div>
      <DataTable<Equipo>
        columns={columns}
        data={equipos}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron equipos"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentEquipo
                    ? `Editar equipo: ${currentEquipo.EquipoId}`
                    : "Crear nuevo equipo"}
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
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="EquipoNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="EquipoNombre"
                      id="EquipoNombre"
                      value={formData.EquipoNombre}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          EquipoNombre: e.target.value.toUpperCase(),
                        }))
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="EquipoEstado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Estado
                    </label>
                    <select
                      name="EquipoEstado"
                      id="EquipoEstado"
                      value={formData.EquipoEstado ? "true" : "false"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          EquipoEstado: e.target.value === "true",
                        }))
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                  <div className="col-span-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Logo del equipo
                    </label>
                    <div className="flex items-center gap-4 mb-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 border border-blue-300 bg-white rounded px-3 py-1 text-sm font-medium cursor-pointer"
                      >
                        Seleccionar imagen
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      {formData.EquipoLogo && (
                        <>
                          <img
                            src={`data:image/png;base64,${formData.EquipoLogo}`}
                            alt="Logo del equipo"
                            className="w-24 h-24 object-contain border rounded"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="text-red-600 hover:text-red-800 border border-red-300 bg-white rounded px-3 py-1 text-sm"
                          >
                            Eliminar logo
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Recomendado: PNG cuadrado de hasta 200x200 px.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentEquipo ? "Actualizar" : "Crear"}
                  type="submit"
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
