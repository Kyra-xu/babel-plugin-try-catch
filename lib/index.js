
var template = require("@babel/template");

function getFilename (filename) {
  return filename.replace(process.cwd(), '')
}

function generateTryCatch (types, path, filename, opts) {
  try {
    const { catchFunc, disableComment, limitLine = 0 } = opts
    if (!catchFunc) throw Error('need a catchFunc')
    var node = path.node,
      params = node.params,
      blockStatement = node.body,
      isGenerator = node.generator,
      isAsync = node.async,
      loc = node.loc;

    // get function name
    var funcName = 'anonymous function';
    if (node.id) {
      funcName = node.id.name
    } else if (node.key) {
      // class method name
      funcName = node.key.name
    } else if (types.isVariableDeclarator(path.parentPath)) {
      funcName = path.parentPath.node.id.name;
    } else if (types.isProperty(path.parentPath)) {
      funcName = path.parentPath.node.key.name;
    }

    // 1、如果有try catch包裹了，则不需要 2、防止circle loops
    // 3、需要try catch的只能是语句，像() => 0这种的body，是不需要的
    // 4、如果函数内容小于等于 limitLine 行不try catch，这里暴露出来给用户设置
    if (blockStatement.body && types.isTryStatement(blockStatement.body[0])
      || !types.isBlockStatement(blockStatement) && !types.isExpressionStatement(blockStatement)
      || blockStatement.body && blockStatement.body.length <= limitLine) {
      return;
    }

    // 获取函数开头注解，如果注解为传入的disableComment（暴露出来给用户自己设置）则跳过try catch
    var commentsNode = blockStatement.body.length > 0
      ? blockStatement.body[0].leadingComments
      : blockStatement.innerComments || blockStatement.trailingComments
    if (disableComment && commentsNode && commentsNode[0].value.indexOf(disableComment) > -1) {
      return;
    }

    // 将catch handler转为AST节点 然后从AST节点中获取函数体 作为catch里面的内容
    var catchStatement = template.statement(`var tmp = ${catchFunc.toString()}`)();
    var catchBody = catchStatement.declarations[0].init.body;

    // 赋值语句 值包含了函数的行列数和函数名
    var infoDeclaration = types.variableDeclaration('var', [
      types.variableDeclarator(
        types.identifier('info'),
        types.ObjectExpression([
          types.objectProperty(types.identifier('line'), types.numericLiteral(loc.start.line)),
          types.objectProperty(types.identifier('row'), types.numericLiteral(loc.start.column)),
          types.objectProperty(types.identifier('function'), types.stringLiteral(funcName)),
          types.objectProperty(types.identifier('filename'), types.stringLiteral(getFilename(filename)))
        ]))
    ]);

    var catchClause = types.catchClause(types.identifier('error'), types.blockStatement(
      [infoDeclaration].concat(catchBody.body)
    ));
    var tryStatement = types.tryStatement(blockStatement, catchClause);

    var func = null;
    // 区分类方法、对象方法、函数申明还是函数表达式
    if (types.isClassMethod(node)) {
      func = types.classMethod(node.kind, node.key, params, types.BlockStatement([tryStatement]), node.computed, node.static);
    } else if (types.isObjectMethod(node)) {
      func = types.objectMethod(node.kind, node.key, params, types.BlockStatement([tryStatement]), node.computed);
    } else if (types.isFunctionDeclaration(node)) {
      func = types.functionDeclaration(node.id, params, types.BlockStatement([tryStatement]), isGenerator, isAsync);
    } else {
      func = types.functionExpression(node.id, params, types.BlockStatement([tryStatement]), isGenerator, isAsync);
    }
    path.replaceWith(func);
  } catch (error) {
    throw error;
  }
}



module.exports = function ({ types }) {
  return {
    visitor: {
      'ArrowFunctionExpression|FunctionExpression|FunctionDeclaration': function (path, state) {
        generateTryCatch(types, path, state.file.opts.filename, state.opts);
      },
      ClassDeclaration (path, state) {
        path.traverse({
          ClassMethod (path) {
            generateTryCatch(types, path, state.file.opts.filename, state.opts);
          }
        });
      },
      ObjectExpression (path, state) {
        path.traverse({
          ObjectMethod (path) {
            generateTryCatch(types, path, state.file.opts.filename, state.opts);
          }
        });
      }
    }
  }
}
