import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root=process.cwd();
const configPath=ts.findConfigFile(root,ts.sys.fileExists,'tsconfig.json');
if(!configPath){
  console.error('lint: tsconfig.json was not found');
  process.exit(1);
}

const configFile=ts.readConfigFile(configPath,ts.sys.readFile);
if(configFile.error){
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText,'\n'));
  process.exit(1);
}
const parsed=ts.parseJsonConfigFileContent(configFile.config,ts.sys,path.dirname(configPath));
const program=ts.createProgram(parsed.fileNames,parsed.options);
const errors=[];
const warnings=[];

const location=(source,node)=>{
  const point=source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${path.relative(root,source.fileName)}:${point.line+1}:${point.character+1}`;
};
const addError=(source,node,message)=>errors.push(`${location(source,node)} ${message}`);
const addWarning=(source,node,message)=>warnings.push(`${location(source,node)} ${message}`);

for(const diagnostic of program.getSyntacticDiagnostics()){
  const message=ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n');
  if(diagnostic.file&&typeof diagnostic.start==='number'){
    const point=diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    errors.push(`${path.relative(root,diagnostic.file.fileName)}:${point.line+1}:${point.character+1} ${message}`);
  }else errors.push(message);
}

for(const source of program.getSourceFiles()){
  if(source.isDeclarationFile||source.fileName.includes(`${path.sep}node_modules${path.sep}`))continue;
  const relative=path.relative(root,source.fileName);
  if(relative.startsWith('dist'+path.sep)||relative.startsWith('.expo'+path.sep))continue;

  const imports=new Map();
  const text=source.getFullText();
  if(/@ts-ignore\b/.test(text))errors.push(`${relative}:1:1 @ts-ignore is not allowed; use a typed compatibility boundary instead`);
  const lines=text.split(/\r?\n/);
  if(lines.length>900)warnings.push(`${relative}:1:1 file has ${lines.length} lines; consider extracting focused components`);
  lines.forEach((line,index)=>{
    if(/[ \t]+$/.test(line))warnings.push(`${relative}:${index+1}:${line.length} trailing whitespace`);
  });

  const visit=node=>{
    if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){
      const moduleName=node.moduleSpecifier.text;
      if(imports.has(moduleName))addError(source,node,`duplicate import from ${moduleName}`);
      imports.set(moduleName,node);
    }
    if(node.kind===ts.SyntaxKind.DebuggerStatement)addError(source,node,'debugger statement is not allowed');
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='console'){
      const method=node.expression.name.text;
      if(method==='log'||method==='debug')addError(source,node,`console.${method} is not allowed in committed application code`);
    }
    if(ts.isCatchClause(node)&&node.block.statements.length===0)addWarning(source,node,'empty catch block hides failures');
    ts.forEachChild(node,visit);
  };
  visit(source);
}

for(const warning of warnings)console.warn(`warning ${warning}`);
if(errors.length){
  for(const error of errors)console.error(`error ${error}`);
  console.error(`lint failed with ${errors.length} error${errors.length===1?'':'s'} and ${warnings.length} warning${warnings.length===1?'':'s'}`);
  process.exit(1);
}
console.log(`lint passed: ${program.getSourceFiles().filter(file=>!file.isDeclarationFile&&!file.fileName.includes('node_modules')).length} source files checked, ${warnings.length} warning${warnings.length===1?'':'s'}`);
