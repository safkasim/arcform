const { withPodfileProperties, withXcodeProject } = require('expo/config-plugins');

const DEPLOYMENT_TARGET = '17.0';

module.exports = function withIosReleaseConfig(config) {
  config = withPodfileProperties(config, (configuration) => {
    configuration.modResults['ios.deploymentTarget'] = DEPLOYMENT_TARGET;
    return configuration;
  });

  config = withXcodeProject(config, (configuration) => {
    const project = configuration.modResults;
    const buildConfigurations = project.pbxXCBuildConfigurationSection();

    for (const entry of Object.values(buildConfigurations)) {
      if (
        entry &&
        typeof entry === 'object' &&
        'buildSettings' in entry &&
        entry.buildSettings
      ) {
        entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
      }
    }

    return configuration;
  });

  return config;
};