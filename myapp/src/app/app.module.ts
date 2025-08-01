// app.module.ts

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Pages
import { HomeComponent } from './pages/home/home.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { ProductividadComponent } from './pages/productividad/productividad.component';

// Components
import { NotificationComponent } from './components/notification/notification.component';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { DarkModeToggleComponent } from './components/dark-mode-toggle/dark-mode-toggle.component';

// Services
import { DexieService } from './services/dexie.service';
import { SocketService } from './services/socket.service';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { CatalogoService } from './services/catalogo.service';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CatalogoComponent,
    HistorialComponent,
    ProductividadComponent,
    NotificationComponent,
    SideMenuComponent,
    DarkModeToggleComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    DexieService,
    SocketService,
    AuthService,
    NotificationService,
    CatalogoService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
