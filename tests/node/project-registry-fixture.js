import { connectProject, listProjects } from '../../src/projects/registry.js';

let result = process.argv[2] === 'connect'
  ? await connectProject(process.argv[3]) : await listProjects(undefined);
process.stdout.write(JSON.stringify(result));
