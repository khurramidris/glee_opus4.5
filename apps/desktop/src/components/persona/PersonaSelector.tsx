import { usePersonas } from '@/hooks/usePersonas';
import { Select } from '@/components/ui/Select';

interface PersonaSelectorProps {
  value: string | null;
  onChange: (personaId: string | null) => void;
  label?: string;
  className?: string;
}

export function PersonaSelector({
  value,
  onChange,
  label = 'Persona',
  className,
}: PersonaSelectorProps) {
  const { personas } = usePersonas();

  const options = personas.map((p) => ({
    value: p.id,
    label: p.isDefault ? `${p.name} (Default)` : p.name,
  }));

  return (
    <Select
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      options={options}
      placeholder="Select a persona..."
      className={className}
    />
  );
}
