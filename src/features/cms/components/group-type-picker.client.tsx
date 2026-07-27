"use client";

import { useField, SelectInput, useFormFields } from "@payloadcms/ui";
import type { SelectFieldClientComponent, OptionObject } from "payload";
import { useEffect, useState } from "react";

/**
 * Custom Payload admin field — multi-select dropdown of group types
 * fetched from the organization's own data.
 *
 * Reads organizationId from the form's "organizationId" field.
 */
export const GroupTypePicker: SelectFieldClientComponent = (props) => {
  const { path, field, readOnly } = props;
  const hasMany = true;
  const { value, setValue, showError } = useField<string | string[]>({ path });
  const [options, setOptions] = useState<OptionObject[]>([]);
  const [loading, setLoading] = useState(true);

  // Read orgId from sibling form field "organizationId"
  const formFields = useFormFields(([fields]) => fields);
  const orgIdField = formFields?.organizationId as
    | { value: string }
    | undefined;
  const orgId = orgIdField?.value;

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    async function fetchOptions() {
      try {
        const res = await fetch(`/api/group-types-for-picker?orgId=${encodeURIComponent(orgId!)}`);
        if (!res.ok) {
          setOptions([]);
          return;
        }
        const dataJson: { id: string; name: string }[] = await res.json();
        setOptions(dataJson.map((item) => ({ label: item.name, value: item.id })));
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [orgId]);

  const selectValue = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <SelectInput
      path={path}
      name={String(field.name)}
      label={field.label ?? String(field.name)}
      hasMany={hasMany}
      options={loading ? [{ label: "Loading...", value: "" }] : options}
      value={selectValue}
      onChange={(option: unknown) => {
        if (hasMany && Array.isArray(option)) {
          setValue(option.map((o: unknown) => String((o as OptionObject).value ?? o)));
        } else if (!hasMany && option) {
          setValue(String((option as OptionObject).value ?? option));
        } else {
          setValue(undefined);
        }
      }}
      showError={showError}
      readOnly={readOnly}
      required={field.required}
      placeholder="Select group types..."
      isClearable
      isSortable
    />
  );
};
