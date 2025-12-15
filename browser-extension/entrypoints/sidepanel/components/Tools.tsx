import { zodResolver } from "@hookform/resolvers/zod";
import { use, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { ToolsContext } from "../settings/ToolsContext";
import { FormToolsSchema, type Tools } from "../settings/schema";

export default function Tools() {
  const { tools, setTools } = use(ToolsContext);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Tools>({
    defaultValues: tools,
    resolver: zodResolver(FormToolsSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tools",
  });

  useEffect(() => {
    reset(tools);
  }, [tools, reset]);

  const submit = (vals: Tools) => {
    setTools(vals);
  };

  return (
    <section className="section">
      <form onSubmit={handleSubmit(submit)}>
        <div className="tools-list">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="tool-item"
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid var(--border-color, #ccc)",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, marginRight: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem" }}>
                    ID
                  </label>
                  <input
                    {...register(`tools.${index}.id`)}
                    className="input"
                    placeholder="Tool ID"
                    style={{ width: "100%" }}
                  />
                  {errors.tools?.[index]?.id && (
                    <span
                      className="error"
                      style={{ color: "red", fontSize: "0.8rem" }}
                    >
                      {errors.tools[index]?.id?.message}
                    </span>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    {...register(`tools.${index}.enabled`)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  Enabled
                </label>
              </div>

              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                <div style={{ marginBottom: "0.25rem" }}>JSON Schema</div>
                <textarea
                  {...register(`tools.${index}.json`)}
                  className="input"
                  rows={5}
                  placeholder="{ ... }"
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
                {errors.tools?.[index]?.json && (
                  <span
                    className="error"
                    style={{ color: "red", fontSize: "0.8rem" }}
                  >
                    {errors.tools[index]?.json?.message}
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={() => remove(index)}
                className="button"
                style={{ backgroundColor: "#ff4d4f", color: "white" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => append({ id: "", json: "{}", enabled: true })}
            className="button"
          >
            Add Tool
          </button>
          <button type="submit" className="button">
            Save Tools
          </button>
        </div>
      </form>
    </section>
  );
}
