/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const jsyaml = require('js-yaml');
const path = require('path');

// we want to load action.yml, and get the "inputs" object
// this is the same as the "inputs" object in src/mock.ts

// read the action.yml file

const thingy = jsyaml.load(fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8'));
// get the inputs object
const inputs = thingy.inputs;
if (!inputs) {
  throw new Error('No inputs found in action.yml');
}
const prefix = `/* eslint-disable @typescript-eslint/naming-convention */
export interface GodotGitHubInputs {
`;

let fileContents = prefix;
// open src/types/GodotGithubInputs2.ts for writing

for (const input of Object.keys(inputs)) {
  // check if it has the key "default" first
  const description = Object.prototype.hasOwnProperty.call(inputs[input], 'description')
    ? inputs[input]['description']
    : '';
  const defaultValue = Object.prototype.hasOwnProperty.call(inputs[input], 'default') ? inputs[input]['default'] : '';
  const requiredValue = Object.prototype.hasOwnProperty.call(inputs[input], 'required')
    ? inputs[input]['required']
    : '';

  const defaultType = description.toLowerCase().includes('list') ? 'string[]' : typeof defaultValue;
  fileContents += `  ${input}${requiredValue ? '' : '?'}: ${defaultType};\n`;
}
fileContents += '}\n';
fs.writeFileSync('src/types/GodotGitHubInputs.ts', fileContents);
