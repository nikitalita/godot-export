/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable @typescript-eslint/no-unused-vars

import process from 'process';
import { GodotGitHubInputs } from './types/GodotGithubInputs';
import { GodotVersion } from './godotver';

export function getMockOpts(): GodotGitHubInputs {
  const opts = {
    archive_output: false,
    archive_root_folder: false,
    cache: false,
    export_debug: false,
    export_as_pack: true,
    presets_to_export: ['macOS'],
    godot_executable_download_url: GodotVersion.GetEngineDownloadUrl('4.3-stable'),
    godot_export_templates_download_url: GodotVersion.GetTemplatesDownloadUrl('4.3-stable'),
    relative_export_path: './.testfiles',
    relative_project_path: './test_projects/webrtc_signaling',
    verbose: false,
    use_godot_3: false,
    use_preset_export_path: false,
    wine_path: '',
  } as GodotGitHubInputs;
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
  return opts;
}

function get_input_name(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function set_input_var(name: string, value: string | boolean | string[] | undefined): void {
  if (value === undefined) {
    return;
  }
  if (value === true || value === false) {
    value = value ? 'true' : 'false';
  } else if (value instanceof Array) {
    value = value.join(',');
  }
  process.env[get_input_name(name)] = value;
}

export function setMockInputs(opts: GodotGitHubInputs | undefined = undefined): void {
  const _opts: GodotGitHubInputs = opts || getMockOpts();
  for (const key in _opts) {
    // check if it is actually a keyof GodotGitHubInputs
    set_input_var(key, _opts[key as keyof GodotGitHubInputs]);
  }
}
