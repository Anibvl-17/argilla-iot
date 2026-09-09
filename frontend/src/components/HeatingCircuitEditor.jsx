import { LuArrowDown, LuArrowUp, LuPlus, LuTrash2 } from "react-icons/lu";

const newChannel = () => ({
  type: "CHANNEL",
  name: "Nuevo canal",
  resistanceOhms: 1,
  lengthMeters: 1,
});
const newGroup = () => ({
  type: "GROUP",
  name: "Nuevo grupo",
  connectionType: "PARALLEL",
  elements: [newChannel()],
});

function ContainerNode({ node, onChange, root = false }) {
  const updateChild = (index, child) => {
    const elements = node.elements.map((item, position) =>
      position === index ? child : item,
    );
    onChange({ ...node, elements });
  };
  const removeChild = (index) => {
    onChange({
      ...node,
      elements: node.elements.filter((_, position) => position !== index),
    });
  };
  const moveChild = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= node.elements.length) return;
    const elements = [...node.elements];
    [elements[index], elements[target]] = [elements[target], elements[index]];
    onChange({ ...node, elements });
  };

  return (
    <fieldset className="rounded-xl border border-border bg-surface-muted p-3">
      <legend className="px-2 text-sm font-semibold">
        {root ? "Circuito raíz" : "Grupo"}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {!root && (
          <label className="text-sm text-muted">
            Nombre
            <input
              className="mt-1 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
              value={node.name}
              onChange={(event) =>
                onChange({ ...node, name: event.target.value })
              }
              required
            />
          </label>
        )}
        <label className="text-sm text-muted">
          Conexión
          <select
            className="mt-1 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
            value={node.connectionType}
            onChange={(event) =>
              onChange({ ...node, connectionType: event.target.value })
            }
          >
            <option value="PARALLEL">Paralelo</option>
            <option value="SERIES">Serie</option>
          </select>
        </label>
      </div>

      <div className="mt-3 space-y-3">
        {node.elements.map((child, index) => (
          <div
            key={`${child.type}-${index}`}
            className="relative rounded-xl border border-border bg-surface p-3"
          >
            <div className="mb-2 flex justify-end gap-1">
              <button
                type="button"
                title="Subir"
                onClick={() => moveChild(index, -1)}
                className="rounded p-1 hover:bg-surface-hover"
              >
                <LuArrowUp />
              </button>
              <button
                type="button"
                title="Bajar"
                onClick={() => moveChild(index, 1)}
                className="rounded p-1 hover:bg-surface-hover"
              >
                <LuArrowDown />
              </button>
              <button
                type="button"
                title="Eliminar"
                onClick={() => removeChild(index)}
                className="rounded p-1 text-danger hover:bg-danger-soft"
              >
                <LuTrash2 />
              </button>
            </div>
            {child.type === "GROUP" ? (
              <ContainerNode
                node={child}
                onChange={(next) => updateChild(index, next)}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-muted">
                  Canal
                  <input
                    className="mt-1 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
                    value={child.name}
                    onChange={(event) =>
                      updateChild(index, { ...child, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="text-sm text-muted">
                  Resistencia (Ω)
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    className="mt-1 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
                    value={child.resistanceOhms}
                    onChange={(event) =>
                      updateChild(index, {
                        ...child,
                        resistanceOhms: Number(event.target.value),
                      })
                    }
                    required
                  />
                </label>
                <label className="text-sm text-muted">
                  Longitud (m)
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    className="mt-1 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
                    value={child.lengthMeters}
                    onChange={(event) =>
                      updateChild(index, {
                        ...child,
                        lengthMeters: Number(event.target.value),
                      })
                    }
                    required
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      {node.elements.length === 0 && (
        <p className="mt-2 text-sm text-danger">
          {root ? "La raíz" : "El grupo"} debe contener al menos un elemento.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({ ...node, elements: [...node.elements, newChannel()] })
          }
          className="inline-flex items-center gap-1 rounded-lg border border-control-border px-3 py-2 text-sm"
        >
          <LuPlus /> Canal
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ ...node, elements: [...node.elements, newGroup()] })
          }
          className="inline-flex items-center gap-1 rounded-lg border border-control-border px-3 py-2 text-sm"
        >
          <LuPlus /> Grupo
        </button>
      </div>
    </fieldset>
  );
}

export default function HeatingCircuitEditor({ value, onChange, error }) {
  return (
    <div>
      <ContainerNode node={value} onChange={onChange} root />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
