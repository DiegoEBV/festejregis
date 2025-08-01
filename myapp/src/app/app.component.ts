import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Sistema de Registro Pedidos - FESTEJOS';
  deferredPrompt: any;
  
  constructor(private swUpdate: SwUpdate) {}
  
  ngOnInit(): void {
    // Verificar actualizaciones del Service Worker
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(() => {
        if (confirm('Hay una nueva versión disponible. ¿Desea cargarla?')) {
          window.location.reload();
        }
      });
    }
    
    // Escuchar evento de instalación de PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que Chrome muestre automáticamente la solicitud
      e.preventDefault();
      // Guardar el evento para usarlo más tarde
      this.deferredPrompt = e;
      
      // Mostrar el botón de instalación
      const installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.style.display = 'block';
        
        installBtn.addEventListener('click', () => {
          // Mostrar el prompt de instalación
          this.deferredPrompt.prompt();
          
          // Esperar a que el usuario responda al prompt
          this.deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('Usuario aceptó la instalación');
            } else {
              console.log('Usuario rechazó la instalación');
            }
            // Limpiar el prompt guardado, ya que solo se puede usar una vez
            this.deferredPrompt = null;
            // Ocultar el botón de instalación
            installBtn.style.display = 'none';
          });
        });
      }
    });
    
    // Escuchar cuando la app ya está instalada
    window.addEventListener('appinstalled', () => {
      console.log('Aplicación instalada');
      // Ocultar el botón de instalación
      const installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
      this.deferredPrompt = null;
    });
  }
}