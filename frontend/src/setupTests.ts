/// <reference types="vitest/globals" />

import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// import global mocks below so they're hoisted for all tests
import '@/tests/mocks/hooks'; // central hook mocks

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
