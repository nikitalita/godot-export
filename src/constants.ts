import * as core from '@actions/core';
import path from 'path';
import * as os from 'os';
import { setMockInputs } from './mock';
if (process.argv && process.argv.length > 2 && process.argv[2] === '--test') {
  setMockInputs();
}

const ARCHIVE_OUTPUT = core.getBooleanInput('archive_output');
const CACHE_ACTIVE = core.getBooleanInput('cache');
// const GENERATE_RELEASE_NOTES = core.getBooleanInput('generate_release_notes');
const GODOT_DOWNLOAD_URL = core.getInput('godot_executable_download_url');
const GODOT_TEMPLATES_DOWNLOAD_URL = core.getInput('godot_export_templates_download_url');
const RELATIVE_EXPORT_PATH = core.getInput('relative_export_path');
const RELATIVE_PROJECT_PATH = core.getInput('relative_project_path');
const WINE_PATH = core.getInput('wine_path');
const USE_PRESET_EXPORT_PATH = core.getBooleanInput('use_preset_export_path');
const EXPORT_DEBUG = core.getBooleanInput('export_debug');
const GODOT_VERBOSE = core.getBooleanInput('verbose');
const ARCHIVE_ROOT_FOLDER = core.getBooleanInput('archive_root_folder');
const USE_GODOT_3 = core.getBooleanInput('use_godot_3');
const EXPORT_PACK_ONLY = core.getBooleanInput('export_as_pack');

// Parse export targets
const exportPresetsStr = core.getInput('presets_to_export').trim();
let exportPresets: string[] | null = null;

if (exportPresetsStr !== '') {
  try {
    // splitting by comma and trimming each target. Presets should not begin or end with a space.
    exportPresets = exportPresetsStr.split(',').map(s => s.trim());
    if (exportPresetsStr.length === 0) {
      exportPresets = null;
    }
  } catch (error) {
    core.warning('Malformed presets_to_export input. Exporting all presets by default.');
  }
}

// supported platforms type
type SupportedPlatforms = 'darwin' | 'linux' | 'win32';

const godotLocalDirs: { [key in SupportedPlatforms]: string } = {
  darwin: '/Library/Application Support/Godot',
  linux: '/.local/share/godot',
  win32: '/AppData/Local/Godot',
};

const godotConfigDirs: { [key in SupportedPlatforms]: string } = {
  darwin: '/Library/Application Support/Godot',
  linux: '/.config/godot',
  win32: '/AppData/Local/Godot',
};

const godotAndroidSDKPaths: { [key in SupportedPlatforms]: string } = {
  darwin: '/usr/local/lib/android/sdk',
  linux: path.join(os.homedir(), 'Android/Sdk'),
  win32: path.join(os.homedir(), 'AppData/Local/Android/Sdk'),
};

const supportedPlatforms: SupportedPlatforms[] = ['darwin', 'linux', 'win32'];

function checkPlatform(): void {
  if (!supportedPlatforms.includes(process.platform as SupportedPlatforms)) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getGodotLocalDir(): string {
  checkPlatform();
  return godotLocalDirs[process.platform as SupportedPlatforms];
}

function getGodotConfigDir(): string {
  checkPlatform();

  return godotConfigDirs[process.platform as SupportedPlatforms];
}

function getGodotAndroidSDKPath(): string {
  checkPlatform();

  return godotAndroidSDKPaths[process.platform as SupportedPlatforms];
}

const PRESETS_TO_EXPORT = exportPresets;

const GODOT_WORKING_PATH = path.resolve(path.join(os.homedir(), getGodotLocalDir()));
const GODOT_EXPORT_TEMPLATES_PATH = path.resolve(path.join(os.homedir(), getGodotLocalDir(), 'export_templates'));
const GODOT_CONFIG_PATH = path.resolve(path.join(os.homedir(), getGodotConfigDir()));
const GODOT_BUILD_PATH = path.join(GODOT_WORKING_PATH, 'builds');
const GODOT_ARCHIVE_PATH = path.join(GODOT_WORKING_PATH, 'archives');
const GODOT_PROJECT_PATH = path.resolve(path.join(RELATIVE_PROJECT_PATH));
const GODOT_PROJECT_FILE_PATH = path.join(GODOT_PROJECT_PATH, 'project.godot');
const GODOT_ANDROID_SDK_PATH = getGodotAndroidSDKPath();
export {
  ARCHIVE_OUTPUT,
  ARCHIVE_ROOT_FOLDER,
  CACHE_ACTIVE,
  EXPORT_DEBUG,
  EXPORT_PACK_ONLY,
  PRESETS_TO_EXPORT,
  // GENERATE_RELEASE_NOTES,
  GODOT_ARCHIVE_PATH,
  GODOT_BUILD_PATH,
  GODOT_CONFIG_PATH,
  GODOT_DOWNLOAD_URL,
  GODOT_EXPORT_TEMPLATES_PATH,
  GODOT_PROJECT_FILE_PATH,
  GODOT_PROJECT_PATH,
  GODOT_ANDROID_SDK_PATH,
  GODOT_TEMPLATES_DOWNLOAD_URL,
  GODOT_VERBOSE,
  GODOT_WORKING_PATH,
  RELATIVE_EXPORT_PATH,
  RELATIVE_PROJECT_PATH,
  USE_GODOT_3,
  USE_PRESET_EXPORT_PATH,
  WINE_PATH,
};
