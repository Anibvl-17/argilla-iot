export const createDefaultCircuit = () => ({
  type: "ROOT",
  connectionType: "PARALLEL",
  elements: [
    {
      type: "CHANNEL",
      name: "Canal principal",
      resistanceOhms: 18.5,
      lengthMeters: 6.2,
    },
  ],
});

export function summarizeHeatingCircuit(configuration) {
  const summary = { groups: 0, channels: 0 };

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (["ROOT", "GROUP"].includes(node.type)) summary.groups += 1;
    if (node.type === "CHANNEL") summary.channels += 1;
    if (Array.isArray(node.elements)) node.elements.forEach(visit);
  }

  visit(configuration);
  return summary;
}
