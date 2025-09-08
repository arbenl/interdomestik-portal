import { REGIONS } from '../constants/regions';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  options?: string[];
};

export default function RegionSelect({ value, onChange, id, className, options }: Props) {
  const opts = Array.isArray(options) && options.length > 0 ? options : REGIONS;
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
      {opts.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
