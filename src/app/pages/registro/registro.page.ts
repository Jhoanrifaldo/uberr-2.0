import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInput, IonButton, IonIcon,
  IonSpinner, IonInputPasswordToggle, ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { Rol } from '../../core/models';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrl: './registro.page.scss',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInput, IonButton,
    IonIcon, IonSpinner, IonInputPasswordToggle],
})
export class RegistroPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);

  rol = signal<Rol>('pasajero');
  name = ''; email = ''; phone = ''; password = '';
  cargando = signal(false);

  crear() {
    if (!this.name || !this.email || !this.password) return this.aviso('Completa nombre, correo y contraseña.');
    if (this.password.length < 8) return this.aviso('La contraseña debe tener mínimo 8 caracteres.');
    this.cargando.set(true);
    this.auth.registrar({ name: this.name, email: this.email.trim(), phone: this.phone, password: this.password, role: this.rol() })
      .subscribe({
        next: u => {
          this.cargando.set(false);
          if (this.auth.logueado()) {
            this.router.navigateByUrl(u.role === 'conductor' ? '/app/conductor' : '/app/inicio', { replaceUrl: true });
          } else {
            this.aviso('Cuenta creada. Ahora inicia sesión.');
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        },
        error: e => { this.cargando.set(false); this.aviso(mensajeError(e)); },
      });
  }

  private async aviso(message: string) {
    (await this.toast.create({ message, duration: 3500, position: 'top', color: 'dark' })).present();
  }
}
