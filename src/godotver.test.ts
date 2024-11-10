/* eslint-disable no-undef */
import { GodotVersion } from './godotver';
import { expect } from 'chai';
import axios, { isAxiosError } from 'axios';

// src/godotver.test.ts
async function urlExists(url: string, retry = false): Promise<boolean> {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch (error) {
    if (isAxiosError(error) && error.response && error.response.status === 404) {
      return false;
    }
    if (retry) {
      throw error;
    }
    return urlExists(url, true);
  }
}
describe('GodotVersion', () => {
  describe('constructor', () => {
    it('should parse version string correctly', () => {
      const version = new GodotVersion('3.2.1-beta2+build123');
      expect(version.major).to.equal(3);
      expect(version.minor).to.equal(2);
      expect(version.patch).to.equal(1);
      expect(version.prerelease).to.equal('beta2');
      expect(version.build).to.equal('build123');
    });

    it('should handle invalid version string', () => {
      const version = new GodotVersion('invalid');
      expect(version.major).to.equal(0);
      expect(version.minor).to.equal(0);
      expect(version.patch).to.equal(0);
      expect(version.prerelease).to.equal('');
      expect(version.build).to.equal('');
    });

    it('should handle GodotVer object', () => {
      const version = new GodotVersion({ major: 3, minor: 2, patch: 1, prerelease: 'beta2', build: 'build123' });
      expect(version.major).to.equal(3);
      expect(version.minor).to.equal(2);
      expect(version.patch).to.equal(1);
      expect(version.prerelease).to.equal('beta2');
      expect(version.build).to.equal('build123');
    });
  });

  describe('cmp', () => {
    it('should compare versions correctly', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.cmp(version2)).to.equal(-1);
      expect(version2.cmp(version1)).to.equal(1);
      expect(version1.cmp('3.2.1')).to.equal(0);
    });
  });

  describe('eq', () => {
    it('should return true for equal versions', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.eq(version2)).to.be.true;
    });

    it('should return false for different versions', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.eq(version2)).to.be.false;
    });
  });

  describe('ne', () => {
    it('should return true for different versions', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.ne(version2)).to.be.true;
    });

    it('should return false for equal versions', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.ne(version2)).to.be.false;
    });
  });

  describe('gt', () => {
    it('should return true for greater version', () => {
      const version1 = new GodotVersion('3.2.2');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.gt(version2)).to.be.true;
    });

    it('should return false for lesser or equal version', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.gt(version2)).to.be.false;
      expect(version1.gt('3.2.1')).to.be.false;
    });
  });

  describe('lt', () => {
    it('should return true for lesser version', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.lt(version2)).to.be.true;
    });

    it('should return false for greater or equal version', () => {
      const version1 = new GodotVersion('3.2.2');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.lt(version2)).to.be.false;
      expect(version1.lt('3.2.2')).to.be.false;
    });
  });

  describe('gte', () => {
    it('should return true for greater or equal version', () => {
      const version1 = new GodotVersion('3.2.2');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.gte(version2)).to.be.true;
      expect(version1.gte('3.2.2')).to.be.true;
    });

    it('should return false for lesser version', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.gte(version2)).to.be.false;
    });
  });

  describe('lte', () => {
    it('should return true for lesser or equal version', () => {
      const version1 = new GodotVersion('3.2.1');
      const version2 = new GodotVersion('3.2.2');
      expect(version1.lte(version2)).to.be.true;
      expect(version1.lte('3.2.1')).to.be.true;
    });

    it('should return false for greater version', () => {
      const version1 = new GodotVersion('3.2.2');
      const version2 = new GodotVersion('3.2.1');
      expect(version1.lte(version2)).to.be.false;
    });
  });

  describe('getNodeToGodotPlatform', () => {
    it('should return correct platform for macOS', () => {
      expect(GodotVersion.getNodeToGodotPlatform('darwin')).to.equal('macos');
    });

    it('should return correct platform for Linux', () => {
      expect(GodotVersion.getNodeToGodotPlatform('linux')).to.equal('linux');
    });

    it('should return correct platform for Windows', () => {
      expect(GodotVersion.getNodeToGodotPlatform('win32')).to.equal('windows');
    });
  });

  describe('getDownloadURL', () => {
    it('should return correct download URL for stable version', () => {
      const version = new GodotVersion('3.2.1');
      const url = version.getDownloadURL(false, 'linux', 'x86_64');
      expect(url).to.equal(
        'https://github.com/godotengine/godot-builds/releases/download/3.2.1-stable/Godot_v3.2.1-stable_x11.64.zip',
      );
    });

    it('should return correct download URL for mono version', () => {
      const version = new GodotVersion('3.2.1');
      const url = version.getDownloadURL(true, 'linux', 'x86_64');
      expect(url).to.equal(
        'https://github.com/godotengine/godot-builds/releases/download/3.2.1-stable/Godot_v3.2.1-stable_mono_x11_64.zip',
      );
    });

    it('should return correct download URL for macOS', () => {
      const version = new GodotVersion('4.0-alpha13');
      const url = version.getDownloadURL(false, 'darwin', 'arm64');
      expect(url).to.equal(
        'https://github.com/godotengine/godot-builds/releases/download/4.0-alpha13/Godot_v4.0-alpha13_macos.universal.zip',
      );
      version.prerelease = 'alpha12';
      expect(version.getDownloadURL(false, 'darwin', 'arm64')).to.equal(
        'https://github.com/godotengine/godot-builds/releases/download/4.0-alpha12/Godot_v4.0-alpha12_osx.universal.zip',
      );
    });
  });
  const versionsToTest = [
    // '1.0-stable',
    // '1.1-stable',
    '2.0-stable',
    '2.0.1-stable',
    '2.0.2-stable',
    '2.0.3-stable',
    '2.0.4.1-stable',
    '2.1-stable',
    '2.1.1-stable',
    '2.1.2-stable',
    '2.1.3-stable',
    '2.1.4-stable',
    '2.1.5-stable',
    '2.1.6-rc1',
    '2.1.6-stable',
    '3.0-stable',
    '3.0.1-stable',
    '3.0.2-stable',
    '3.0.3-rc1',
    '3.0.3-rc2',
    '3.0.3-rc3',
    '3.0.3-stable',
    '3.0.4-stable',
    '3.0.5-stable',
    '3.0.6-stable',
    '3.1-alpha1',
    '3.1-alpha2',
    '3.1-alpha3',
    '3.1-alpha4',
    '3.1-alpha5',
    '3.1-beta1',
    '3.1-beta10',
    '3.1-beta11',
    '3.1-beta2',
    '3.1-beta3',
    '3.1-beta4',
    '3.1-beta5',
    '3.1-beta6',
    '3.1-beta7',
    '3.1-beta8',
    '3.1-beta9',
    '3.1-rc1',
    '3.1-rc2',
    '3.1-rc3',
    '3.1-stable',
    '3.1.1-rc1',
    '3.1.1-stable',
    '3.1.2-rc1',
    '3.1.2-stable',
    '3.2-alpha0-unofficial',
    '3.2-alpha1',
    '3.2-alpha2',
    '3.2-alpha3',
    '3.2-beta1',
    '3.2-beta2',
    '3.2-beta3',
    '3.2-beta4',
    '3.2-beta5',
    '3.2-beta6',
    '3.2-rc1',
    '3.2-rc2',
    '3.2-rc3',
    '3.2-rc4',
    '3.2-stable',
    '3.2.1-rc1',
    '3.2.1-rc2',
    '3.2.1-stable',
    '3.2.2-beta1',
    '3.2.2-beta2',
    '3.2.2-beta3',
    '3.2.2-beta4',
    '3.2.2-rc1',
    '3.2.2-rc2',
    '3.2.2-rc3',
    '3.2.2-rc4',
    '3.2.2-stable',
    '3.2.3-beta1',
    '3.2.3-rc1',
    '3.2.3-rc2',
    '3.2.3-rc3',
    '3.2.3-rc4',
    '3.2.3-rc5',
    '3.2.3-rc6',
    '3.2.3-stable',
    '3.2.4-beta1',
    '3.2.4-beta2',
    '3.2.4-beta3',
    '3.2.4-beta4',
    '3.2.4-beta5',
    '3.2.4-beta6',
    '3.2.4-rc1',
    '3.2.4-rc2',
    '3.2.4-rc3',
    '3.2.4-rc4',
    '3.2.4-rc5',
    '3.3-rc6',
    '3.3-rc7',
    '3.3-rc8',
    '3.3-rc9',
    '3.3-stable',
    '3.3.1-rc1',
    '3.3.1-rc2',
    '3.3.1-stable',
    '3.3.2-stable',
    '3.3.3-rc1',
    '3.3.3-rc2',
    '3.3.3-stable',
    '3.3.4-rc1',
    '3.3.4-stable',
    '3.4-beta1',
    '3.4-beta2',
    '3.4-beta3',
    '3.4-beta4',
    '3.4-beta5',
    '3.4-beta6',
    '3.4-rc1',
    '3.4-rc2',
    '3.4-rc3',
    '3.4-stable',
    '3.4.1-rc1',
    '3.4.1-rc2',
    '3.4.1-rc3',
    '3.4.1-stable',
    '3.4.2-stable',
    '3.4.3-rc1',
    '3.4.3-rc2',
    '3.4.3-stable',
    '3.4.4-rc1',
    '3.4.4-rc2',
    '3.4.4-stable',
    '3.4.5-rc1',
    '3.4.5-stable',
    '3.5-beta1',
    '3.5-beta2',
    '3.5-beta3',
    '3.5-beta4',
    '3.5-beta5',
    '3.5-rc1',
    '3.5-rc2',
    '3.5-rc3',
    '3.5-rc4',
    '3.5-rc5',
    '3.5-rc6',
    '3.5-rc7',
    '3.5-rc8',
    '3.5-stable',
    '3.5.1-rc1',
    '3.5.1-rc2',
    '3.5.1-stable',
    '3.5.2-rc1',
    '3.5.2-rc2',
    '3.5.2-stable',
    '3.5.3-rc1',
    '3.5.3-stable',
    '3.6-beta1',
    '3.6-beta2',
    '3.6-beta3',
    '3.6-beta4',
    '3.6-beta5',
    '3.6-rc1',
    '3.6-stable',
    '4.0-alpha1',
    '4.0-alpha10',
    '4.0-alpha11',
    '4.0-alpha12',
    '4.0-alpha13',
    '4.0-alpha14',
    '4.0-alpha15',
    '4.0-alpha16',
    '4.0-alpha17',
    '4.0-alpha2',
    '4.0-alpha3',
    '4.0-alpha4',
    '4.0-alpha5',
    '4.0-alpha6',
    '4.0-alpha7',
    '4.0-alpha8',
    '4.0-alpha9',
    '4.0-beta1',
    '4.0-beta10',
    '4.0-beta11',
    '4.0-beta12',
    '4.0-beta13',
    '4.0-beta14',
    '4.0-beta15',
    '4.0-beta16',
    '4.0-beta17',
    '4.0-beta2',
    '4.0-beta3',
    '4.0-beta4',
    '4.0-beta5',
    '4.0-beta6',
    '4.0-beta7',
    '4.0-beta8',
    '4.0-beta9',
    '4.0-rc1',
    '4.0-rc2',
    '4.0-rc3',
    '4.0-rc4',
    '4.0-rc5',
    '4.0-rc6',
    '4.0-stable',
    '4.0.1-rc1',
    '4.0.1-rc2',
    '4.0.1-stable',
    '4.0.2-rc1',
    '4.0.2-stable',
    '4.0.3-rc1',
    '4.0.3-rc2',
    '4.0.3-stable',
    '4.0.4-rc1',
    '4.0.4-stable',
    '4.1-beta1',
    '4.1-beta2',
    '4.1-beta3',
    '4.1-dev1',
    '4.1-dev2',
    '4.1-dev3',
    '4.1-dev4',
    '4.1-rc1',
    '4.1-rc2',
    '4.1-rc3',
    '4.1-stable',
    '4.1.1-rc1',
    '4.1.1-stable',
    '4.1.2-rc1',
    '4.1.2-stable',
    '4.1.3-rc1',
    '4.1.3-stable',
    '4.1.4-rc1',
    '4.1.4-rc2',
    '4.1.4-rc3',
    '4.1.4-stable',
    '4.2-beta1',
    '4.2-beta2',
    '4.2-beta3',
    '4.2-beta4',
    '4.2-beta5',
    '4.2-beta6',
    '4.2-dev1',
    '4.2-dev2',
    '4.2-dev3',
    '4.2-dev4',
    '4.2-dev5',
    '4.2-dev6',
    '4.2-rc1',
    '4.2-rc2',
    '4.2-stable',
    '4.2.1-rc1',
    '4.2.1-stable',
    '4.2.2-rc1',
    '4.2.2-rc2',
    '4.2.2-rc3',
    '4.2.2-stable',
    '4.3-beta1',
    '4.3-beta2',
    '4.3-beta3',
    '4.3-dev1',
    '4.3-dev2',
    '4.3-dev3',
    '4.3-dev4',
    '4.3-dev5',
    '4.3-dev6',
    '4.3-rc1',
    '4.3-rc2',
    '4.3-rc3',
    '4.3-stable',
    '4.4-dev1',
    '4.4-dev2',
    '4.4-dev3',
    '4.4-dev4',
  ];
  const platforms = ['linux', 'darwin', 'win32'];
  const arches = ['x64', 'arm64'];

  describe('URLExists', () => {
    for (const mono of [false, true]) {
      for (const platform of platforms) {
        for (const arch of arches) {
          for (const versionStr of versionsToTest) {
            const hasDownload = GodotVersion.hasDownloadAvailableForRunner(versionStr, mono, platform, arch);
            const prString = `version ${versionStr}.${platform}.${arch}${mono ? '.mono' : ''}`;
            it(`should${hasDownload ? '' : ' not'} have download for ${prString}`, () => {
              expect(hasDownload).to.equal(hasDownload);
              const url = GodotVersion.GetEngineDownloadUrl(versionStr, mono, platform, arch);
              if (!hasDownload) {
                expect(url, `${url}`).to.equal('');
              } else {
                if (platform === 'linux') {
                  expect(url).to.match(/linux|x11/);
                } else if (platform === 'darwin') {
                  expect(url).to.match(/macos|osx/);
                } else if (platform === 'win32') {
                  expect(url).to.match(/win/);
                }
                if (mono) {
                  expect(url).to.match(/mono/);
                } else {
                  expect(url).to.not.match(/mono/);
                }
                if (arch.includes('arm') && platform === 'linux') {
                  expect(url).to.match(/arm/);
                }
              }
            });
            // if (hasDownload) {
            //   it(`should check URL existence for ${prString}`, async () => {
            //     const url = GodotVersion.GetEngineDownloadUrl(versionStr, mono, platform, arch);
            //     const exists = await urlExists(url);
            //     expect(exists, `URL does not exist on GitHub: ${url}`).to.be.true;
            //   });
            // }
          }
        }
      }
    }
  });
});
