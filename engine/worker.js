import { run } from './run.js';
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, results: { aco: run(data.scenario, data.parameters, 'aco'), ga: run(data.scenario, data.parameters, 'ga') } }); }
  catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
