const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Xcode 16.3+/26's Clang rejects fmt's `consteval` FMT_STRING checks that ship
// with RN 0.76's bundled fmt (surfaces as "call to consteval function … is not
// a constant expression" in Pods/fmt/format-inl.h). Define FMT_USE_CONSTEVAL=0
// on every pod so fmt falls back to constexpr and compiles. Injected into the
// generated Podfile's post_install so it survives `expo prebuild`.
const MARKER = "# fmt-consteval-fix";

const INJECT = `
    ${MARKER}
    installer.pods_project.targets.each do |__t|
      __t.build_configurations.each do |__c|
        __defs = __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        __defs = [__defs] unless __defs.is_a?(Array)  # CocoaPods may store a String
        __defs << 'FMT_USE_CONSTEVAL=0' unless __defs.include?('FMT_USE_CONSTEVAL=0')
        __c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = __defs
      end
    end
    # Authoritative: patch the bundled fmt headers so FMT_CONSTEVAL expands to
    # nothing. The preprocessor define above can be clobbered by
    # react_native_post_install; editing the source can't be.
    __fmt_root = File.join(installer.sandbox.root, 'fmt')
    if Dir.exist?(__fmt_root)
      Dir.glob(File.join(__fmt_root, '**', '*.h')).each do |__f|
        __src = File.read(__f)
        __out = __src.gsub('define FMT_CONSTEVAL consteval', 'define FMT_CONSTEVAL')
        File.write(__f, __out) if __out != __src
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (!contents.includes(MARKER)) {
        // Insert right after the existing `post_install do |installer|` line.
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) => match + INJECT,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
