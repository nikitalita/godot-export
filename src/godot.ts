import { exec, ExecOptions } from '@actions/exec';
import * as core from '@actions/core';
import { isFeatureAvailable, restoreCache, saveCache } from '@actions/cache';
import * as io from '@actions/io';
import * as path from 'path';
import * as fs from 'fs';
import * as ini from 'ini';
import { ExportPresets, ExportPreset, BuildResult } from './types/GodotExport';
import { Opts } from './types/opts';
import sanitize from 'sanitize-filename';
import { getGodotAndroidSDKPath } from './constants';

const GODOT_EXECUTABLE = 'godot_executable';
const GODOT_ZIP = 'godot.zip';
const GODOT_TEMPLATES_FILENAME = 'godot_templates.tpz';
const GODOT_ANDROID_SDK_SETTING = 'export/android/android_sdk_path';
const GODOT_ANDROID_SDK_PATH = getGodotAndroidSDKPath();

let godotExecutablePath: string;

async function exportBuilds(opts: Opts): Promise<BuildResult[]> {
  if (!hasExportPresets(opts)) {
    core.setFailed(
      'No export_presets.cfg found. Please ensure you have defined at least one export via the Godot editor.',
    );
    return [];
  }

  core.startGroup('🕹️ Downloading Godot');
  await downloadGodot(opts);
  core.endGroup();

  core.startGroup('🔍 Adding Editor Settings');
  await addEditorSettings(opts);
  core.endGroup();

  if (opts.WINE_PATH) {
    configureWindowsExport(opts);
  }

  configureAndroidExport(opts);

  if (!opts.USE_GODOT_3) {
    await importProject(opts);
  }

  const results = await doExport(opts);
  core.endGroup();

  return results;
}

function hasExportPresets(opts: Opts): boolean {
  try {
    const projectPath = path.resolve(opts.RELATIVE_PROJECT_PATH);
    return fs.statSync(path.join(projectPath, 'export_presets.cfg')).isFile();
  } catch (e) {
    return false;
  }
}

async function downloadGodot(opts: Opts): Promise<void> {
  await setupWorkingPath(opts);

  await prepareExecutable(opts);

  core.info('Preparing templates');
  if (opts.USE_GODOT_3) {
    await prepareTemplates3(opts);
  } else {
    await prepareTemplates4(opts);
  }
}

async function setupWorkingPath(opts: Opts): Promise<void> {
  await io.mkdirP(opts.GODOT_WORKING_PATH);
  core.info(`Working path created ${opts.GODOT_WORKING_PATH}`);
}

async function downloadFile(
  filePath: string,
  downloadUrl: string,
  cacheKey: string,
  restoreKey: string,
  opts: Opts,
): Promise<void> {
  if (opts.CACHE_ACTIVE && isCacheFeatureAvailable()) {
    const cacheHit = await restoreCache([filePath], cacheKey, [restoreKey]);
    if (cacheHit) {
      core.info(`Restored cached file from ${cacheHit}`);
      return;
    }
  }
  core.info(`Downloading file from ${downloadUrl}`);
  await exec('wget', ['-nv', downloadUrl, '-O', filePath]);
  if (opts.CACHE_ACTIVE && isCacheFeatureAvailable()) {
    await saveCache([filePath], cacheKey);
  }
}

async function downloadTemplates(opts: Opts): Promise<void> {
  const templatesPath = path.join(opts.GODOT_WORKING_PATH, GODOT_TEMPLATES_FILENAME);
  const cacheKey = `godot-templates-${opts.GODOT_TEMPLATES_DOWNLOAD_URL}`;
  const restoreKey = `godot-templates-${opts.GODOT_TEMPLATES_DOWNLOAD_URL}`;
  await downloadFile(templatesPath, opts.GODOT_TEMPLATES_DOWNLOAD_URL, cacheKey, restoreKey, opts);
}

async function downloadExecutable(opts: Opts): Promise<void> {
  const executablePath = path.join(opts.GODOT_WORKING_PATH, GODOT_ZIP);
  const cacheKey = `godot-executable-${opts.GODOT_DOWNLOAD_URL}`;
  const restoreKey = `godot-executable-${opts.GODOT_DOWNLOAD_URL}`;
  await downloadFile(executablePath, opts.GODOT_DOWNLOAD_URL, cacheKey, restoreKey, opts);
}

