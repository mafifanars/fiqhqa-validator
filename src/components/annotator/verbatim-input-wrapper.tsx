"use client";

import { cn } from "@/lib/utils";
import React from "react";

type VerbatimInputWrapperProps = {
  children: React.ReactElement;
  fieldId: string;
  activeFieldId: string | null;
  setActiveFieldId: (id: string | null) => void;
  isDisabled?: boolean;
};

export function VerbatimInputWrapper({
  children,
  fieldId,
  activeFieldId,
  setActiveFieldId,
  isDisabled = false,
}: VerbatimInputWrapperProps) {
  const isActive = activeFieldId === fieldId && !isDisabled;

  const handleFocus = () => {
    if (!isDisabled) {
        setActiveFieldId(fieldId);
    } else {
        setActiveFieldId(null);
    }
  };

  return (
    <div
      onFocus={handleFocus}
      className={cn(
        "relative rounded-md transition-all",
        isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      )}
    >
      {children}
    </div>
  );
}
