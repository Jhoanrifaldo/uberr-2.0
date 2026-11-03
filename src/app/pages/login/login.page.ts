import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonInput, IonButton, IonIcon, IonSpinner, IonInputPasswordToggle, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { ConfigService } from '../../core/config.service';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  imports: [FormsModule, RouterLink, IonContent, IonInput, IonButton, IonIcon, IonSpinner, IonInputPasswordToggle],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);
  cfg = inject(ConfigService);

  email = '';
  password = '';
  cargando = signal(false);

  async entrar() {
    if (!this.email || !this.password) return this.aviso('Escribe tu correo y contraseña.');
    this.cargando.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: u => {
        this.cargando.set(false);
        this.router.navigateByUrl(u.role === 'conductor' ? '/app/conductor' : '/app/inicio', { replaceUrl: true });
      },
      error: e => { this.cargando.set(false); this.aviso(mensajeError(e)); },
    });
  }

  private async aviso(message: string) {
    (await this.toast.create({ message, duration: 3500, position: 'top', color: 'dark' })).present();
  }
}
