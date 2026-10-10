import { useMemo, useState } from "react";

import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  collectPayload,
  isFieldVisible,
  validateForm,
  type FormFieldDef,
  type FormSchema,
  type FormValue,
} from "@/lib/domain/form-schema";
import { cn } from "@/lib/utils";

/**
 * ONE renderer for every FredFit Portal form. Conditional logic, validation and
 * structured payload collection all come from the schema — adding a form is
 * configuration, never a new component.
 */
export function DynamicForm({
  schema,
  initialValues,
  submitLabel = "Submit",
  secondaryAction,
  onSubmit,
}: {
  schema: FormSchema;
  initialValues?: Record<string, FormValue>;
  submitLabel?: string;
  secondaryAction?: React.ReactNode;
  onSubmit: (payload: Record<string, FormValue>, values: Record<string, FormValue>) => void;
}) {
  const [values, setValues] = useState<Record<string, FormValue>>(initialValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const liveErrors = useMemo(() => validateForm(schema, values), [schema, values]);

  function set(key: string, value: FormValue) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    setTouched(true);
    const found = validateForm(schema, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(collectPayload(schema, values), values);
  }

  const shownErrors = touched ? { ...liveErrors, ...errors } : {};

  return (
    <div className="space-y-8">
      {schema.intro ? (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {schema.intro}
        </p>
      ) : null}

      {schema.sections.map((section) => {
        const fields = section.fields.filter((f) => isFieldVisible(f, values));
        if (!fields.length) return null;
        return (
          <section key={section.key} className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {section.title}
              </h3>
              {section.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  error={shownErrors[field.key]}
                  onChange={(v) => set(field.key, v)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {touched && Object.keys(shownErrors).length ? (
        <p className="text-sm text-destructive">
          Please complete the highlighted answers before continuing.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {secondaryAction}
        <Button onClick={handleSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FormFieldDef;
  value: FormValue | undefined;
  error?: string | undefined;
  onChange: (value: FormValue) => void;
}) {
  const wrapper = field.full || field.type === "multiselect" ? "sm:col-span-2" : "";
  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.type === "checkbox") {
    return (
      <label className={cn("flex items-start gap-2 text-sm text-muted-foreground", wrapper)}>
        <input
          type="checkbox"
          className="mt-1"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {label}
          {error ? <span className="block text-destructive">{error}</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className={wrapper}>
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onChange(
                    active ? selected.filter((o) => o !== option) : [...selected, option],
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {field.hint ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{field.hint}</p>
        ) : null}
        {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
      </fieldset>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset className={wrapper}>
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options ?? []).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                value === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
      </fieldset>
    );
  }

  const control =
    field.type === "textarea" ? (
      <textarea
        rows={field.rows ?? 3}
        maxLength={2000}
        className={cn(fieldClass, error && "border-destructive")}
        placeholder={field.placeholder ?? ""}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : field.type === "select" ? (
      <select
        className={cn(fieldClass, error && "border-destructive")}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select one…</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={field.type === "tel" ? "tel" : field.type}
        maxLength={field.type === "text" ? 200 : undefined}
        className={cn(fieldClass, error && "border-destructive")}
        placeholder={field.placeholder ?? ""}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  return (
    <div className={wrapper}>
      <Field label={label} {...(field.hint ? { hint: field.hint } : {})}>
        {control}
      </Field>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Read-only staff view of a structured submission. */
export function FormAnswerList({
  schema,
  payload,
}: {
  schema: FormSchema;
  payload: Record<string, FormValue>;
}) {
  return (
    <div className="space-y-5">
      {schema.sections.map((section) => {
        const rows = section.fields.filter((f) => payload[f.key] !== undefined);
        if (!rows.length) return null;
        return (
          <div key={section.key}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <dl className="mt-2 space-y-2">
              {rows.map((field) => {
                const value = payload[field.key];
                return (
                  <div key={field.key} className="rounded-lg border border-border px-4 py-2">
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="text-sm text-foreground">
                      {Array.isArray(value)
                        ? value.join(", ")
                        : typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
