import { useEffect, useRef, useState } from "react";
import Modal from "@components/Modal";
import {
  createController,
  deleteController,
  getAllControllers,
  updateController,
} from "@services/controller.service";
import {
  LuPencil,
  LuRectangleEllipsis,
  LuTrash2,
  LuTriangleAlert,
  LuUserRoundPen,
  LuUserRoundPlus,
} from "react-icons/lu";
import {
  CONTROLLER_LINK_STATUS,
  SWITCH_LABELS,
} from "../constants/controller.constants";
import { getAllUsers } from "@services/user.service";
import { toast } from "sonner";
import { Badge } from "@components/Badge";
import { CONTROLLER_LINK_STATUS_LABELS } from "@constants/controller.constants";
import {
  generateControllerPin,
  linkUserToController,
  unlinkUserFromController,
} from "../services/controller.service";
import AlertDialog from "../components/AlertDialog";

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

const linkUserFields = [{ name: "userId", label: "Usuario", type: "custom" }];

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

const LinkStatusStyle = {
  [CONTROLLER_LINK_STATUS.UNLINKED]: "default",
  [CONTROLLER_LINK_STATUS.LINKED_TO_KILN]: "info",
  [CONTROLLER_LINK_STATUS.LINKED_TO_USER]: "info",
  [CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER]: "success",
};

const normalizeSearchTerm = (value) => value.trim().toLowerCase();

