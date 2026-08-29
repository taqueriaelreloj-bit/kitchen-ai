import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { LuisKitchenReviewApp } from './src/components/LuisKitchenReviewApp';
import './src/services/webLayoutFixes';

function Root(){
  return createElement(AppErrorBoundary,null,createElement(LuisKitchenReviewApp));
}

registerRootComponent(Root);
