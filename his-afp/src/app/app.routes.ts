import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'gestione-personale',
    loadComponent: () => import('./features/gestione-personale/gestione-personale').then(m => m.GestionePersonaleComponent)
  },
  {
    path: 'lista-pz',
    loadComponent: () => import('./features/lista-pz/lista-pz').then((m) => m.ListaPz),
  },
  {
    path: 'accettazione-pz',
    loadComponent: () =>
      import('./features/accettazione-pz/accettazione-pz').then((m) => m.AccettazionePz),
  },
  // {
  //   path: 'modifica-pz',
  //   loadComponent: () => import('./features/modifica-pz/modifica-pz').then((m) => m.ModificaPz),
  // },
  {
    // /modifica-pz?id=2
    path: 'modifica-pz/:patientId',
    loadComponent: () => import('./features/modifica-pz/modifica-pz').then((m) => m.ModificaPz),
  },
  {
    path: 'stato-servizi',
    loadComponent: () =>
      import('./features/stato-servizi/stato-servizi').then((m) => m.StatoServizi),
  },
  {
    path: '',
    redirectTo: 'lista-pz',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'stato-servizi',
    pathMatch: 'full',
  },
];
