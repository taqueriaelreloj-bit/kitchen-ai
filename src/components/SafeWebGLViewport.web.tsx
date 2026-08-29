import { useCallback } from 'react';
import { sanitizeCamera } from '../domain/cameraSafety';
import { EditorProject } from '../domain/editor';
import { WebGLViewport } from './WebGLViewport.web';

export function SafeWebGLViewport({project,preview}:{project:EditorProject;preview:(project:EditorProject)=>void}){
  const safePreview=useCallback((next:EditorProject)=>{
    preview({...next,camera3d:sanitizeCamera(next,next.camera3d).camera});
  },[preview]);
  return <WebGLViewport project={{...project,camera3d:sanitizeCamera(project,project.camera3d).camera}} preview={safePreview}/>;
}
