# babel-plugin-add-try-catch


> Auto add try-catch for your function

This plugin may be enabled via `babel-plugin-transform-es2015-modules-commonjs`.
If you wish to disable it you can either turn `strict` off or pass
`strictMode: false` as an option to the commonjs transform.

## Options

**catchFunc**

> Customize the error reporting method, which needs to be introduced globally and this options is must

```javascript
function report(info, error) {
  commonHandleError(info, error)
}
```

**disableComment**
>Once this comment is added to the first line of the function, it will not be processed by the function

```javascript
function() {
  //disable-try-catch
}
```
**limitLine**
>If you set this value to 5, the function will not be processed if the number of lines is less than 5

```javascript
5
```

## Installation

```sh
npm install --save-dev babel-plugin-add-try-catch
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

With options:

```json
{
  "plugins": [
       ["add-try-catch", {
            "catchFunc": "function report(info, error) {commonHandleError(info, error)}",
            "disableComment": "disable-try-catch",
            "limitLine": 5
        }],
]

}
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["add-try-catch"]
});
```