export default function AdminControllers() {
  const [loading, setLoading] = useState(false);
  const [controllers, setControllers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedController, setSelectedController] = useState(null);
  const [selectedUserToLink, setSelectedUserToLink] = useState(null);
  const [linkUserError, setLinkUserError] = useState(null);
  const [linkUserSearchTerm, setLinkUserSearchTerm] = useState("");
  const [linkPin, setLinkPin] = useState(undefined);
  const linkUserSearchRef = useRef(null);

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

  const openLinkUserModal = (controller) => {
    setSelectedController(controller);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
    //setIsLinkControllerModalOpen(false);
    setIsAlertOpen(false);
    setIsLinkUserModalOpen(true);

    if (users.length === 0 && !loading) {
      fetchUsers();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedController(null);
  };

  const closeLinkUserModal = () => {
    setIsLinkUserModalOpen(false);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsers();
      setUsers(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUserSubmit = async ({ userId }) => {
    if (!selectedController) {
      setLinkUserError("Selecciona un horno antes de enlazar un usuario.");
      return;
    }

    if (
      !selectedUserToLink ||
      String(selectedUserToLink.userId) !== String(userId)
    ) {
      setLinkUserError("Selecciona un usuario de la lista para continuar.");
      return;
    }

    if (parseInt(selectedController?.userId) === parseInt(userId)) {
      setLinkUserError(
        "El controlador ya está vinculado al usuario seleccionado",
      );
      return;
    }

    try {
      const response = await linkUserToController(
        selectedController.controllerId.slice(-6),
        parseInt(userId),
        parseInt(linkPin),
      );
      if (response.success) {
        toast.success(
          `Usuario ${selectedUserToLink.name} enlazado al controlador ID ${selectedController.controllerId}.`,
        );
        fetchControllers();
        fetchUsers();
      } else {
        throw new Error("Error al vincular usuario");
      }
    } catch (error) {
      toast.error("Error al vincular usuario", { description: error.message });
    } finally {
      closeLinkUserModal();
    }
  };

  const handleUnlinkUser = async () => {
    if (!selectedController?.userId) {
      setLinkUserError("El horno no tiene un usuario vinculado.");
      return;
    }

    try {
      const response = await unlinkUserFromController(
        selectedController.controllerId,
        parseInt(selectedController.userId),
      );

      if (response.success) {
        toast.success(
          `Usuario desvinculado del controlador ID ${selectedController.controllerId}.`,
        );
        fetchControllers();
        fetchUsers();
        closeLinkUserModal();
        return;
      }

      throw new Error(response.message);
    } catch (error) {
      toast.error(
        "Error al desvincular usuario",
        error.errorDetails
          ? {
              description: error,
            }
          : null,
      );
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

  const filteredUsersForLink = users
    .filter((user) => {
      if (user.userId === selectedController?.user?.userId) return false;
      if (user.userId === selectedUserToLink?.userId) return false;

      const search = normalizeSearchTerm(linkUserSearchTerm);

      if (!search) {
        return false;
      }

      return (
        String(user.userId).toLowerCase().includes(search) ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    })
    .slice(0, 8);

  const selectedControllerHasOwner = selectedController?.user ? true : false;

  return (
    <div className="min-w-0 space-y-6 text-white">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Controladores</h1>
          <p className="text-neutral-300 mt-1 text-sm">
            Gestión centralizada de todos los controladores de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 sm:w-auto"
        >
          Añadir Nuevo Controlador
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Total Controladores
          </p>
          <p className="text-xl font-bold sm:text-3xl">{controllers.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Horno
          </p>
          <p className="text-xl font-bold text-blue-400/90 sm:text-3xl">
            {controllers.filter((c) => c.kiln).length}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Usuario
          </p>
          <p className="text-xl font-bold text-blue-400/90 sm:text-3xl">
            {controllers.filter((c) => c.user).length}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Horno y Usuario
          </p>
          <p className="text-xl font-bold text-green-400/90 sm:text-3xl">
            {controllers.filter((c) => c.kiln && c.user).length}
          </p>
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
      </div>

      {/* Tabla */}
      <div className="max-h-[65dvh] overflow-auto rounded-2xl border border-neutral-800 bg-[#141414] shadow-2xl">
        {controllers.length > 0 ? (
          !loading && (
            <table className="w-full min-w-110 text-left text-xs sm:min-w-205 sm:text-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th
                    scope="col"
                    className="flex flex-row items-end gap-2 px-3 py-3 font-medium sm:px-6 sm:py-4"
                  >
                    ID
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-6 sm:py-4">
                    Propietario / Horno asignado
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium sm:px-6 sm:py-4">
                    Estado de vinculación
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4">
                    Amperaje del Switch
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4">
                    Tipo de Switch
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4">
                    PIN activo
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-medium sm:px-6 sm:py-4">
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
                        className="px-3 py-4 font-mono text-red-400 hover:cursor-pointer hover:underline sm:px-6 sm:py-5 sm:text-base"
                        title={"Copiar ID: " + controller.controllerId}
                      >
                        ...{controller.controllerId.slice(-6)}
                      </td>

                      {/* Horno asignado */}
                      <td className="max-w-36 wrap-break-word px-3 py-4 sm:max-w-none sm:px-6 sm:py-5">
                        <div className="flex flex-col">
                          {controller.kiln ? (
                            <span className="font-semibold text-neutral-100 text-base">
                              Horno ID {controller.kiln?.kilnId}
                            </span>
                          ) : (
                            <span className="text-sm text-neutral-400/70 italic">
                              Sin horno asignado
                            </span>
                          )}
                          {controller.user ? (
                            <span className="text-sm text-neutral-300">
                              {controller.user.name}
                            </span>
                          ) : (
                            <span className="text-sm text-neutral-400/70 italic">
                              Sin propietario
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado vinculación */}
                      <td className="px-3 py-4 font-mono text-xs sm:px-6 sm:py-5">
                        <Badge
                          style={LinkStatusStyle[controller.linkStatus]}
                          text={
                            CONTROLLER_LINK_STATUS_LABELS[
                              controller.linkStatus
                            ] ?? controller.status
                          }
                        />
                      </td>

                      {/* Amperaje switch */}
                      <td className="hidden px-3 py-4 text-center font-mono text-neutral-300 md:table-cell sm:px-6 sm:py-5">
                        {controller.switchAmps}
                      </td>

                      {/* Tipo switch */}
                      <td className="hidden px-3 py-4 text-center md:table-cell sm:px-6 sm:py-5">
                        <span className="flex items-center justify-center">
                          <Badge
                            style="default"
                            text={SWITCH_LABELS[controller.switchType]}
                          />
                        </span>
                      </td>

                      {/* PIN activo */}
                      <td className="hidden px-3 py-4 text-center font-mono text-neutral-400 md:table-cell sm:px-6 sm:py-5">
                        {controller.pin || "Inactivo"}
                      </td>

                      {/* Botones de Acción */}
                      <td className="px-2 py-4 text-center text-base sm:px-6 sm:py-5 sm:text-lg">
                        <div className="flex justify-center gap-2">
                          {/* Generar pin */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              await generateControllerPin(
                                controller.controllerId,
                              );
                              fetchControllers();
                            }}
                            className="p-2 rounded-lg text-neutral-400 hover:text-green-400 hover:bg-green-400/10 transition-colors hover:cursor-pointer"
                          >
                            <LuRectangleEllipsis />
                          </button>

                          {/* Enlazar/Desenlazar usuario */}
                          <button
                            onClick={() => openLinkUserModal(controller)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-green-400 hover:bg-green-400/10 transition-colors hover:cursor-pointer"
                            title={
                              controller.user
                                ? "Cambiar usuario"
                                : "Asignar usuario"
                            }
                          >
                            {controller.user ? (
                              <LuUserRoundPen />
                            ) : (
                              <LuUserRoundPlus />
                            )}
                          </button>

                          {/* Enlazar/Desenlazar controlador */}
                          {/*
                          <button
                            onClick={() => openLinkControllerModal(kiln)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                            title={
                              kiln.controller
                                ? "Cambiar controlador"
                                : "Asignar controlador"
                            }
                          >
                            {kiln.controller ? <LuUnlink /> : <LuLink />}
                          </button>
                           */}

                          {/* Editar datos */}
                          <button
                            onClick={() => openEditModal(controller)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hover:cursor-pointer"
                            title="Editar datos"
                          >
                            <LuPencil />
                          </button>

                          {/* Eliminar */}
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
          )
        ) : (
          <p className="text-neutral-300 text-sm/relaxed p-4 text-center">
            No hay controladores registrados. <br />
            Haz click en el botón{" "}
            <span className="rounded-lg font-medium">
              Añadir nuevo controlador
            </span>{" "}
            para registrar un controlador.
          </p>
        )}
      </div>

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

      <Modal
        isOpen={isLinkUserModalOpen}
        onClose={closeLinkUserModal}
        title={
          (selectedControllerHasOwner
            ? "Cambiar usuario "
            : "Asignar usuario ") +
          "a Controlador ID " +
          `...${selectedController?.controllerId.slice(-6)}`
        }
        fields={linkUserFields}
        submitLabel={
          selectedControllerHasOwner ? "Cambiar usuario" : "Asignar usuario"
        }
        onSubmit={handleLinkUserSubmit}
        error={linkUserError}
        loading={false}
        onClearError={() => setLinkUserError(null)}
        renderContent={({ setFormData, onClearError }) => {
          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <div className="relative" ref={linkUserSearchRef}>
                  <label className="text-sm font-medium text-neutral-400 ml-1">
                    Busca por nombre, correo electrónico o ID de usuario
                  </label>
                  <input
                    type="text"
                    value={linkUserSearchTerm}
                    placeholder="ID, nombre o correo del usuario..."
                    onChange={(e) => {
                      const value = e.target.value;
                      setLinkUserSearchTerm(value);
                      setFormData((prev) => ({ ...prev, userId: "" }));

                      if (linkUserError) {
                        onClearError();
                      }
                    }}
                    className="mt-2 w-full bg-[#0a0a0a] border-2 border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-red-600 transition-colors"
                  />

                  {linkUserSearchTerm.trim() && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl">
                      {loading ? (
                        <div className="px-4 py-3 text-sm text-neutral-500">
                          Cargando usuarios...
                        </div>
                      ) : filteredUsersForLink.length > 0 ? (
                        filteredUsersForLink.map((user) => {
                          const isSelected =
                            selectedUserToLink?.userId === user.userId;

                          const isOwner =
                            selectedControllerHasOwner &&
                            selectedController?.user?.userId === user.userId;

                          if (isSelected || isOwner) return;

                          return (
                            <button
                              key={user.userId}
                              type="button"
                              onClick={() => {
                                if (isSelected || isOwner) {
                                  return false;
                                }

                                setSelectedUserToLink(user);
                                setLinkUserSearchTerm("");
                                setFormData((prev) => ({
                                  ...prev,
                                  userId: String(user.userId),
                                }));
                                onClearError();
                              }}
                              className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-neutral-900 hover:cursor-pointer"
                            >
                              <span className="text-sm font-medium text-white">
                                {user.name}
                              </span>
                              <span className="text-xs font-bold text-neutral-400">
                                ID {user.userId} · {user.email}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 text-sm text-neutral-500">
                          No se encontraron usuarios con ese criterio.
                        </div>
                      )}
                    </div>
                  )}

                  <label className="text-sm font-medium text-neutral-400 ml-1">
                    Ingresa el PIN del controlador
                  </label>
                  <input
                    type="number"
                    value={linkPin}
                    placeholder="123456..."
                    onChange={(e) => {
                      const value = e.target.value;
                      setLinkPin(parseInt(value));
                      setFormData((prev) => ({ ...prev, pin: "" }));

                      if (linkUserError) {
                        onClearError();
                      }
                    }}
                    required
                    className="mt-2 w-full bg-[#0a0a0a] border-2 border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-red-600 transition-colors"
                  />
                </div>
              </div>
              {selectedController?.user && (
                <div className="rounded-xl border border-neutral-500 bg-neutral-800 px-4 py-3 flex flex-row flex-wrap items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-300">
                      Propietario actual
                    </p>
                    <p className="mt-1 text-base">
                      {selectedController?.user?.name} -{" "}
                      {selectedController?.user?.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlinkUser}
                    className="inline-flex items-center rounded-lg bg-neutral-700 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 hover:cursor-pointer"
                  >
                    Desvincular usuario
                  </button>
                </div>
              )}

              {selectedUserToLink && (
                <>
                  <div className="rounded-xl border border-neutral-500 bg-neutral-800 px-4 py-3 flex flex-row flex-wrap items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-300">
                        Nuevo propietario
                      </p>
                      <p className="mt-1">
                        {selectedUserToLink.name} - {selectedUserToLink.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserToLink(null)}
                      className="inline-flex items-center rounded-lg bg-neutral-700 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 hover:cursor-pointer"
                    >
                      Quitar selección
                    </button>
                  </div>
                  {selectedControllerHasOwner && (
                    <span className="text-red-300 flex flex-row items-center justify-center gap-2">
                      <LuTriangleAlert className="text-xl" />
                      El propietario actual será desvinculado
                    </span>
                  )}
                </>
              )}
            </div>
          );
        }}
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
          <p className="text-neutral-300">
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
