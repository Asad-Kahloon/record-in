"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export function PasswordInput({
  id,
  name,
  autoComplete,
  invalid,
  placeholder,
  required = true,
  onValueChange,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  invalid?: boolean;
  placeholder?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className="h-11 rounded-xl">
      <InputGroupInput
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        maxLength={72}
        aria-invalid={invalid || undefined}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
