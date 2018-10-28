## 1.0.0-beta.6

- Do not use absolute path to babel runtime in server and lib builds

## 1.0.0-beta.5

- Upgrades to sync with create-react-app 2
- Remove .graphql support in favor of Babel Macros. See https://gist.github.com/gaearon/8650d1c70e436e5eff01f396dffc4114#graphql-support-was-removed


## 1.0.0-beta.3

- Upgrade Webpack to 4.17.1 to fix issue importing from `export * from` reexports https://github.com/webpack/webpack/issues/7930
- Replace UglifyJS with Terser
- Add tsconfig.json to .npmignore in new library projects.
- Support for `--json` to `tscomp build` to expose Webpack stats, allowing the use of tools such as Webpack Analyzer

## 1.0.0-beta.2

- Support dynamic imports in server and library projects
- Fix class method compilation with Babel. All TypeScript targets
  should now work again.
- Reenable full module splitting
- Add kitchensink tests for server projects

## 1.0.0-beta.1

### Breaking Changes

`typescript-babel-jest` have been replaced with `ts-jest`. This changes
how module import are compiled in tests.
After upgrading you'll experience problems with default imports. Fix this
by adding `"esModuleInterop": true` in your tsconfig.json `compilerOptions`

### Fixes

- Fix kitchensink tests
- Fix CSS modules in production builds

### Known issues

- Class methods does not work for child classes when compiled with Babel.
  Use `"target": "es5"` in your tsconfig.json `compilerOptions` to instead 
  build them with TypeScript.

- Full module splitting has been disabled as it did produce broken builds

## 1.0.0-beta.0

Upgraded Webpack to 4
Upgraded Babel to 7

Add support for .graphql files
Add support for CSS modules using .module.css extension

## 0.15.3

Fix library projects not creating declaration files in lib

## 0.15.2

Upgraded Typescript to 2.8

## 0.15.1

Avoid the error overlay for unused variables.  
Add `babel-runtime` to dependencies for new lib and server projects. This fixes some errors where
the application would crash after installing only production dependencies.  
Install the correct webpack types package for new browser projects.  
Don't install any webpack types package for new library projects.  

## 0.15.0

Fix bug where gulp watch (server start and watch, lib watch) would exit on syntax errors  
Make async typechecks in browser mode optional (defaults to false).  
Support overriding the typescript version by installing another version.  

## 0.14.2

Upgraded Typescript to 2.7  
Upgraded Jest to 22.1  

## 0.14.1

Fix bug where watch only recompiled on first change  

## 0.14.0

Upgraded Jest to 22  
Upgraded Gulp to 4  

## 0.13.2

Upgraded to [create-react-app 1.0.14](https://github.com/facebook/create-react-app/blob/master/CHANGELOG.md#1014-september-26-2017)  

## 0.10.0

#### Breaking Changes

This version is a re-fork of create-react-app to stay much closer to upstream
and allow changes to be merged using git.  

Therefore some features are no longer supported:
* ##### CSS Modules
  To align with create-react-app, css modules is no longer supported. Required CSS is added globally to the page

* ##### SASS
  To align with create-react-app, sass is no longer supported.

To align with create-react-app, static files should now be placed in a `public` folder in the root of the project, this includes the `index.html`.

To avoid unpredictable due to changing behavior depending on available files in the project, a single configuration option is now required. This should be added to the package.json as a new `tscomp` property with the selected mode.
Example:
```json
{
  // ...
  "tscomp": {"mode": "browser"}
}
```

#### New Features
* ##### New
  The ability to create a new project of create-react-app has been preserved and is supported for all project types.

* ##### Ejecting
  The eject feature of create-react-app has been preserved and is supported for all project types.

#### Enhancements
* ##### Testing
  The e2e tests of create-react-app has been preserved and extended to test all supported project types.
