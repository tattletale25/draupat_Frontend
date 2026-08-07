interface ChipToggleProps {
  label: string;
  checked: boolean;
  color?: string;
  onChange: (checked: boolean) => void;
}

/** Multi-select "chip" checkbox — used for the competitor filter. Same
 * job as a shadcn Toggle/Checkbox group, hand-rolled since Radix isn't
 * installable here. */
export function ChipToggle({ label, checked, color, onChange }: ChipToggleProps) {
  return (
    <label className="chip-toggle" data-checked={checked}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {color && <span className="dot" style={{ background: checked ? color : 'var(--muted-foreground)' }} />}
      {label}
    </label>
  );
}
