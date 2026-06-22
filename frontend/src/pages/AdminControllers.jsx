import { useEffect, useState } from "react";
import Modal from "@components/Modal";
import {
  createController,
  deleteController,
  getAllControllers,
  updateController,
} from "@services/controller.service";
import { CONTROLLER_LINK_STATUS_LABELS } from "@constants/controller.constants";
import { LuLink, LuPencil, LuTrash2, LuUnlink } from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "../components/AlertDialog";
import { Badge } from "../components/Badge";
import {
  CONTROLLER_LINK_STATUS,
  SWITCH_LABELS,
} from "../constants/controller.constants";

const controllerFields = [
  {
    name: "switchAmps",
    label: "Amperaje Switch",
    type: "number",
    placeholder: "20",
  },
  {
    name: "switchType",
    label: "Tipo Switch",
    type: "select",
    options: [
      { value: "SSR", label: "SSR" },
      { value: "CONTACTOR", label: "Contactor" },
    ],
  },
];

const buildModalErrorMessage = (response) => {
  const details = response?.data?.errorDetails;

  if (Array.isArray(details) && details.length > 0) {
    return details.join(" ");
  }

  return response?.message || "No se pudo guardar el controlador.";
};

const normalizeControllerFormData = (formData) => ({
  ...formData,
  switchAmps: Number(formData.switchAmps),
});