function isGhes(): boolean {
  const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

/**
 * Checks if the cache service is available for this runner.
 * Taken from https://github.com/actions/setup-node/blob/main/src/cache-utils.ts
 */
function isCacheFeatureAvailable(): boolean {
  if (isFeatureAvailable()) return true;

  if (isGhes()) {
    core.warning(
      'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.',
    );
    return false;
  }

  core.warning('The runner was not able to contact the cache service. Caching will be skipped');

  return false;
}

async function prepareExecutable(opts: Opts): Promise<void> {
  // await downloadExecutable(opts);

  const zipFile = path.join(opts.GODOT_WORKING_PATH, GODOT_ZIP);
  let zipTo = path.join(opts.GODOT_WORKING_PATH, GODOT_EXECUTABLE);

  core.info(`Extracting ${zipFile} to ${zipTo}`);

  if (process.platform === 'darwin') {
    await exec('ditto', ['-x', '-k', zipFile, opts.GODOT_WORKING_PATH]);
    zipTo = opts.GODOT_WORKING_PATH;
    core.info(`Extracted ${zipFile} to ${zipTo}`);
  } else {
    await exec('7z', ['x', zipFile, `-o${zipTo}`, '-y']);
  }

  const executablePath = findGodotExecutablePath(zipTo);
  if (!executablePath) {
    throw new Error('Could not find Godot executable');
  }
  core.info(`Found executable at ${executablePath}`);

  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    fs.chmodSync(executablePath, '755');
  }

  godotExecutablePath = `"${executablePath}"`;
}

async function prepareTemplates3(opts: Opts): Promise<void> {
  const templateFile = path.join(opts.GODOT_WORKING_PATH, GODOT_TEMPLATES_FILENAME);
  const tmpPath = path.join(opts.GODOT_WORKING_PATH, 'tmp');
  const godotVersion = await getGodotVersion();
  const godotVersionTemplatesPath = path.join(opts.GODOT_TEMPLATES_PATH, godotVersion);

  if (!fs.existsSync(godotVersionTemplatesPath)) {
    core.info(`⬇️ Missing templates for Godot ${godotVersion}. Downloading...`);
    await downloadTemplates(opts);
  } else {
    core.info(`✅ Found templates for Godot ${godotVersion} at ${godotVersionTemplatesPath}`);
    return;
  }

  await exec('unzip', ['-q', templateFile, '-d', opts.GODOT_WORKING_PATH]);
  await exec('mv', [opts.GODOT_TEMPLATES_PATH, tmpPath]);
  await io.mkdirP(opts.GODOT_TEMPLATES_PATH);
  await exec('mv', [tmpPath, godotVersionTemplatesPath]);
}

async function prepareTemplates4(opts: Opts): Promise<void> {
  const templateFile = path.join(opts.GODOT_WORKING_PATH, GODOT_TEMPLATES_FILENAME);
  const godotVersion = await getGodotVersion();
  const godotVersionTemplatesPath = path.join(opts.GODOT_EXPORT_TEMPLATES_PATH, godotVersion);

  if (!fs.existsSync(godotVersionTemplatesPath)) {
    core.info(`⬇️ Missing templates for Godot ${godotVersion}. Downloading...`);
    await downloadTemplates(opts);
  } else {
    core.info(`✅ Found templates for Godot ${godotVersion} at ${godotVersionTemplatesPath}.`);
    return;
  }

  await io.mkdirP(godotVersionTemplatesPath);
  await exec('unzip', ['-o', '-j', templateFile, '-d', godotVersionTemplatesPath]);
}

async function getGodotVersion(): Promise<string> {
  let version = '';
  const options: ExecOptions = {
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        version += data.toString('utf-8');
      },
    },
  };

  await exec(godotExecutablePath, ['--version'], options);
  let versionLines = version.split(/\r?\n|\r|\n/g);
  versionLines = versionLines.filter(x => !!x.trim());
  version = versionLines.pop() || 'unknown';
  version = version.trim();
  const regex = /(\d+(\.\d+)+\.\w+(\.mono)?)/;
  const match = version.match(regex);
  if (match) {
    version = match[1];
  } else {
    throw new Error('Godot version could not be determined.');
  }

  return version;
}

function getEmojiNumber(number: number): string {
  const allEmojiNumbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  let emojiNumber = '';

  for (const digit of number.toString()) {
    emojiNumber += allEmojiNumbers[parseInt(digit)];
  }

  return emojiNumber;
}

