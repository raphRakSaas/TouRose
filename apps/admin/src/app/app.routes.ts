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
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.page').then((module) => module.DashboardPage),
      },
      {
        path: 'places',
        loadComponent: () =>
          import('./pages/places-list.page').then((module) => module.PlacesListPage),
      },
      {
        path: 'places/new',
        loadComponent: () =>
          import('./pages/place-form.page').then((module) => module.PlaceFormPage),
      },
      {
        path: 'places/:placeId',
        loadComponent: () =>
          import('./pages/place-form.page').then((module) => module.PlaceFormPage),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./pages/events-list.page').then((module) => module.EventsListPage),
      },
      {
        path: 'events/new',
        loadComponent: () =>
          import('./pages/event-form.page').then((module) => module.EventFormPage),
      },
      {
        path: 'events/:eventId',
        loadComponent: () =>
          import('./pages/event-form.page').then((module) => module.EventFormPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
