import * as Uebersicht from "uebersicht";
const { React } = Uebersicht;

export default function SettingsItem({ code, field, value, onChange, displayOptions = [] }) {
  if (code.endsWith(".displays")) {
    const options = displayOptions.map((display) => ({
      uuid: display.uuid,
      label: display.name || `Display ${display.index}`,
    }));
    for (const uuid of value)
      if (!options.some((option) => option.uuid === uuid))
        options.push({ uuid, label: `Offline display: ${uuid}` });
    return (
      <select
        id={code}
        multiple
        value={value}
        onChange={(event) =>
          onChange(Array.from(event.target.selectedOptions, (option) => option.value))
        }
      >
        {options.map((option) => (
          <option key={option.uuid} value={option.uuid}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean")
    return (
      <input
        id={code}
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  if (field.enum)
    return (
      <select id={code} value={value} onChange={(event) => onChange(event.target.value)}>
        {field.enum.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  if (field.type === "number")
    return (
      <input
        id={code}
        type="number"
        min={field.min}
        max={Number.isFinite(field.max) ? field.max : undefined}
        step={field.integer ? "1" : "any"}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
      />
    );
  if (field.type === "array")
    return (
      <textarea
        id={code}
        rows={3}
        value={value.join("\n")}
        placeholder="One value per line; empty means none"
        onChange={(event) => onChange(event.target.value.split("\n").filter((item) => item.trim()))}
      />
    );
  return (
    <input
      id={code}
      type="text"
      value={value ?? ""}
      placeholder={field.default === undefined ? "Inherited from theme" : undefined}
      spellCheck={false}
      onChange={(event) =>
        onChange(
          field.default === undefined && event.target.value === "" ? undefined : event.target.value,
        )
      }
    />
  );
}
