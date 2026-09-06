import { Badge } from "@components/Badge";
import {
  CONTROLLER_ACTIVITY_STYLES,
  getControllerActivityLabel,
} from "@constants/controller.constants";

export default function ControllerStatus({ controller }) {
  if (!controller) {
    return <Badge text="Sin controlador" />;
  }

  return (
    <Badge
      style={CONTROLLER_ACTIVITY_STYLES[controller.activityStatus] || "default"}
      text={getControllerActivityLabel(controller.activityStatus)}
    />
  );
}
