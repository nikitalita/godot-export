/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { exportBuilds } from './godot';
import { GodotVer, GodotVersion } from './godotver';
import { setMockInputs, getMockOpts } from './mock';
import { GodotGitHubInputs } from './types/GodotGithubInputs';
import { moveBuildsToExportDirectory } from './file';
import { execSync } from 'child_process';
import { createPatch } from 'diff';
import * as ini from 'ini';

const OUTPUT_DIR = './.testfiles';

function stripComments(content: string, removeAllWhitespace = true): string {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (removeAllWhitespace && lines[i].match(/\\$/)) {
      lines[i] = lines[i].replace(/\\$/, '');
      lines[i] += lines[i + 1];
      lines[i + 1] = '';
    }
    lines[i] = lines[i].split('#', 1)[0].trimEnd();
    if (removeAllWhitespace) {
      lines[i] = lines[i].replace(/\s/g, '');
    }
  }
  return lines.join('\n');
}

function readAllFiles(parentDir: string): { [key: string]: string } {
  // codeMap is a dict with a key of string to a value of a pair of strings
  const codeMap: { [key: string]: string } = {};
  const files = glob.sync('**/*.gd', { cwd: parentDir, absolute: false });
  for (const file of files) {
    const filePath = path.join(parentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    codeMap[file] = content;
  }
  return codeMap;
}

function stripAllFiles(parentDir: string): { [key: string]: string } {
  // codeMap is a dict with a key of string to a value of a pair of strings
  const codeMap: { [key: string]: string } = {};
  const files = glob.sync('**/*.gd', { cwd: parentDir, absolute: false });
  for (const file of files) {
    const filePath = path.join(parentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const strippedCode = stripComments(content);
    codeMap[file] = strippedCode;
  }
  return codeMap;
}

function copyExportPresetsConfig(opts: GodotGitHubInputs): void {
  const exportPresetsDist = path.join(__dirname, 'export_presets.cfg');
  const project = path.basename(opts.relative_project_path);
  // read in the whole file
  let content = fs.readFileSync(exportPresetsDist, 'utf-8');
  if (!content) {
    console.error('Failed to read export_presets.cfg');
    return;
  }
  //export_path="./something.exe"
  //turns into export_path="./{PROJECT}.exe"
  //export_path="./something.x86_64"
  //turns into export_path="./{PROJECT}.x86_64"
  content = content.replace(/export_path="(.*)something(.*)"/, `export_path="$1${project}$2"`);
  content = content.replace(/export_path="(.*)something(.*)"/, `export_path="$1${project}$2"`);
  content = content.replace(/export_path="(.*)something(.*)"/, `export_path="$1${project}$2"`);

  // write it to the relative project path
  const projectDir = path.resolve(path.join(opts.relative_project_path));
  const exportPresetsPath = path.join(projectDir, 'export_presets.cfg');
  fs.writeFileSync(exportPresetsPath, content);
  const thaigas = 32;
}

async function main(): Promise<number> {
  // const opts: GodotGitHubInputs = {
  //   archive_output: false,
  //   archive_root_folder: false,
  //   cache: false,
  //   export_debug: false,
  //   export_as_pack: true,
  //   presets_to_export: ['macOS'],
  //   godot_executable_download_url: GodotVersion.GetEngineDownloadUrl('3.4.3'),
  //   godot_export_templates_download_url: GodotVersion.GetTemplatesDownloadUrl('3.4.3'),
  //   relative_export_path: './.testfiles',
  //   relative_project_path: './examples/project-godot-4',
  //   verbose: false,
  //   use_godot_3: false,
  //   use_preset_export_path: false,
  //   wine_path: '',
  // };
  // setMockInputs(opts);

  const opts = getMockOpts();

  // copyExportPresetsConfig(opts);
  // const buildResults = await exportBuilds();
  // await moveBuildsToExportDirectory(buildResults, false);

  // put '"' around BIN_PATH and all the args
  const BIN_PATH = '/Users/nikita/Workspace/godot-ws/godot/bin/godot.macos.editor.dev.arm64';
  const PROJECT_DIR = opts.relative_project_path;
  // get the last part of the path
  const PROJECT = path.basename(PROJECT_DIR);
  const PROJECT_OUTPUT_DIR = `${OUTPUT_DIR}/test-decomps/${PROJECT}`;
  ///Users/nikita/Workspace/godot-ws/godot
  const args = [
    '--headless',
    '--path',
    '/Users/nikita/Workspace/godot-ws/godot/modules/gdsdecomp/standalone',
    `--recover="${OUTPUT_DIR}/macOS/${PROJECT}.zip.pck"`,
    `--output-dir="${PROJECT_OUTPUT_DIR}"`,
  ];

  const newBinPath = `"${BIN_PATH}"`;
  const newArgs = args.map(arg => `"${arg}"`);
  const output = execSync(`${newBinPath} ${newArgs.join(' ')}`);
  console.log(output.toString());

  const codeMap = stripAllFiles(PROJECT_OUTPUT_DIR);
  const originalCodeMap = stripAllFiles(PROJECT_DIR);
  for (const file in codeMap) {
    if (!(file in originalCodeMap)) {
      console.error(`File ${file} is missing`);
      return 1;
    }

    if (originalCodeMap[file] !== codeMap[file]) {
      const patch = createPatch(file, originalCodeMap[file], codeMap[file], 'original', 'recovered');
      console.error(`File ${file} is different`);
      console.log(patch);
      return 1;
    }
  }
  console.log('All files are the same!!!');
  // run BIN_PATH with args

  return 0;
}

// eslint-disable-next-line github/no-then
main().catch(err => {
  process.exit(1);
});
