import { Badge } from "@components/Badge";

export default function ControllerStatus({ controller }) {
  if (!controller) {
    return <Badge text="Sin controlador" />;
  }

  const isOn = controller.operativeStatus === "ON";
  return <Badge style={isOn ? "success" : "default"} text={isOn ? "ON" : "OFF"} />;
}
