import { useSearchParams } from 'react-router-dom';

export const useUrlState = <T extends Record<string, unknown>>(
  initialState: T
): [T, (newState: Partial<T>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = { ...initialState };
  for (const key in initialState) {
    if (searchParams.has(key)) {
      const value = searchParams.get(key);
      if (typeof initialState[key] === 'number') {
        state[key] = Number(value) as T[Extract<keyof T, string>];
      } else if (typeof initialState[key] === 'boolean') {
        state[key] = (value === 'true') as T[Extract<keyof T, string>];
      } else {
        state[key] = value as T[Extract<keyof T, string>];
      }
    }
  }

  const setState = (newState: Partial<T>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    for (const key in newState) {
      const value = newState[key];
      if (value === undefined || value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, String(value));
      }
    }
    setSearchParams(newSearchParams);
  };

  return [state, setState];
};
