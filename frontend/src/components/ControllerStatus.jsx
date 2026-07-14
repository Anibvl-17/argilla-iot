import { Badge } from "@components/Badge";
import { getControllerOperationLabel } from "@constants/controller.constants";

export default function ControllerStatus({ controller }) {
  if (!controller) {
    return <Badge text="Sin controlador" />;
  }

  const isOn = controller.operativeStatus === "ON";
  return (
    <Badge
      style={isOn ? "success" : "default"}
      text={getControllerOperationLabel(controller.operativeStatus)}
    />
  );
}
