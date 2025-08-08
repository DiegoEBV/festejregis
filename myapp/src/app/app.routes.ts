import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { ProductividadComponent } from './pages/productividad/productividad.component';
import { SeleccionMesaComponent } from './components/seleccion-mesa/seleccion-mesa.component';
import { PedidoMesaComponent } from './components/pedido-mesa/pedido-mesa.component';



export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'historial', component: HistorialComponent },
  { path: 'productividad', component: ProductividadComponent },
  { path: 'seleccion-mesa', component: SeleccionMesaComponent },
  { path: 'pedido-mesa/:numero', component: PedidoMesaComponent },


  { path: '**', redirectTo: '' }
];
