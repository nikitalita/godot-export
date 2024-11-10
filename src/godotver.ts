/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/naming-convention */

import process from 'process';

const GODOT_VER_REGEX =
  /^[vV]?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:[.-]((?:dev|alpha|beta|rc)\d*))?(?:[.+-]((?:[\w\-_+.]*)))?$/;

export interface GodotVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  build: string;
}

export class GodotVersion implements GodotVer {
  major = 0;
  minor = 0;
  patch = 0;
  prerelease = '';
  build = '';

  static readonly MACOS_PLATFORM_CHANGED_VERSION = '4.0-alpha13';
  static readonly LINUX_PLATFORM_CHANGED_VERSION = '4.0-alpha1';
  static readonly LINUX_ARCH_STR_CHANGED_4x = '4.0-alpha15';
  static readonly PROVIDING_ARM_LINUX_VERSION_4x = '4.2-beta5';
  static readonly PROVIDING_ARM_LINUX_VERSION_3x = '3.6-beta4';
  static readonly PROVIDING_ARM_WINDOWS_VERSION = '4.3-rc1';

  static readonly RELEASE_VERSION_STRING_DASH = '2.1-stable';
  static readonly STARTED_PROVIDING_UINVERSAL_MACOS = '3.2.4-beta3';
  static readonly STOPPED_PROVIDING_FAT_MACOS = '3.1-alpha1';
  static readonly STARTED_PROVIDING_FAT_MACOS = '2.0.4.1-stable';
  static readonly STARTED_PROVIDING_64_BIT_MACOS = '2.0.3-stable';
  static readonly PROVIDED_MONO_4x = '4.0-beta1';
  static readonly NO_MONO_RELEASE = '3.2-beta3';
  // public function parse
  constructor(version: string | GodotVer) {
    if (typeof version === 'object') {
      this.major = version.major;
      this.minor = version.minor;
      this.patch = version.patch;
      this.prerelease = version.prerelease;
      this.build = version.build;
      return;
    }
    const match = version.match(GODOT_VER_REGEX);
    if (!match) {
      return;
    }
    this.major = parseInt(match[1]) || 0;
    this.minor = parseInt(match[2]) || 0;
    this.patch = parseInt(match[3]) || 0;
    this.prerelease = match[4] || '';
    this.build = match[5] || '';
  }

  cmp(other: GodotVer | string): number {
    if (typeof other === 'string') {
      other = new GodotVersion(other);
    }

    // inner function for returning values for number comparison
    const compareNumbers = (a: number, b: number): number => {
      return a === b ? 0 : a > b ? 1 : -1;
    };

    if (!GodotVersion.versionIsValid(other)) {
      return this.isValid() ? 1 : 0;
    } else if (!this.isValid()) {
      return -1;
    }

    if (this.major !== other.major) {
      return this.major > other.major ? 1 : -1;
    }

    if (this.minor !== other.minor) {
      return this.minor > other.minor ? 1 : -1;
    }

    if (this.patch !== other.patch) {
      return this.patch > other.patch ? 1 : -1;
    }

    if (this.prerelease === '' && other.prerelease === '') {
      return 0;
    }

    if (this.prerelease === '' || other.prerelease === '') {
      return this.prerelease === '' ? 1 : -1;
    }

    const aValidPfield = GodotVersion.IsValidPreReleaseField(this.prerelease);
    const bValidPfield = GodotVersion.IsValidPreReleaseField(other.prerelease);

    if (aValidPfield && !bValidPfield) {
      return -1;
    }
    if (!aValidPfield && bValidPfield) {
      return 1;
    }

    const aPrefix = this.getPrereleasePrefix();
    const bPrefix = GodotVersion.parsePrereleasePrefix(other.prerelease);

    if (aPrefix === 'dev' && bPrefix === 'dev') {
      return compareNumbers(
        this.getPrereleaseNumber() || 0,
        GodotVersion.parseDigitFromGodotPrereleaseField(other.prerelease) || 0,
      );
    }
    if (aPrefix === 'dev' || bPrefix === 'dev') {
      return aPrefix === 'dev' ? -1 : 1;
    }
    if (aPrefix !== bPrefix) {
      return aPrefix > bPrefix ? 1 : -1;
    }

    const aNum = GodotVersion.parseDigitFromGodotPrereleaseField(this.prerelease);
    const bNum = GodotVersion.parseDigitFromGodotPrereleaseField(other.prerelease);

    if (aNum !== null && bNum !== null) {
      if (aNum === bNum) {
        return 0;
      }
      return aNum > bNum ? 1 : -1;
    }
    if (aNum !== null || bNum !== null) {
      return bNum !== null ? 1 : -1;
    }

    return 0;
  }

