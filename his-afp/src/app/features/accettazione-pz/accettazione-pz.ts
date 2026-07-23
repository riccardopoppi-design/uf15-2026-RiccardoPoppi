import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PazienteDTO } from '../../core/Pazienti/Pazienti.model';
import { PatientSearch } from './patient-search';
import { AccettazioneForm } from './accettazione-form';

@Component({
  selector: 'his-accettazione-pz',
  standalone: true,
  imports: [
    CommonModule,
    PatientSearch,
    AccettazioneForm,
  ],
  templateUrl: './accettazione-pz.html',
  styleUrl: './accettazione-pz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccettazionePz {
  showForm = signal(false);
  selectedPatient = signal<PazienteDTO | null>(null);

  openNewPatientForm() {
    this.selectedPatient.set(null);
    this.showForm.set(true);
  }

  onPatientSelected(patient: PazienteDTO) {
    this.selectedPatient.set(patient);
    this.showForm.set(true);
  }

  onFormClosed() {
    this.showForm.set(false);
    this.selectedPatient.set(null);
  }
}
