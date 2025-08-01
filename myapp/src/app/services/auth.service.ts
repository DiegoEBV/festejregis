import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  // Usuarios predefinidos del sistema
  private users = [
    { id: 1, nombre: 'Cajero', rol: 'cajero', password: 'cajero123' },
    { id: 2, nombre: 'Mozo', rol: 'mozo', password: 'mozo123' },
    { id: 3, nombre: 'Cocina', rol: 'cocina', password: 'cocina123' }
  ];

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
  login(rol: string, password: string): boolean {
    const user = this.users.find(u => u.rol === rol && u.password === password);
    
    if (user) {
      // Almacenar usuario en localStorage y actualizar el BehaviorSubject
      const userInfo = { id: user.id, nombre: user.nombre, rol: user.rol };
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
    return !!this.currentUserValue;
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(role: string): boolean {
    return this.isAuthenticated() && this.currentUserValue.rol === role;
  }

  // Verificar si el usuario es cajero
  isCajero(): boolean {
    return this.hasRole('cajero');
  }

  // Verificar si el usuario es mozo
  isMozo(): boolean {
    return this.hasRole('mozo');
  }

  // Verificar si el usuario es cocina
  isCocina(): boolean {
    return this.hasRole('cocina');
  }
}