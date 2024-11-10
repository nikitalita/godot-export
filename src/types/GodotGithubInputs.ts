/* eslint-disable @typescript-eslint/naming-convention */
export interface GodotGitHubInputs {
  godot_executable_download_url: string;
  godot_export_templates_download_url: string;
  relative_project_path: string;
  archive_output?: boolean;
  archive_root_folder?: boolean;
  cache?: boolean;
  relative_export_path?: string;
  use_preset_export_path?: boolean;
  wine_path?: string;
  export_debug?: boolean;
  verbose?: boolean;
  use_godot_3?: boolean;
  export_as_pack?: boolean;
  presets_to_export?: string[];
}
