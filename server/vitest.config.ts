import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Define o ambiente ANTES de qualquer import de src/env.ts, que valida as
    // variáveis no topo do módulo.
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
