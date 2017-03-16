## 0.10.0

#### Breaking Changes

This version is a re-fork of create-react-app to stay much closer to upstream
and allow changes to be merged using git.

Therfore some features are no longer supported:
* ##### CSS Modules
  To align with create-react-app, css modules is no longer supported. Required CSS is added globally to the page

* ##### SASS
  To align with create-react-app, sass is no longer supported.

To align with create-react-app, static files should now be placed in a `public` folder in the root of the project, this includes the `index.html`.

To avoid unpredictable due to changing behavior depending on avalible files in the project, a single configuration option is now required. This should be added to the package.json as a new `tscomp` property with the selected mode.
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
