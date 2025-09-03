import React from 'react';
import { REGIONS } from '../constants/regions';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

export default function RegionSelect({ value, onChange, id, className }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required
    >
      <option value="" disabled>
        Select region
      </option>
      {REGIONS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