export default function AdminControllers() {
  const [loading, setLoading] = useState(false);
  const [controllers, setControllers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedController, setSelectedController] = useState(null);

  const filteredControllers = controllers.filter((controller) => {
    const searchLowercase = searchTerm.toLowerCase();
    return controller.controllerId.toLowerCase().includes(searchLowercase);
  });

  const fetchControllers = async () => {
    try {
      setLoading(true);
      const result = await getAllControllers();
      setControllers(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchControllers();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedController(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (controller) => {
    setModalMode("edit");
    setSelectedController(controller);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedController(null);
  };

  const handleSubmitController = async (formData) => {
    setLoading(true);
    setModalError(null);

    try {
      const data = normalizeControllerFormData(formData);
      const response =
        modalMode === "create"
          ? await createController(data)
          : await updateController(selectedController.controllerId, data);

      if (response.success) {
        closeModal();
        fetchControllers();
        return;
      }

      setModalError(buildModalErrorMessage(response));
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          error.message ||
          "Ocurrio un error inesperado al conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const response = await deleteController(selectedController.controllerId);

      if (response.success) {
        toast.success("Controlador eliminado exitosamente.");
        fetchControllers();
      }
    } catch (error) {
      toast.error("Error al eliminar controlador", error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedController(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controladores</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Gestión centralizada de todos los controladores de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-red-700 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Añadir Nuevo Controlador
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
            Total Controladores
          </p>
          <p className="text-3xl font-bold">{controllers.length}</p>
        </div>
        <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
            Asignados a Hornos
          </p>
          <p className="text-3xl font-bold text-green-400">
            {controllers.filter((c) => c.kiln).length}
          </p>
        </div>
        <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
            Fuera de servicio
          </p>
          <p className="text-3xl font-bold text-yellow-500">---</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#141414] p-4 border border-neutral-800 rounded-xl">
        <div className="relative w-full sm:w-96">
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
            placeholder="Buscar por ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
          />
        </div>

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

      {/* Tabla */}
      {controllers.length > 0 ? (
        !loading && (
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-x-auto shadow-2xl">
            <table className="w-full text-sm text-left min-w-10">
              <thead className="text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800 bg-[#0a0a0a]">
                <tr>
                  <th
                    scope="col"
                    className="flex flex-row items-end gap-2 px-6 py-4 font-medium"
                  >
                    ID
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    ID Horno / Propietario
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Estado de vinculación
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Amperaje del Switch
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Tipo de Switch
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800/60">
                {filteredControllers.length > 0 ? (
                  filteredControllers.map((controller) => (
                    <tr
                      key={controller.controllerId}
                      className="hover:bg-neutral-900/30 transition-colors"
                    >
                      {/* ID */}
                      <td
                        onClick={() => {
                          navigator.clipboard.writeText(
                            controller.controllerId,
                          );
                          toast.success("¡ID copiada!");
                        }}
                        className="px-6 py-5 text-base font-mono text-red-400 hover:underline hover:cursor-pointer"
                        title={"Copiar ID: " + controller.controllerId}
                      >
                        ...{controller.controllerId.slice(-6)}
                      </td>

                      {/* Horno asignado */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          {controller.kiln ? (
                            <>
                              <span className="font-semibold text-neutral-300 text-base">
                                {controller.kiln.kilnId}
                              </span>
                              {controller.kiln.user ? (
                                <span className="text-sm text-neutral-400 mt-0.5">
                                  {controller.kiln.user.name}
                                </span>
                              ) : (
                                <span className="text-neutral-400/70 italic">
                                  Sin propietario
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-neutral-400/70 italic">
                              Sin horno asignado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado vinculación */}
                      <td className="px-6 py-5 font-mono text-xs">
                        <Badge
                          style={
                            controller.linkStatus ===
                            CONTROLLER_LINK_STATUS.UNLINKED
                              ? "default"
                              : "success"
                          }
                          text={
                            CONTROLLER_LINK_STATUS_LABELS[
                              controller.linkStatus
                            ] ?? controller.status
                          }
                        />
                      </td>

                      {/* Amperaje switch */}
                      <td className="px-6 py-5 text-center font-mono text-neutral-400">
                        {controller.switchAmps} A
                      </td>

                      {/* Tipo switch */}
                      <td className="px-6 py-5 text-center justify-center">
                        <span className="flex items-center justify-center">
                          <Badge
                            style="default"
                            text={SWITCH_LABELS[controller.switchType]}
                          />
                        </span>
                      </td>

                      {/* Botones de acción */}
                      <td className="px-6 py-5 text-center text-lg">
                        <div className="flex justify-center gap-2">
                          {controller.kiln ? (
                            <button
                              className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                              title="Desenlazar horno"
                            >
                              <LuUnlink />
                            </button>
                          ) : (
                            <button
                              className="p-2 rounded-lg text-neutral-400 hover:text-green-300 hover:bg-green-300/10 transition-colors hover:cursor-pointer"
                              title="Enlazar horno  "
                            >
                              <LuLink />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(controller)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hover:cursor-pointer"
                            title="Editar datos"
                          >
                            <LuPencil />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedController(controller);
                              setIsAlertOpen(true);
                            }}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                            title="Eliminar controlador"
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
                      colSpan="6"
                      className="px-6 py-12 text-center text-neutral-500"
                    >
                      No se encontraron controladores que coincidan con "
                      {searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-neutral-400 text-sm p-4 flex flex-row items-center gap-2 justify-center">
          No hay controladores registrados. Haz click en{" "}
          <span className="px-5 py-2.5 rounded-lg font-medium border border-dashed border-neutral-400">
            Añadir nuevo controlador
          </span>{" "}
          para registrar controladores.
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalMode === "create"
            ? "Crear Nuevo Controlador"
            : "Editar Controlador"
        }
        fields={controllerFields}
        initialData={selectedController}
        submitLabel={
          modalMode === "create" ? "Crear Controlador" : "Guardar Cambios"
        }
        onSubmit={handleSubmitController}
        error={modalError}
        loading={loading}
        onClearError={() => setModalError(null)}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedController(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar controlador?"
        CustomMessage={() => (
          <p className="text-neutral-400">
            El controlador{" "}
            <span
              title={selectedController?.controllerId}
              className="font-mono hover:cursor-help"
            >
              ...{selectedController?.controllerId?.slice(-6)}
            </span>{" "}
            será eliminado permanentemente
          </p>
        )}
        type="danger"
        confirmText="Eliminar controlador"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
