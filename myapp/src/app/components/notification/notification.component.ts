import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: false,
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notification: Notification | null = null;
  private subscription: Subscription | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notification$.subscribe(
      (notification) => {
        this.notification = notification;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  close(): void {
    this.notificationService.hide();
  }

  // Obtener la clase CSS según el tipo de notificación
  getNotificationClass(): string {
    if (!this.notification) return '';
    
    switch (this.notification.type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'info':
        return 'notification-info';
      case 'warning':
        return 'notification-warning';
      default:
        return '';
    }
  }
}