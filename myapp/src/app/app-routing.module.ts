import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// import { HomeComponent } from './pages/home/home.component'; // Ahora se carga de forma lazy
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { ProductividadComponent } from './pages/productividad/productividad.component';

const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'historial', component: HistorialComponent },
  { path: 'productividad', component: ProductividadComponent },
  { path: '**', redirectTo: '' } // Ruta por defecto
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }