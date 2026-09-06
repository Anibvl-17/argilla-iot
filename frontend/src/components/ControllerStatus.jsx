import { Badge } from "@components/Badge";
import { getControllerActivityLabel } from "@constants/controller.constants";

const activityStyles = {
  IDLE: "default",
  FIRING: "danger",
  PAUSED: "info",
  ERROR: "warning",
};

export default function ControllerStatus({ controller }) {
  if (!controller) {
    return <Badge text="Sin controlador" />;
  }

  return (
    <Badge
      style={activityStyles[controller.activityStatus] || "default"}
      text={getControllerActivityLabel(controller.activityStatus)}
    />
  );
}
