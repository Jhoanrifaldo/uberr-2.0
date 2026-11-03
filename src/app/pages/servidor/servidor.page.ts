import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonInput, IonButton,
  IonIcon, IonToggle, IonSpinner, ToastController,
} from '@ionic/angular/standalone';
import { ConfigService, ServidorConfig } from '../../core/config.service';
import { ApiService } from '../../core/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-servidor',
  templateUrl: './servidor.page.html',
  styleUrl: './servidor.page.scss',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonInput,
    IonButton, IonIcon, IonToggle, IonSpinner],
})
export class ServidorPage {
  cfg = inject(ConfigService);
  private api = inject(ApiService);
  private toast = inject(ToastController);
  private nav = inject(NavController);

  form: ServidorConfig = { ...this.cfg.config() };
  probando = signal(false);
  resultado = signal<{ ok: boolean; detalle: string } | null>(null);
  readonly ipPorDefecto = environment.apiHost;

  get urlVista() {
    if (this.form.usarProxy) return `${this.form.prefix}  →  proxy → http://${environment.apiHost}:${environment.apiPort}`;
    return `http://${this.form.host || '?'}:${this.form.port}${this.form.prefix}`;
  }

  probar() {
    this.cfg.guardar({ ...this.form, demo: false });
    this.probando.set(true);
    this.resultado.set(null);
    this.api.probarConexion().subscribe(r => {
      this.probando.set(false);
      this.resultado.set(r);
      this.cfg.guardar(this.form); // restaura el modo demo si estaba activo
    });
  }

  async guardar() {
    this.cfg.guardar({ ...this.form, port: Number(this.form.port) || 8000 });
    (await this.toast.create({ message: 'Servidor guardado', duration: 1800, position: 'top', color: 'dark' })).present();
    this.nav.back();
  }

  restablecer() {
    this.cfg.restablecer();
    this.form = { ...this.cfg.config() };
    this.resultado.set(null);
  }
}
