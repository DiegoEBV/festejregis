import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-side-menu',
  standalone: false,
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.css']
})
export class SideMenuComponent implements OnInit {
  @Input() menuOpen: boolean = false;
  @Output() menuToggle = new EventEmitter<boolean>();

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.menuToggle.emit(this.menuOpen);
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.menuToggle.emit(this.menuOpen);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMenu();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
    this.closeMenu();
  }
}