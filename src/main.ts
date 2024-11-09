import * as core from '@actions/core';
import { exportBuilds } from './godot';
import * as constants from './constants';
import { Opts } from './types/opts';
import { zipBuildResults, moveBuildsToExportDirectory } from './file';

async function main(): Promise<number> {
  const opts: Opts = constants.getGHConstants();
  const buildResults = await exportBuilds(opts);
  if (!buildResults.length) {
    core.setFailed('No valid export presets found, exiting.');
    return 1;
  }

  if (opts.ARCHIVE_OUTPUT) {
    await zipBuildResults(buildResults, opts);
  }

  if (opts.RELATIVE_EXPORT_PATH || opts.USE_PRESET_EXPORT_PATH) {
    await moveBuildsToExportDirectory(buildResults, opts);
  }

  core.setOutput('build_directory', opts.GODOT_BUILD_PATH);
  core.setOutput('archive_directory', opts.GODOT_ARCHIVE_PATH);
  return 0;
}

// eslint-disable-next-line github/no-then
main().catch(err => {
  core.setFailed(err.message);
  process.exit(1);
});
