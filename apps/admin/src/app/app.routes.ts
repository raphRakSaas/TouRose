import { Routes } from '@angular/router';

import { adminShellGuard } from './core/admin-shell.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((module) => module.LoginPage),
  },
  {
    path: '',
    canActivate: [adminShellGuard],
    loadComponent: () =>
      import('./layout/admin-shell.component').then((module) => module.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.page').then((module) => module.DashboardPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