async function doExport(opts: Opts): Promise<BuildResult[]> {
  const buildResults: BuildResult[] = [];
  core.info(`🎯 Using project file at ${opts.GODOT_PROJECT_FILE_PATH}`);

  let exportPresetIndex = 0;

  for (const preset of getExportPresets(opts)) {
    core.startGroup(`${getEmojiNumber(++exportPresetIndex)} Export binary for preset "${preset.name}"`);

    const sanitizedName = sanitize(preset.name);
    const buildDir = path.join(opts.GODOT_BUILD_PATH, sanitizedName);

    let executablePath;
    if (preset.export_path) {
      executablePath = path.join(buildDir, path.basename(preset.export_path));
    }

    if (!executablePath) {
      core.warning(`No file path set for preset "${preset.name}". Skipping export!`);
      core.endGroup();
      continue;
    }

    if (opts.EXPORT_PACK_ONLY) {
      executablePath += '.pck';
    }

    await io.mkdirP(buildDir);
    let exportFlag = opts.EXPORT_DEBUG ? '--export-debug' : '--export-release';
    if (opts.EXPORT_PACK_ONLY) {
      exportFlag = '--export-pack';
    }
    if (opts.USE_GODOT_3 && !opts.EXPORT_PACK_ONLY) {
      exportFlag = opts.EXPORT_DEBUG ? '--export-debug' : '--export';
    }
    const headlessFlag = opts.USE_GODOT_3 ? '--no-window' : '--headless';

    let args = [opts.GODOT_PROJECT_FILE_PATH, headlessFlag, exportFlag, preset.name, executablePath];
    if (opts.USE_GODOT_3) {
      args = args.filter(x => x !== '--headless');
    }
    if (opts.GODOT_VERBOSE) {
      args.push('--verbose');
    }

    const result = await exec(godotExecutablePath, args);
    if (result !== 0) {
      core.endGroup();
      throw new Error('1 or more exports failed');
    }

    const directoryEntries = fs.readdirSync(buildDir);
    buildResults.push({
      preset,
      sanitizedName,
      executablePath,
      directoryEntryCount: directoryEntries.length,
      directory: buildDir,
    });

    core.endGroup();
  }

  return buildResults;
}

function findGodotExecutablePath(basePath: string): string | undefined {
  core.info(`🔍 Looking for Godot executable in ${basePath}`);
  const paths = fs.readdirSync(basePath);
  const dirs: string[] = [];

  for (const subPath of paths) {
    const fullPath = path.join(basePath, subPath);
    const stats = fs.statSync(fullPath);
    const isLinux = stats.isFile() && (path.extname(fullPath) === '.64' || path.extname(fullPath) === '.x86_64');
    const isMac = process.platform === 'darwin' && stats.isDirectory() && path.extname(fullPath) === '.app';
    if (isLinux) {
      return fullPath;
    } else if (isMac) {
      return path.join(fullPath, 'Contents', 'MacOS', 'Godot');
    } else {
      dirs.push(fullPath);
    }
  }

  for (const dir of dirs) {
    return findGodotExecutablePath(dir);
  }
  core.warning('Could not find Godot executable');
  return undefined;
}

function getExportPresets(opts: Opts): ExportPreset[] {
  const exportPresets: ExportPreset[] = [];
  const projectPath = path.resolve(opts.RELATIVE_PROJECT_PATH);

  if (!hasExportPresets(opts)) {
    throw new Error(`Could not find export_presets.cfg in ${projectPath}`);
  }

  const exportFilePath = path.join(projectPath, 'export_presets.cfg');
  const iniStr = fs.readFileSync(exportFilePath, { encoding: 'utf8' });
  const presets = ini.decode(iniStr) as ExportPresets;

  if (presets?.preset) {
    for (const key in presets.preset) {
      const currentPreset = presets.preset[key];

      if (opts.PRESETS_TO_EXPORT == null || opts.PRESETS_TO_EXPORT.includes(currentPreset.name)) {
        exportPresets.push(currentPreset);
      } else {
        core.info(`🚫 Skipping export preset "${currentPreset.name}"`);
      }
    }
  } else {
    core.warning(`No presets found in export_presets.cfg at ${projectPath}`);
  }

  return exportPresets;
}

