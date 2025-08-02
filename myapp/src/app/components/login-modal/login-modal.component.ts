import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Iniciar Sesión</h3>
          <button class="close-btn" (click)="close()">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="user-selection">
            <h4>Selecciona tu rol:</h4>
            <div class="role-buttons">
              <button 
                class="role-btn" 
                [class.active]="selectedRole === 'caja'"
                (click)="selectRole('caja')">
                <i class="icon">💰</i>
                <span>Caja</span>
              </button>
              
              <button 
                class="role-btn" 
                [class.active]="selectedRole === 'moso'"
                (click)="selectRole('moso')">
                <i class="icon">🍽️</i>
                <span>Mozo</span>
              </button>
              
              <button 
                class="role-btn" 
                [class.active]="selectedRole === 'cocina'"
                (click)="selectRole('cocina')">
                <i class="icon">👨‍🍳</i>
                <span>Cocina</span>
              </button>
            </div>
          </div>
          
          <div class="form-group" *ngIf="selectedRole === 'moso'">
            <label for="nombreMoso">Nombre del Mozo:</label>
            <input 
              type="text" 
              id="nombreMoso" 
              [(ngModel)]="nombreMoso" 
              placeholder="Ingresa tu nombre"
              class="form-control">
          </div>
          
          <div class="form-group" *ngIf="selectedRole">
            <label for="password">Contraseña:</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="password" 
              placeholder="Ingresa la contraseña"
              class="form-control"
              (keyup.enter)="login()">
          </div>
          
          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close()">Cancelar</button>
          <button 
            class="btn btn-primary" 
            (click)="login()"
            [disabled]="!selectedRole || !password">
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }
    
    .modal-header h3 {
      margin: 0;
      color: #333;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      color: #000;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .user-selection h4 {
      margin-bottom: 1rem;
      color: #333;
      text-align: center;
    }
    
    .role-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    
    .role-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 80px;
    }
    
    .role-btn:hover {
      border-color: #007bff;
      transform: translateY(-2px);
    }
    
    .role-btn.active {
      border-color: #007bff;
      background-color: #e3f2fd;
    }
    
    .role-btn .icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .role-btn span {
      font-weight: 500;
      color: #333;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }
    
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-align: center;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid #eee;
    }
    
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.3s ease;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #5a6268;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LoginModalComponent {
  @Input() isVisible = false;
  @Output() loginSuccess = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedRole: 'caja' | 'moso' | 'cocina' | null = null;
  password = '';
  nombreMoso = '';
  errorMessage = '';

  constructor(private authService: AuthService) {}

  selectRole(role: 'caja' | 'moso' | 'cocina') {
    this.selectedRole = role;
    this.password = '';
    this.errorMessage = '';
  }

  login() {
    if (!this.selectedRole || !this.password) {
      this.errorMessage = 'Por favor selecciona un rol e ingresa la contraseña';
      return;
    }

    const nombre = this.selectedRole === 'moso' ? this.nombreMoso : undefined;
    const success = this.authService.login(this.selectedRole, this.password, nombre);

    if (success) {
      this.loginSuccess.emit(this.authService.currentUserValue);
      this.close();
    } else {
      this.errorMessage = 'Contraseña incorrecta';
    }
  }

  close() {
    this.isVisible = false;
    this.selectedRole = null;
    this.password = '';
    this.nombreMoso = '';
    this.errorMessage = '';
    this.closeModal.emit();
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}