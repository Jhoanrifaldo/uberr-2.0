import { Component, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        @if (auth.esConductor()) {
          <ion-tab-button tab="conductor">
            <ion-icon name="speedometer-outline"></ion-icon>
            <ion-label>Conducir</ion-label>
          </ion-tab-button>
        } @else {
          <ion-tab-button tab="inicio">
            <ion-icon name="home-outline"></ion-icon>
            <ion-label>Inicio</ion-label>
          </ion-tab-button>
        }
        <ion-tab-button tab="historial">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>Actividad</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil">
          <ion-icon name="person-circle-outline"></ion-icon>
          <ion-label>Cuenta</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`ion-tab-bar { --border: 1px solid var(--u-borde); height: 58px; } ion-label { font-weight: 600; font-size: 11px; }`],
})
export class TabsPage {
  auth = inject(AuthService);
}
