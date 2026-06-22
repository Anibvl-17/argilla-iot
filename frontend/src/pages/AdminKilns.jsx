// Opcional: Iconos para botones de acción (ej: lucide-react)
// import { Edit2, MoreHorizontal, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import Modal from "@components/Modal";
import {
  getAllKilns,
  createKiln,
  updateKiln,
  deleteKiln,
} from "@services/kiln.service";
import {
  LuLink,
  LuPencil,
  LuTrash2,
  LuUnlink,
  LuUserRoundMinus,
  LuUserRoundPlus,
} from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "../components/AlertDialog";

const AdminStatusBadge = ({ status }) => {
  const styles = {
    OPERATIONAL: "bg-green-500/10 text-green-400 border-green-500/20",
    MAINTENANCE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    UNASSIGNED: "bg-neutral-800 text-neutral-400 border-neutral-700",
  };
  const labels = {
    OPERATIONAL: "Operativo",
    MAINTENANCE: "Soporte",
    UNASSIGNED: "Stock",
  };

  return (
    <span
      className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

const kilnFields = [
  {
    name: "name",
    label: "Nombre del horno",
    type: "text",
    placeholder: "Horno Taller #40",
  },
  {
    name: "liters",
    label: "Capacidad (Litros)",
    type: "number",
    placeholder: "40",
  },
  {
    name: "amps",
    label: "Amperaje",
    type: "number",
    placeholder: "25",
  },
  { name: "volts", label: "Voltaje", type: "number", placeholder: "220" },
  {
    name: "phases",
    label: "Fases",
    type: "select",
    options: [
      { value: "1", label: "Monofásico" },
      { value: "3", label: "Trifásico" },
    ],
  },
];

const buildModalErrorMessage = (response) => {
  const details = response?.data?.errorDetails;

  if (Array.isArray(details) && details.length > 0) {
    return details.join(" ");
  }

  return response?.message || "No se pudo guardar el horno.";
};

const normalizeKilnFormData = (formData) => ({
  ...formData,
  liters: Number(formData.liters),
  amps: Number(formData.amps),
  volts: Number(formData.volts),
  phases: Number(formData.phases),
});

export default function AdminKilns() {
  const [loading, setLoading] = useState(false);
  const [kilns, setKilns] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedKiln, setSelectedKiln] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const filteredKilns = kilns.filter((kiln) => {
    const searchLowercase = searchTerm.toLowerCase();

    const results = () => {
      if (searchTerm.length < 5) {
        return (
          kiln.kilnId.toString().includes(searchLowercase) ||
          (kiln.user && kiln.user.name.toLowerCase().includes(searchLowercase))
        );
      } else {
        return (
          kiln.kilnId.toString().includes(searchLowercase) ||
          (kiln.user &&
            kiln.user.name.toLowerCase().includes(searchLowercase)) ||
          (kiln.controllerId &&
            kiln.controller.controllerId
              .toLowerCase()
              .includes(searchLowercase))
        );
      }
    };

    return results();
  });

  const fetchKilns = async () => {
    try {
      setLoading(true);
      const result = await getAllKilns();
      setKilns(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKilns();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedKiln(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (kiln) => {
    setModalMode("edit");
    setSelectedKiln(kiln);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedKiln(null);
  };

  const handleCreateKiln = async (formData) => {
    setLoading(true);
    setModalError(null);

    try {
      const data = normalizeKilnFormData(formData);
      const response =
        modalMode === "create"
          ? await createKiln(data)
          : await updateKiln(selectedKiln.kilnId, data);

      if (response.success) {
        closeModal();
        fetchKilns();
        return;
      }

      setModalError(buildModalErrorMessage(response));
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          error.message ||
          "Ocurrió un error inesperado al conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const response = await deleteKiln(selectedKiln.kilnId);

      if (response.success) {
        toast.success("Horno eliminado exitosamente.");
        fetchKilns();
      }
    } catch (error) {
      toast.error("Error al eliminar horno", error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedKiln(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hornos</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Gestión centralizada de todos los hornos de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-red-700 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Añadir Nuevo Horno
        </button>
      </div>

      {/* Cards de Resumen */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
              Total Hornos
            </p>
            <p className="text-3xl font-bold">{kilns.length}</p>
          </div>
          <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
              Sin Controlador
            </p>
            <p className="text-3xl font-bold text-neutral-300">
              {kilns.filter((k) => !k.controller).length}
            </p>
          </div>
          <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
              Sin Propietario
            </p>
            <p className="text-3xl font-bold text-neutral-300">
              {kilns.filter((k) => !k.user).length}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#141414] p-4 border border-neutral-800 rounded-xl">
        <div className="relative w-full sm:w-96">
          {/* Icono de Lupa  */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            placeholder="Buscar por ID, propietario, ID controlador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
          />
        </div>

        {/* Opcional: Botón de filtros extra */}
        <button className="w-full sm:w-auto px-4 py-2.5 bg-[#0a0a0a] border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors flex items-center justify-center gap-2">
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            ></path>
          </svg>
          Filtrar
        </button>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-x-auto shadow-2xl">
        {kilns.length > 0 ? (
          !loading && (
            <table className="w-full text-sm text-left min-w-10">
              {/* Títulos de Columna */}
              <thead className="text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800 bg-[#0a0a0a]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Propietario
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Controlador
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-medium text-center "
                  >
                    Litros
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Datos eléctricos
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la Tabla */}
              <tbody className="divide-y divide-neutral-800/60">
                {filteredKilns.length > 0 ? (
                  filteredKilns.map((kiln) => (
                    <tr
                      key={kiln.kilnId}
                      className="hover:bg-neutral-900/30 transition-colors"
                    >
                      {/* Columna ID */}
                      <td className="text-base px-6 py-5 font-mono text-neutral-400">
                        {kiln.kilnId}
                      </td>

                      {/* Columna Propietario */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          {kiln.user ? (
                            <>
                              <span className="font-semibold text-neutral-100 text-base">
                                {kiln.user.name}
                              </span>
                              <span className="text-sm text-neutral-400 mt-0.5">
                                {kiln.user.email}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-neutral-400/70 italic">
                              Sin propietario
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Columna ID Controlador */}
                      <td className="px-6 py-5 text-sm">
                        {kiln.controllerId ? (
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(kiln.controllerId);
                              toast.success("¡ID copiada!");
                            }}
                            title={"Copiar id: " + kiln.controllerId}
                            className="font-mono bg-neutral-800/60 px-2.5 py-1 rounded-md border border-neutral-700/60 text-red-400 truncate hover:underline hover:cursor-pointer"
                          >
                            ...{kiln.controllerId.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-neutral-400/70 italic">
                            No vinculado
                          </span>
                        )}
                      </td>

                      {/* Columna Estado badge */}
                      <td className="px-6 py-5 text-center">
                        <AdminStatusBadge status={kiln.status} />
                      </td>

                      {/* Columna Litros */}
                      <td className="px-6 py-5 text-center text-neutral-400">
                        {kiln.liters} litros
                      </td>

                      {/* Columna Voltaje Amperaje */}
                      <td className="px-6 py-5 text-center text-neutral-400">
                        <span className="font-mono">
                          {kiln.amps}A - {kiln.volts}V
                        </span>{" "}
                        <br />
                        <span className="text-neutral-400/70">
                          {kiln.phases === 1 ? "Monofásico" : "Trifásico"}{" "}
                        </span>
                      </td>

                      {/* Columna: Botones de Acción */}
                      <td className="px-6 py-5 text-center text-lg">
                        <div className="flex justify-center gap-2">
                          {/* Enlazar/Desenlazar usuario */}
                          {kiln.user ? (
                            <button
                              onClick={() => {
                                setIsAlertOpen(true);
                              }}
                              className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                              title="Desenlazar usuario"
                            >
                              <LuUserRoundMinus />
                            </button>
                          ) : (
                            <button
                              className="p-2 rounded-lg text-neutral-400 hover:text-green-300 hover:bg-green-300/10 transition-colors hover:cursor-pointer"
                              title="Enlazar usuario"
                            >
                              <LuUserRoundPlus />
                            </button>
                          )}

                          {/* Enlazar/Desenlazar controlador */}
                          {kiln.controller ? (
                            <button
                              className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                              title="Desenlazar controlador"
                            >
                              <LuUnlink />
                            </button>
                          ) : (
                            <button
                              className="p-2 rounded-lg text-neutral-400 hover:text-green-300 hover:bg-green-300/10 transition-colors hover:cursor-pointer"
                              title="Enlazar controlador"
                            >
                              <LuLink />
                            </button>
                          )}

                          {/* Editar datos */}
                          <button
                            onClick={() => openEditModal(kiln)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hover:cursor-pointer"
                            title="Editar datos"
                          >
                            <LuPencil />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => {
                              setSelectedKiln(kiln);
                              setIsAlertOpen(true);
                            }}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                            title="Eliminar horno"
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-neutral-500"
                    >
                      No se encontraron hornos que coincidan con la búsqueda "
                      {searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        ) : (
          <p className="text-neutral-400 text-sm/relaxed p-4 text-center">
            No hay hornos registrados. <br/>Haz click en el botón{" "}
            <span className="rounded-lg font-medium">
              Añadir Nuevo horno
            </span>{" "}
            para registrar un horno.
          </p>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === "create" ? "Crear Nuevo Horno" : "Editar Horno"}
        fields={kilnFields}
        initialData={selectedKiln}
        submitLabel={modalMode === "create" ? "Crear Horno" : "Guardar Cambios"}
        onSubmit={handleCreateKiln}
        error={modalError}
        loading={loading}
        onClearError={() => setModalError(null)}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedKiln(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar horno?"
        CustomMessage={() => (
          <p className="text-neutral-400">
            El horno{" "}
            <span className="font-bold">
              {selectedKiln?.kilnId} - "{selectedKiln?.name}"
            </span>{" "}
            será eliminado permanentemente
          </p>
        )}
        type="danger"
        confirmText="Eliminar horno"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
