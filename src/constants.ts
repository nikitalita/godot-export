import * as core from '@actions/core';
import path from 'path';
import * as os from 'os';
import { setMockInputs } from './mock';
import { Opts } from './types/opts';
if (process.argv && process.argv.length > 2 && process.argv[2] === '--test') {
  setMockInputs();
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

export function getGodotLocalDir(): string {
  checkPlatform();
  return godotLocalDirs[process.platform as SupportedPlatforms];
}

export function getGodotConfigDir(): string {
  checkPlatform();

  return godotConfigDirs[process.platform as SupportedPlatforms];
}

export function getGodotAndroidSDKPath(): string {
  checkPlatform();

  return godotAndroidSDKPaths[process.platform as SupportedPlatforms];
}

/* eslint-disable @typescript-eslint/naming-convention */
function getGHConstants(): Opts {
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

  const GODOT_WORKING_PATH = path.resolve(path.join(os.homedir(), getGodotLocalDir()));
  const USE_GODOT_3 = core.getBooleanInput('use_godot_3');
  const RELATIVE_PROJECT_PATH = core.getInput('relative_project_path');
  const GODOT_PROJECT_PATH = path.resolve(path.join(RELATIVE_PROJECT_PATH));
  const opts: Opts = {
    ARCHIVE_OUTPUT: core.getBooleanInput('archive_output'),
    CACHE_ACTIVE: core.getBooleanInput('cache'),
    GODOT_DOWNLOAD_URL: core.getInput('godot_executable_download_url'),
    GODOT_TEMPLATES_DOWNLOAD_URL: core.getInput('godot_export_templates_download_url'),
    RELATIVE_EXPORT_PATH: core.getInput('relative_export_path'),
    RELATIVE_PROJECT_PATH,
    WINE_PATH: core.getInput('wine_path'),
    USE_PRESET_EXPORT_PATH: core.getBooleanInput('use_preset_export_path'),
    EXPORT_DEBUG: core.getBooleanInput('export_debug'),
    GODOT_VERBOSE: core.getBooleanInput('verbose'),
    ARCHIVE_ROOT_FOLDER: core.getBooleanInput('archive_root_folder'),
    USE_GODOT_3: core.getBooleanInput('use_godot_3'),
    EXPORT_PACK_ONLY: core.getBooleanInput('export_as_pack'),
    PRESETS_TO_EXPORT: exportPresets,
    GODOT_WORKING_PATH: path.resolve(path.join(os.homedir(), getGodotLocalDir())),
    GODOT_EXPORT_TEMPLATES_PATH: path.resolve(path.join(os.homedir(), getGodotLocalDir(), 'export_templates')),
    GODOT_CONFIG_PATH: path.resolve(path.join(os.homedir(), getGodotConfigDir())),
    GODOT_BUILD_PATH: path.join(GODOT_WORKING_PATH, 'builds'),
    GODOT_ARCHIVE_PATH: path.join(GODOT_WORKING_PATH, 'archives'),
    GODOT_PROJECT_PATH: path.resolve(path.join(RELATIVE_PROJECT_PATH)),
    GODOT_PROJECT_FILE_PATH: path.join(GODOT_PROJECT_PATH, 'project.godot'),
    EDITOR_SETTINGS_FILENAME: USE_GODOT_3 ? 'editor_settings-3.tres' : 'editor_settings-4.tres',
    GODOT_TEMPLATES_PATH: path.join(GODOT_WORKING_PATH, 'templates'),
  };
  return opts;
}

export { getGHConstants };
