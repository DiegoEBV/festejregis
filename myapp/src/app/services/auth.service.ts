import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  // Claves simples como en el sistema original
  private claves = {
    caja: '123',
    moso: '456',
    cocina: '789'
  };

  constructor() {
    // Intentar recuperar usuario de localStorage al iniciar
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // Obtener el usuario actual
  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  // Iniciar sesión
  login(tipo: 'caja' | 'moso' | 'cocina', clave: string, nombre?: string): boolean {
    if (this.claves[tipo] === clave) {
      const userInfo = { 
        tipo, 
        nombre: nombre || tipo, 
        autenticado: true,
        clave: clave // Guardar clave para autenticación de socket
      };
      localStorage.setItem('currentUser', JSON.stringify(userInfo));
      this.currentUserSubject.next(userInfo);
      return true;
    }
    return false;
  }

  // Cerrar sesión
  logout(): void {
    // Eliminar usuario de localStorage y actualizar el BehaviorSubject
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const usuario = this.currentUserValue;
    return usuario?.autenticado || false;
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(role: 'caja' | 'moso' | 'cocina'): boolean {
    const usuario = this.currentUserValue;
    return usuario?.tipo === role || false;
  }

  // Métodos específicos para cada rol
  isCaja(): boolean {
    return this.hasRole('caja');
  }

  // Verificar si es mozo
  isMoso(): boolean {
    return this.hasRole('moso');
  }

  // Verificar si es cocina
  isCocina(): boolean {
    return this.hasRole('cocina');
  }

  // Métodos de acceso
  canAccessCaja(): boolean {
    return this.hasRole('caja');
  }

  canAccessMoso(): boolean {
    return this.hasRole('moso') || this.hasRole('caja');
  }

  canAccessCocina(): boolean {
    return this.hasRole('cocina');
  }

  // Método para obtener el usuario actual (compatibilidad)
  getUsuarioActual(): any {
    return this.currentUserValue;
  }
}