import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import App from './App';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import './src/services/webLayoutFixes';

function Root(){
  return createElement(AppErrorBoundary,null,createElement(App));
}

registerRootComponent(Root);
