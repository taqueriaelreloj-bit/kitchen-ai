import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import App from './App';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

function Root(){
  return createElement(AppErrorBoundary,null,createElement(App));
}

registerRootComponent(Root);
