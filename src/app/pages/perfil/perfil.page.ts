import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonInput, IonSpinner, IonModal,
  IonButtons, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { ConfigService } from '../../core/config.service';
import { mensajeError } from '../../core/interceptors';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.scss',
  imports: [FormsModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonInput,
    IonSpinner, IonModal, IonButtons],
})
export class PerfilPage {
  auth = inject(AuthService);
  cfg = inject(ConfigService);
  private alert = inject(AlertController);
  private toast = inject(ToastController);

  editando = signal(false);
  guardando = signal(false);
  form = { name: '', phone: '' };

  ionViewWillEnter() { this.auth.refrescar().subscribe(); }

  inicial() { return (this.auth.usuario()?.name ?? '?').charAt(0).toUpperCase(); }

  abrirEditar() {
    const u = this.auth.usuario();
    this.form = { name: u?.name ?? '', phone: u?.phone ?? '' };
    this.editando.set(true);
  }

  guardar() {
    this.guardando.set(true);
    this.auth.actualizarPerfil(this.form).subscribe({
      next: async () => {
        this.guardando.set(false); this.editando.set(false);
        (await this.toast.create({ message: 'Perfil actualizado', duration: 1800, position: 'top', color: 'dark' })).present();
      },
      error: async e => {
        this.guardando.set(false);
        (await this.toast.create({ message: mensajeError(e), duration: 3000, position: 'top', color: 'dark' })).present();
      },
    });
  }

  async salir() {
    const a = await this.alert.create({
      header: 'Cerrar sesión',
      message: '¿Seguro que quieres salir?',
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Salir', role: 'destructive', handler: () => this.auth.logout() }],
    });
    a.present();
  }
}
