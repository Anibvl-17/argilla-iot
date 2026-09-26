import { LuCopy } from "react-icons/lu";
import { toast } from "sonner";
import {
  getControllerActivityLabel,
  getControllerConnectionLabel,
  getOperationalStatusLabel,
  getPhaseCountLabel,
  getSwitchLabel,
} from "@constants/controller.constants";
import { summarizeHeatingCircuit } from "../utils/heatingCircuit";

function formatEquipmentDate(value, fallback = "Sin registro") {
  return value ? new Date(value).toLocaleDateString("es-CL") : fallback;
}

export function EquipmentDetail({
  label,
  value,
  description,
  copyValue,
  action,
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm text-content">
          <span className="wrap-break-word">{value ?? "No disponible"}</span>
          {copyValue && (
            <button
              type="button"
              className="shrink-0 text-sm text-muted hover:cursor-pointer hover:text-accent"
              title="Copiar ID"
              aria-label="Copiar ID del controlador"
              onClick={() => {
                navigator.clipboard.writeText(copyValue);
                toast.success("¡ID copiada!");
              }}
            >
              <LuCopy />
            </button>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-secondary">{description}</p>
        )}
        {action && <div className="mt-1 text-sm">{action}</div>}
      </dd>
    </div>
  );
}

function electricalValue(kiln) {
  if (kiln?.nominalVoltage == null || kiln?.nominalCurrent == null) {
    return "No disponible";
  }
  return `${kiln.nominalVoltage} V - ${kiln.nominalCurrent} A`;
}

function switchValue(controller) {
  if (!controller?.switchType || controller?.switchCurrentCapacity == null) {
    return "No disponible";
  }
  return `${getSwitchLabel(controller.switchType)} ${controller.switchCurrentCapacity} A`;
}

export function KilnEquipmentDetails({
  kiln,
  controller = kiln?.controller,
  showFiringCount = false,
  showSwitch = true,
  circuitAction,
  className = "",
}) {
  const circuit = summarizeHeatingCircuit(kiln?.heatingCircuitConfiguration);
  const circuitAvailable = Boolean(kiln?.heatingCircuitConfiguration);

  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-6 ${className}`}>
      <EquipmentDetail
        label="Capacidad"
        value={kiln?.liters == null ? "No disponible" : `${kiln.liters} litros`}
      />
      <EquipmentDetail
        label="Datos eléctricos"
        value={electricalValue(kiln)}
        description={
          kiln?.phaseCount == null
            ? undefined
            : getPhaseCountLabel(kiln.phaseCount)
        }
      />
      <EquipmentDetail
        label="Estado"
        value={getOperationalStatusLabel(kiln?.operationalStatus)}
      />
      <EquipmentDetail
        label="Circuito"
        value={
          circuitAvailable
            ? `${circuit.groups} ${circuit.groups === 1 ? "grupo" : "grupos"}, ${circuit.channels} ${circuit.channels === 1 ? "canal" : "canales"}`
            : "No disponible"
        }
        action={circuitAvailable ? circuitAction : undefined}
      />
      <EquipmentDetail
        label="Fabricante"
        value={kiln?.manufacturer || "Sin registro"}
      />
      <EquipmentDetail
        label="Fecha de fabricación"
        value={formatEquipmentDate(kiln?.manufacturedAt)}
      />
      <EquipmentDetail
        label="Fecha de entrega"
        value={formatEquipmentDate(kiln?.deliveredAt, "Pendiente")}
      />
      {showSwitch && (
        <EquipmentDetail label="Switch" value={switchValue(controller)} />
      )}
      {showFiringCount && (
        <EquipmentDetail
          label="Quemas realizadas"
          value={kiln?.firingCycleCount ?? "Sin registro"}
        />
      )}
    </dl>
  );
}

export function ControllerEquipmentDetails({
  controller,
  showLiveDetails = false,
  className = "",
}) {
  const controllerCode =
    controller?.controllerCode || controller?.controllerId?.slice(-6);
  const firmware =
    controller?.firmwareVersion && controller.firmwareVersion !== "UNKNOWN"
      ? controller.firmwareVersion
      : "Sin registro";

  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-6 ${className}`}>
      <EquipmentDetail
        label="ID"
        value={controllerCode || "No disponible"}
        copyValue={controllerCode}
      />
      <EquipmentDetail label="Switch" value={switchValue(controller)} />
      <EquipmentDetail
        label="Estado"
        value={getOperationalStatusLabel(controller?.operationalStatus)}
      />
      <EquipmentDetail label="Firmware" value={firmware} />
      <EquipmentDetail
        label="Fecha de fabricación"
        value={formatEquipmentDate(controller?.manufacturedAt)}
      />
      <EquipmentDetail
        label="Fecha de entrega"
        value={formatEquipmentDate(controller?.deliveredAt, "Pendiente")}
      />
      <EquipmentDetail
        label="Actualización de firmware"
        value={formatEquipmentDate(controller?.firmwareUpdatedAt)}
      />
      {showLiveDetails && (
        <>
          <EquipmentDetail
            label="Conexión"
            value={getControllerConnectionLabel(controller?.connectionStatus)}
          />
          <EquipmentDetail
            label="Temperatura"
            value={
              controller?.temperature == null
                ? "No disponible"
                : `${controller.temperature.toFixed(1)} °C`
            }
          />
          <EquipmentDetail
            label="Actividad"
            value={getControllerActivityLabel(controller?.activityStatus)}
          />
        </>
      )}
    </dl>
  );
}
