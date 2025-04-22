import { setupWorker } from 'msw';
import { handlers } from './handlers';

// Setup MSW worker with our handlers
export const worker = setupWorker(...handlers);

// Export a simplified API that matches the server API for tests
export const server = {
  listen: (options?: any) => worker.start(options),
  resetHandlers: () => worker.resetHandlers(),
  close: () => worker.stop()
}; 