# tscomp

Create TypeScript projects with no build configuration.
This tool is based upon [Create React App](https://github.com/facebookincubator/create-react-app/)

## Getting Started

### Installation

Install it globally:
```
yarn global add tscomp
npm install -g tscomp
```

### Creating a project

First you must choose what kind of project you want to create, tscomp supports

- browser: An app that should be run in a browser. tscomp will set up a development
           server, a production build process and unit tests.

- server: An app that should be run in a Node server. tscomp will set up a development
          server, a watch build process, a production build process and unit tests.

- lib: A library that can be consumed in other TypeScript or JavaScript projects. 
       tscomp will set up a watch build process for development, a production build 
       process and unit tests.

Now run
```
tscomp new <project-type> my-app
cd my-app
```

for example `tscomp new browsesr my-app`.

It will create a directory called `my-app` inside the dcurrent folder.
Inside that directory, it will generate the initial project structure and
install the neccecary dependecies.

The only configuration file that will be present in your project is the
`tsconfig.json` file that configures TypeScript. This file is neccecary
for your editor to correctly provide TypeScript servicecs such as type checking
and code completions. After project creation you may modify it as you please.

### Browser project

#### `yarn start` or `npm start`
Runs the app in development mode.
Open <http://localhost:3000> to view it in the browser.

The page will reload if you make edits. You will see build errors in the
console and the browser.

#### `yarn test` or `npm test`
Runs the test watcher in interactive mode.
By default, runs test related to files changed since the last commit.

[Read more about testing in the Create React App README](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#running-tests)
tscomp does of course support test files with `.ts` and `.tsx` file endings as well.

#### `yarn build` or `npm run build`
Builds the app for production to the build folder, or if you have changed your `tsconfig.json`,
to the `outDir` specified in it.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!

### Server project

#### `yarn start` or `npm start`
Runs the app in development mode.

The server will restart if you make edits. You will see build errors in the
console.

#### `yarn test` or `npm test`
Runs the test watcher in interactive mode.
By default, runs test related to files changed since the last commit.

[Read more about testing in the Create React App README](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#running-tests)
tscomp does of course support test files with `.ts` and `.tsx` file endings as well.

#### `yarn watch` or `npm run watch`
Builds the app to the build folder, or if you have changed your `tsconfig.json`,
to the `outDir` specified in it. The files will be rebuilt if you make edits.

#### `yarn build` or `npm run build`
Builds the app for production to the build folder, or if you have changed your `tsconfig.json`,
to the `outDir` specified in it.

Your app is ready to be deployed!

### Library project

#### `yarn test` or `npm test`
Runs the test watcher in interactive mode.
By default, runs test related to files changed since the last commit.

[Read more about testing in the Create React App README](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#running-tests)
tscomp does of course support test files with `.ts` and `.tsx` file endings as well.

#### `yarn watch` or `npm run watch`
Builds the library to the lib folder, or if you have changed your `tsconfig.json`,
to the `outDir` specified in it. The files will be rebuilt if you make edits.

#### `yarn build` or `npm run build`
Builds the library for production to the lib folder, or if you have changed your `tsconfig.json`,
to the `outDir` specified in it.

Your library is ready to be published!
