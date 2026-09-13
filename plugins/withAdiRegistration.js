const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const source = path.join(
        config.modRequest.projectRoot,
        "assets",
        "adi-registration.properties"
      );

      const assetsDirectory = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );

      const destination = path.join(
        assetsDirectory,
        "adi-registration.properties"
      );

      if (!fs.existsSync(source)) {
        throw new Error(
          "assets/adi-registration.properties was not found."
        );
      }

      fs.mkdirSync(assetsDirectory, { recursive: true });
      fs.copyFileSync(source, destination);

      console.log(
        "Copied adi-registration.properties to Android assets."
      );

      return config;
    },
  ]);
};