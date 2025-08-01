import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dark-mode-toggle',
  templateUrl: './dark-mode-toggle.component.html',
  styleUrls: ['./dark-mode-toggle.component.css']
})
export class DarkModeToggleComponent implements OnInit {
  isDarkMode: boolean = false;

  constructor() {}

  ngOnInit(): void {
    // Verificar si el modo oscuro está activado en localStorage
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      this.enableDarkMode();
    } else {
      this.disableDarkMode();
    }
  }

  toggleDarkMode(): void {
    if (this.isDarkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  enableDarkMode(): void {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');
    this.isDarkMode = true;
  }

  disableDarkMode(): void {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'false');
    this.isDarkMode = false;
  }
}