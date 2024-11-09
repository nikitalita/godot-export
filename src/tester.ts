/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable camelcase */
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
import { getGHConstants } from './constants';
import { exec } from '@actions/exec';
import { rimraf } from 'rimraf';
import * as io from '@actions/io';
import * as core from '@actions/core';

const OUTPUT_DIR = './.testfiles';
const DECOMP_OUTPUT_DIR = `${OUTPUT_DIR}/test-decomps/4.x`;
const BASE_PROJECT_DIR = 'test_projects';
const DEMO_PROJECT_REPO = 'https://github.com/godotengine/godot-demo-projects.git';

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

const DEMO_PROJECT_BRANCHES = ['2.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.x', '4.0', '4.1', '4.2', 'master'];

function copyExportPresetsConfig(opts: GodotGitHubInputs): void {
  const exportPresetsDist = path.join(__dirname, opts.use_godot_3 ? 'export_presets-3.cfg' : 'export_presets-4.cfg');
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

function get_mock_opts(project_dir: string, version: string): GodotGitHubInputs {
  const ver = new GodotVersion(version);
  const preset = ['macOS'];
  const opts: GodotGitHubInputs = {
    archive_output: false,
    archive_root_folder: false,
    cache: false,
    export_debug: false,
    export_as_pack: true,
    presets_to_export: preset,
    godot_executable_download_url: GodotVersion.GetEngineDownloadUrl(ver),
    godot_export_templates_download_url: GodotVersion.GetTemplatesDownloadUrl(ver),
    relative_export_path: './.testfiles',
    relative_project_path: project_dir,
    verbose: false,
    use_godot_3: ver.major <= 3,
    use_preset_export_path: false,
    wine_path: '',
  };
  return opts;
}

async function gitClone(repo: string, dest: string, branch: string, depth = 1): Promise<void> {
  try {
    await exec('git', ['clone', '--depth', depth.toString(), '--branch', branch, repo, dest], {
      failOnStdErr: false,
      ignoreReturnCode: true,
    });
  } catch (error) {
    /* empty */
  }
}

async function cloneDemoProjects(branch: string): Promise<string> {
  const dest = path.join(BASE_PROJECT_DIR, branch);
  await gitClone(DEMO_PROJECT_REPO, dest, branch);
  return dest;
}

async function exportAndDecompile(
  PROJECT_SUBPATH: string,
  version: string,
  baseDir = '',
): Promise<{ [key: string]: string }> {
  const project_subpath = PROJECT_SUBPATH;
  if (baseDir) {
    PROJECT_SUBPATH = path.join(baseDir, PROJECT_SUBPATH);
  }
  const opts = get_mock_opts(PROJECT_SUBPATH, version);
  // ensure OUTPUT_DIR
  await io.mkdirP(OUTPUT_DIR);
  setMockInputs(opts);
  copyExportPresetsConfig(opts);
  const GHOpts = getGHConstants();
  const buildResults = await exportBuilds(GHOpts);
  await moveBuildsToExportDirectory(buildResults, GHOpts);
  // run BIN_PATH with args
  const PROJECT = path.basename(opts.relative_project_path);
  const PROJECT_DIR = opts.relative_project_path;
  const PROJECT_OUTPUT_DIR = `${DECOMP_OUTPUT_DIR}/${project_subpath}`;
  // rm -rf PROJECT_OUTPUT_DIR
  await io.rmRF(PROJECT_OUTPUT_DIR);
  const BIN_PATH = '/Users/nikita/Workspace/godot-ws/godot/bin/godot.macos.editor.dev.arm64';
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
  // string to string
  const errors: { [key: string]: string } = {};
  for (const file in codeMap) {
    if (!(file in originalCodeMap)) {
      console.error(`File ${file} is missing`);
      errors[file] = `File ${file} is missing`;
    } else if (originalCodeMap[file] !== codeMap[file]) {
      const patch = createPatch(file, originalCodeMap[file], codeMap[file], 'original', 'recovered');
      console.error(`File ${file} is different`);
      errors[file] = patch;
    }
  }
  if (Object.keys(errors).length > 0) {
    console.error(errors);
  } else {
    console.log('All files are the same!!!');
  }
  // rimraf the output dir
  // io.rmRF(DECOMP_OUTPUT_DIR);
  // rimraf the GODOT_BUILD_PATH
  await io.rmRF(GHOpts.GODOT_BUILD_PATH);
  return errors;
}

async function findAllDemoProjects(demoPath: string, version: string): Promise<string[]> {
  const ver = new GodotVersion(version);
  const settings = ver.major < 3 ? 'editor.cfg' : 'project.godot';
  const cwd = path.resolve(path.join(demoPath));
  const projects = glob.sync(`${settings}`, { cwd, absolute: false, matchBase: true });
  // remove the settings file from each
  return projects.map(p => path.dirname(p));
}

async function main(): Promise<number> {
  const branch = 'master';
  const version = '4.3.0';
  const demoPath = path.join(BASE_PROJECT_DIR, branch);
  await cloneDemoProjects(branch);
  //test_projects/3.x/misc/2.5d
  const BIN_PATH = '/Users/nikita/Workspace/godot-ws/godot/bin/godot.macos.editor.dev.arm64';
  const projects = await findAllDemoProjects(demoPath, version);
  const all_errors: { [key: string]: { [key: string]: string } } = {};
  // const projects = ['misc/2.5d'];
  for (const project of projects) {
    const errors = await exportAndDecompile(project, version, demoPath);
    all_errors[path.basename(project)] = errors;
  }

  // write all_errors to a json file
  const jsonPath = path.join(__dirname, `errors_${branch}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(all_errors, null, 2));
  print_errors(jsonPath);
  return 0;
}

async function print_errors(jsonPath: string): Promise<void> {
  const errors = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  for (const project in errors) {
    // check the length of errors[project]
    if (Object.keys(errors[project]).length === 0) {
      continue;
    }
    console.log(`Project: ${project}`);
    for (const file in errors[project]) {
      console.log(`File: ${file}`);
      console.log(errors[project][file]);
    }
  }
}

// eslint-disable-next-line github/no-then
main().catch(err => {
  core.error(err.message);
  process.exit(1);
});