async function editEditorSettings(opts: Opts): Promise<boolean> {
  const editorSettingsPath = path.join(opts.GODOT_CONFIG_PATH, opts.EDITOR_SETTINGS_FILENAME);
  let editorSettings = fs.readFileSync(editorSettingsPath, { encoding: 'utf8' });
  // check if the editor settings file is empty
  if (!editorSettings) {
    return false;
  }
  // check if GODOT_ANDROID_SDK_SETTING exists
  if (editorSettings.includes(GODOT_ANDROID_SDK_SETTING)) {
    // get the line that includes the setting
    const settingLine = editorSettings.match(new RegExp(`${GODOT_ANDROID_SDK_SETTING}.*`));
    if (settingLine) {
      const setting = settingLine.toString().split('=')[1].trim();
      if (setting === GODOT_ANDROID_SDK_SETTING) {
        core.info(`Editor settings file already contains ${GODOT_ANDROID_SDK_SETTING}`);
        return true;
      }
      editorSettings.replace(settingLine.toString(), `${GODOT_ANDROID_SDK_SETTING} = "${GODOT_ANDROID_SDK_PATH}"`);
    } else {
      core.error(`Could not find setting line for ${GODOT_ANDROID_SDK_SETTING}`);
      return true;
    }
  } else {
    // otherwise, find the [resource] tag and add the setting after it
    const resourceTag = '[resource]';
    const resourceIndex = editorSettings.indexOf(resourceTag);
    if (resourceIndex === -1) {
      core.warning(`Could not find [resource] tag in editor settings file ${editorSettingsPath}`);
      editorSettings += '\n[resource]\n';
    }
    // add the setting after the [resource] tag
    editorSettings = editorSettings.replace(
      `${resourceTag}`,
      `${resourceTag}\n${GODOT_ANDROID_SDK_SETTING} = "${GODOT_ANDROID_SDK_PATH}"\n`,
    );
  }

  // write to the file
  fs.writeFileSync(editorSettingsPath, editorSettings, { flag: 'w' });

  return true;
}

async function addEditorSettings(opts: Opts): Promise<void> {
  const editorSettingsDist = path.join(__dirname, opts.EDITOR_SETTINGS_FILENAME);
  const editorSettingsPath = path.join(opts.GODOT_CONFIG_PATH, opts.EDITOR_SETTINGS_FILENAME);

  if (fs.existsSync(editorSettingsPath) && (await editEditorSettings(opts))) {
    core.info(`Wrote editor settings to ${editorSettingsPath}`);
    return;
  }

  await io.mkdirP(opts.GODOT_CONFIG_PATH);

  let editorSettings = fs.readFileSync(editorSettingsDist, { encoding: 'utf8' });
  editorSettings = editorSettings.replace('GODOT_ANDROID_SDK_PATH', GODOT_ANDROID_SDK_PATH);
  fs.writeFileSync(editorSettingsPath, editorSettings, { flag: 'w' });
  core.info(`Wrote editor settings to ${editorSettingsPath}`);
}

function configureWindowsExport(opts: Opts): void {
  core.startGroup('📝 Appending Wine editor settings');
  const rceditPath = path.join(__dirname, 'rcedit-x64.exe');
  const linesToWrite: string[] = [];

  core.info(`Writing rcedit path to editor settings ${rceditPath}`);
  core.info(`Writing wine path to editor settings ${opts.WINE_PATH}`);

  const editorSettingsPath = path.join(opts.GODOT_CONFIG_PATH, opts.EDITOR_SETTINGS_FILENAME);
  linesToWrite.push(`export/windows/rcedit = "${rceditPath}"\n`);
  linesToWrite.push(`export/windows/wine = "${opts.WINE_PATH}"\n`);

  fs.writeFileSync(editorSettingsPath, linesToWrite.join(''), { flag: 'a' });

  core.info(linesToWrite.join(''));
  core.info(`Wrote settings to ${editorSettingsPath}`);
  core.endGroup();
}

function configureAndroidExport(opts: Opts): void {
  core.startGroup('📝 Configuring android export');

  if (process.platform !== 'win32') {
    try {
      if (fs.existsSync(path.join(opts.GODOT_PROJECT_PATH, 'android/build/gradlew'))) {
        fs.chmodSync(path.join(opts.GODOT_PROJECT_PATH, 'android/build/gradlew'), '755');
      }
      core.info('Made gradlew executable.');
    } catch (error) {
      core.warning(
        `Could not make gradlew executable. If you are getting cryptic build errors with your Android export, this may be the cause. ${error}`,
      );
    }
  }

  core.endGroup();
}

async function importProject(opts: Opts): Promise<void> {
  core.startGroup('🎲 Import project');
  try {
    const headlessFlag = opts.USE_GODOT_3 ? '--no-window' : '--headless';
    await exec(godotExecutablePath, [opts.GODOT_PROJECT_FILE_PATH, headlessFlag, '-e', '--quit']);
  } catch (error) {
    core.warning(`Import appears to have failed. Continuing anyway, but exports may fail. ${error}`);
  }
  core.endGroup();
}

export { exportBuilds };
