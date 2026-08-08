import pg from 'pg';

import { config } from '../config/env.js';

const { Pool } = pg;

export function createPool(databaseUrl = config.databaseUrl) {
  return new Pool({ connectionString: databaseUrl });
}

export const pool = createPool();