  static parseDigitFromGodotPrereleaseField(prerelease: string): number {
    const match = prerelease.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  static parsePrereleasePrefix(prerelease: string): string {
    return prerelease.replace(/\d.*/, '');
  }

  static IsValidPreReleaseField(prerelease: string): boolean {
    return prerelease.match(/^(dev|alpha|beta|rc)\d*$/) !== null;
  }

  getPrereleaseNumber(): number | null {
    return GodotVersion.parseDigitFromGodotPrereleaseField(this.prerelease);
  }

  getPrereleasePrefix(): string {
    return GodotVersion.parsePrereleasePrefix(this.prerelease);
  }

  // override the operators
  eq(other: GodotVer | string): boolean {
    return this.cmp(other) === 0;
  }

  ne(other: GodotVer | string): boolean {
    return this.cmp(other) !== 0;
  }

  gt(other: GodotVer | string): boolean {
    return this.cmp(other) > 0;
  }

  lt(other: GodotVer | string): boolean {
    return this.cmp(other) < 0;
  }

  gte(other: GodotVer | string): boolean {
    return this.cmp(other) >= 0;
  }

  lte(other: GodotVer | string): boolean {
    return this.cmp(other) <= 0;
  }

  /**
   * If it's a prerelease version, increment the prerelease number; otherwise, increment the patch number.
   * @returns the new version
   * */
  incrementSmallest(): GodotVersion {
    if (this.prerelease === '') {
      this.patch++;
      return this;
    }
    this.prerelease = `${this.getPrereleasePrefix()}${(this.getPrereleaseNumber() || 0) + 1}`;
    return this;
  }

  static versionIsValid(version: GodotVer): boolean {
    return version.major > 0;
  }

  isValid(): boolean {
    return GodotVersion.versionIsValid(this);
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}${this.prerelease ? `-${this.prerelease}` : ''}${
      this.build ? `+${this.build}` : ''
    }`;
  }

  toTag(): string {
    if (this.major === 2 && this.minor === 0 && this.patch === 4 && !this.prerelease) {
      return '2.0.4.1-stable';
    }
    if (this.major === 3 && this.minor === 2 && this.patch === 0 && this.prerelease === 'alpha0') {
      return '3.2-alpha0-unofficial';
    }

    let tagStr = `${this.major}.${this.minor}`;
    if (this.patch !== 0) {
      tagStr += `.${this.patch}`;
    }
    if (this.prerelease !== '') {
      tagStr += `-${this.prerelease}`;
    } else {
      tagStr += '-stable';
    }
    return tagStr;
  }

  // platform names changed after 4.0-alpha13
  private getVersionedNodeToGodotPlatform(platform: string): string {
    platform = GodotVersion.getNodeToGodotPlatform(platform);
    switch (platform) {
      case 'macos':
        return this.lt(GodotVersion.MACOS_PLATFORM_CHANGED_VERSION) ? 'osx' : 'macos';
      case 'linux':
        return this.lt(GodotVersion.LINUX_PLATFORM_CHANGED_VERSION) ? 'x11' : 'linux';
    }
    return platform;
  }

  static getNodeToGodotPlatform(platform: string): string {
    if (platform === 'darwin') {
      return 'macos';
    }
    if (platform === 'linux') {
      return 'linux';
    }
    if (platform === 'win32') {
      return 'windows';
    }
    return platform;
  }

  static getNodeToGodotArch(arch: string): string {
    // * node values are: `'arm'`, `'arm64'`, `'ia32'`, `'mips'`,`'mipsel'`, `'ppc'`,`'ppc64'`, `'s390'`, `'s390x'`, and `'x64'`.
    // * godot values are: 'arm32', 'arm64', 'x86_32', 'x86_64'
    switch (arch) {
      case 'ia32':
        return 'x86_32';
      case 'x64':
        return 'x86_64';
      case 'arm':
        return 'arm32';
      case 'arm64':
        return 'arm64';
    }
    return arch;
  }

  private providingArmLinux(): boolean {
    return (
      (this.major === 4 && this.gte(GodotVersion.PROVIDING_ARM_LINUX_VERSION_4x)) ||
      (this.major === 3 && this.gte(GodotVersion.PROVIDING_ARM_LINUX_VERSION_3x))
    );
  }

  private getBestArchAndPlatformString(mono = false, platform?: string, arch?: string): string {
    // * node values are: `'arm'`, `'arm64'`, `'ia32'`, `'mips'`,`'mipsel'`, `'ppc'`,`'ppc64'`, `'s390'`, `'s390x'`, and `'x64'`.
    platform = this.getVersionedNodeToGodotPlatform(!platform ? process.platform : platform);

    if (platform === 'macos' || platform === 'osx') {
      if (this.lt(GodotVersion.STARTED_PROVIDING_64_BIT_MACOS)) {
        return 'osx32';
      } else if (
        this.gte(GodotVersion.STARTED_PROVIDING_64_BIT_MACOS) &&
        this.lt(GodotVersion.STARTED_PROVIDING_FAT_MACOS)
      ) {
        arch = arch?.endsWith('64') ? '64' : '32';
        return `osx${arch}`;
      } else if (
        this.gte(GodotVersion.STARTED_PROVIDING_FAT_MACOS) &&
        this.lt(GodotVersion.STOPPED_PROVIDING_FAT_MACOS)
      ) {
        arch = 'fat';
      } else {
        arch = this.gte(GodotVersion.STARTED_PROVIDING_UINVERSAL_MACOS) ? 'universal' : '64';
      }
      // They got real weird with the mono versions available in the 3.x series
      if (mono) {
        if (this.major === 3 && this.minor === 0 && this.patch <= 2) {
          return 'osx64';
        }
        if (this.eq('3.2-beta2')) {
          return 'osx_64';
        }
        if (this.gte('3.2-beta3') && this.lte('3.3.4-stable')) {
          return 'osx.64';
        }
      }
      return `${platform}.${arch}`;
    }
    arch = GodotVersion.getNodeToGodotArch(!arch ? process.arch : arch);
    if (platform === 'windows') {
      if (arch === 'arm64' && this.gte(GodotVersion.PROVIDING_ARM_WINDOWS_VERSION)) {
        return 'windows_arm64';
      } else if (arch.endsWith('64')) {
        return 'win64';
      }
      return 'win32';
    }
    // linux
    if (arch.startsWith('arm') && !this.providingArmLinux()) {
      arch = arch.endsWith('64') ? 'x86_64' : 'x86_32';
    }
    if (this.major < 3 || (this.major <= 3 && arch.startsWith('x86'))) {
      platform = 'x11';
    } else if (arch.startsWith('arm')) {
      platform = 'linux';
    }
    const sep = mono ? '_' : '.';
    if (arch.startsWith('x86')) {
      const suffix = arch.endsWith('64') ? '64' : '32';
      const prefix = this.gte(GodotVersion.LINUX_ARCH_STR_CHANGED_4x) ? 'x86_' : '';
      const archStr = `${prefix}${suffix}`;
      // version major 3 always has x11
      return `${platform}${sep}${archStr}`;
    }
    return `${platform}${sep}${arch}`;
  }

  private providedMono(platform: string, arch: string): boolean {
    return (
      (this.major === 3 &&
        this.ne(GodotVersion.NO_MONO_RELEASE) &&
        !((platform === 'linux' || platform === 'x11') && arch.startsWith('arm'))) ||
      (this.major === 4 && this.gte(GodotVersion.PROVIDED_MONO_4x))
    );
  }

  getDownloadURL(mono = false, platform: string = process.platform, arch: string = process.arch): string {
    platform = GodotVersion.getNodeToGodotPlatform(platform);
    arch = GodotVersion.getNodeToGodotArch(arch);
    mono = mono && this.providedMono(platform, arch);
    const tagStr = this.toTag();

    let archPlatform = this.getBestArchAndPlatformString(mono, platform, arch);
    platform = this.getVersionedNodeToGodotPlatform(!platform ? process.platform : platform);
    if (mono && platform !== 'macos' && platform !== 'osx') {
      archPlatform = archPlatform.replace('.', '_');
    }
    const needsEXE = platform === 'windows' && !mono;
    const versionString = this.gte(GodotVersion.RELEASE_VERSION_STRING_DASH)
      ? tagStr.replace('-unofficial', '')
      : tagStr.replace('-', '_');
    return `https://github.com/godotengine/godot-builds/releases/download/${tagStr}/Godot_v${versionString}${
      mono ? '_mono' : ''
    }_${archPlatform}${needsEXE ? '.exe' : ''}.zip`;
  }
  static GetTemplatesDownloadUrl(version: string | GodotVer, mono = false): string {
    //https://downloads.tuxfamily.org/godotengine/3.4.3/Godot_v3.4.3-stable_export_templates.tpz
    //mono_export_templates.tpz
    const ver = new GodotVersion(version);
    if (mono && !ver.providedMono('linux', 'x86_64')) {
      return '';
    }

    const tag = ver.toTag();
    const versionString = ver.gte(GodotVersion.RELEASE_VERSION_STRING_DASH)
      ? tag.replace('-unofficial', '')
      : tag.replace('-', '_');

    return `https://github.com/godotengine/godot-builds/releases/download/${tag}/Godot_v${versionString}_export_templates.tpz`;
  }

  static GetEngineDownloadUrl(
    version: string | GodotVer,
    mono = false,
    platform: string = process.platform,
    arch: string = process.arch,
  ): string {
    if (!GodotVersion.hasDownloadAvailableForRunner(version, mono, platform, arch)) {
      return '';
    }
    return new GodotVersion(version).getDownloadURL(mono, platform, arch);
  }

  static hasDownloadAvailableForRunner(
    version: string | GodotVer,
    mono: boolean,
    platform: string = process.platform,
    arch: string = process.arch,
  ): boolean {
    const ver = new GodotVersion(version);
    platform = GodotVersion.getNodeToGodotPlatform(platform);
    arch = GodotVersion.getNodeToGodotArch(arch);
    if (mono && !ver.providedMono(platform, arch)) {
      return false;
    }
    const bestAvailable = ver.getBestArchAndPlatformString(mono, platform, arch);
    // macos runners can run any 64-bit binary, x86 or arm
    if (platform === 'macos' && bestAvailable.endsWith('32') && !arch.endsWith('32')) {
      return false;
    }
    if (bestAvailable.endsWith('64') && arch.endsWith('32')) {
      return false;
    }

    if (platform === 'linux' && arch.includes('arm') && !bestAvailable.includes('arm')) {
      return false;
    }
    // arm64 windows can run both arm and x86
    return true;
  }
}
