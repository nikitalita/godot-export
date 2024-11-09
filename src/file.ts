import { BuildResult } from './types/GodotExport';
import path from 'path';
import * as io from '@actions/io';
import { exec } from '@actions/exec';
import { Opts } from './types/opts';
import * as core from '@actions/core';

async function zipBuildResults(buildResults: BuildResult[], opts: Opts): Promise<void> {
  core.startGroup('⚒️ Zipping binaries');
  const promises: Promise<void>[] = [];
  for (const buildResult of buildResults) {
    promises.push(
      (async function () {
        await zipBuildResult(buildResult, opts);
        core.info(`📦 Zipped ${buildResult.preset.name} to ${buildResult.archivePath}`);
      })(),
    );
  }
  await Promise.all(promises);
  core.endGroup();
}

async function zipBuildResult(buildResult: BuildResult, opts: Opts): Promise<void> {
  await io.mkdirP(opts.GODOT_ARCHIVE_PATH);

  const zipPath = path.join(opts.GODOT_ARCHIVE_PATH, `${buildResult.sanitizedName}.zip`);

  const isMac = buildResult.preset.platform.toLowerCase() === 'mac osx';
  const endsInDotApp = !!buildResult.preset.export_path.match('.app$');

  // in case mac doesn't export a zip, move the file
  if (isMac && !endsInDotApp) {
    const baseName = path.basename(buildResult.preset.export_path);
    const macPath = path.join(buildResult.directory, baseName);
    await io.cp(macPath, zipPath);
  }

  // 7zip automatically overwrites files that are in the way
  await exec('7z', ['a', zipPath, `${buildResult.directory}${opts.ARCHIVE_ROOT_FOLDER ? '' : '/*'}`]);

  buildResult.archivePath = zipPath;
}

async function moveBuildsToExportDirectory(buildResults: BuildResult[], opts: Opts): Promise<void> {
  core.startGroup(`➡️ Moving exports`);
  const promises: Promise<void>[] = [];
  for (const buildResult of buildResults) {
    const fullExportPath = path.resolve(
      opts.USE_PRESET_EXPORT_PATH
        ? path.join(opts.GODOT_PROJECT_PATH, path.dirname(buildResult.preset.export_path))
        : opts.RELATIVE_EXPORT_PATH,
    );

    await io.mkdirP(fullExportPath);

    let promise: Promise<void>;
    if (opts.ARCHIVE_OUTPUT) {
      if (!buildResult.archivePath) {
        core.warning('Attempted to move export output that was not archived. Skipping');
        continue;
      }
      const newArchivePath = path.join(fullExportPath, path.basename(buildResult.archivePath));
      core.info(`Copying ${buildResult.archivePath} to ${newArchivePath}`);
      promise = io.cp(buildResult.archivePath, newArchivePath);
      buildResult.archivePath = newArchivePath;
    } else {
      core.info(`Copying ${buildResult.directory} to ${fullExportPath}`);
      promise = io.cp(buildResult.directory, fullExportPath, { recursive: true });
      buildResult.directory = path.join(fullExportPath, path.basename(buildResult.directory));
      buildResult.executablePath = path.join(buildResult.directory, path.basename(buildResult.executablePath));
    }

    promises.push(promise);
  }

  await Promise.all(promises);
  core.endGroup();
}

export { zipBuildResults, moveBuildsToExportDirectory };
