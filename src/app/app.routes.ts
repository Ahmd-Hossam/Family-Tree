import { Routes } from '@angular/router';
import { FamilyTree } from './family-tree/family-tree';
import { FamilyWrapper } from './family-wrapper/family-wrapper';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'family-wrapper',
    pathMatch: 'full',
  },
  {
    path: 'family-wrapper',
    component: FamilyWrapper,
  },

  // app.routes.ts configuration
  { path: 'tree/:treeId', component: FamilyTree },
];
