/**
 * @fileoverview Build file for the googlejs ESLint plugin.
 */

/* global cat, cd, cp, echo, exec, exit, find, ls, mkdir, pwd, rm, target, test*/
/* eslint no-use-before-define: "off", no-console: "off" */
'use strict';

require("shelljs/make");

const closurePackage = require('google-closure-compiler');
const ClosureCompiler = closurePackage.compiler;

/* eslint-disable googlejs/camelcase */


const NODE = "node ", // intentional extra space
    NODE_MODULES = "./node_modules/",
    TEMP_DIR = "./tmp/",
    BUILD_DIR = "./build/",

    // Utilities - intentional extra space at the end of each string.
    MOCHA = NODE_MODULES + "mocha/bin/_mocha ",
    ESLINT = "eslint ",

    // Files
    MAKEFILE = "./Makefile.js",
    JS_FILES = "lib/**/*.js",
    TEST_FILES = getTestFilePatterns_(),

    // Settings
    MOCHA_TIMEOUT = 10000;

/**
 * Generates file patterns for test files.
 * @return {string} test file patterns
 * @private
 */
function getTestFilePatterns_() {
  const testLibPath = "tests/lib/";

  return ls(testLibPath).filter(function(pathToCheck) {
    return test("-d", testLibPath + pathToCheck);
  }).reduce(function(initialValue, currentValues) {
    if (currentValues !== "rules") {
      initialValue.push(testLibPath + currentValues + "/**/*.js");
    }
    return initialValue;
  }, [testLibPath + "rules/**/*.js", testLibPath + "*.js"]).join(" ");
}

var compiler = new ClosureCompiler(
  {
    js: [
      'index.js',
      "'./lib/**.js'",
    ],
    externs: [
      './externs/externs-eslint.js',
      './externs/externs-espree.js',
      // './externs/externs-commonjs.js',
    ],
    language_in: 'ECMASCRIPT6_STRICT',
    warning_level: 'VERBOSE',
    jscomp_error: "'*'",
    // We use null for options that don't have a value.  Otherwise, it errors
    // out.  The existence of 'checks-only' is enough for it to be included as
    // an option.
    checks_only: null,
    // Don't process commonjs modules.  Use an externs to stub them out.  We
    // rely on externs for typechecking.  Including node_modules is expensive
    // and we'd have to ignore errors or use externs for all libraries.
    process_common_js_modules: null,
    new_type_inf: null,
    // We need LOOSE because we're ignoring commonjs modules.  If we used
    // STRICT, closure would ignore all files it couldn't reach from the
    // entry_point.  Since we stub out all require calls, that would mean only
    // the entry_point is checked.
    dependency_mode: 'LOOSE',
    entry_point: './index.js',
    js_module_root: '.',
    // output_manifest: 'manifest.MF',
    // debug: null,
  },
  // Java options.
  [
  ]
  );

compiler.run(function(exitCode, stdout, stderr) {
  console.log(stdout);
  console.log(stderr);
});



target.all = function() {
  target.test();
};


target.lint = function() {
    let errors = 0,
        makeFileCache = " ",
        jsCache = " ",
        testCache = " ",
        lastReturn;

    // using the cache locally to speed up linting process
    if (!process.env.TRAVIS) {
        makeFileCache = " --cache --cache-file .cache/makefile_cache ";
        jsCache = " --cache --cache-file .cache/js_cache ";
        testCache = " --cache --cache-file .cache/test_cache ";
    }

    echo("Validating Makefile.js");
    lastReturn = exec(ESLINT + makeFileCache + MAKEFILE);
    if (lastReturn.code !== 0) {
        errors++;
    }

    echo("Validating JavaScript files");
    lastReturn = exec(ESLINT + jsCache + JS_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    echo("Validating JavaScript test files");
    lastReturn = exec(ESLINT + testCache + TEST_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    if (errors) {
        exit(1);
    }
};



target.test = function() {
  target.lint();
  target.checkRuleFiles();
  let errors = 0,
      lastReturn;

  // exec(ISTANBUL + " cover " + MOCHA + "-- -c " + TEST_FILES);
  lastReturn = nodeCLI.exec("istanbul", "cover", MOCHA, "-- -R progress -t " + MOCHA_TIMEOUT, "-c", TEST_FILES);
  if (lastReturn.code !== 0) {
    errors++;
  }

  // exec(ISTANBUL + "check-coverage --statement 99 --branch 98 --function 99 --lines 99");
  lastReturn = nodeCLI.exec("istanbul", "check-coverage", "--statement 99 --branch 98 --function 99 --lines 99");
  if (lastReturn.code !== 0) {
    errors++;
  }

  target.browserify();

  lastReturn = nodeCLI.exec("karma", "start karma.conf.js");
  if (lastReturn.code !== 0) {
    errors++;
  }

  if (errors) {
    exit(1);
  }

  target.checkLicenses();
};
