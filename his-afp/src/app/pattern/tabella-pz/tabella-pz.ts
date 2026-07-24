import { ChangeDetectionStrategy, Component, effect, inject, model } from '@angular/core';
import { PatientManager } from '../../core/Pazienti/patient-manager';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { CardPz } from '../../ui/card-pz/card-pz';
import { Button } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';

@Component({
  selector: 'his-tabella-pz',
  imports: [FormsModule, InputText, CardPz, Button, ToggleSwitch],
  templateUrl: './tabella-pz.html',
  styleUrl: './tabella-pz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabellaPz {
  readonly PatientManager = inject(PatientManager);
  nomePaziente = model<string>('');
  enableRefreshPz = model<boolean>(false);

  constructor() {
    effect(() => {
      this.PatientManager.filterByName(this.nomePaziente());

      if (this.enableRefreshPz()) {
        this.PatientManager.refreshPazienti();
      } else {
        this.PatientManager.stopRefreshPazienti();
      }
    });
  }

  onDischarge(admissionId: number) {
    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      return;
    }

    const confirmed = window.confirm('Confermi la dimissione del paziente selezionato?');
    if (!confirmed) return;

    this.PatientManager.changeAdmissionStatus(admissionId, 'DIM', () => {
      this.PatientManager.fetchPazienti();
    });
  }
}
