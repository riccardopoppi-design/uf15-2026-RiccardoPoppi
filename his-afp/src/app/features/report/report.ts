import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { DischargedAdmissionReport } from '../../core/Pazienti/Pazienti.model';
import { PatientManager } from '../../core/Pazienti/patient-manager';

@Component({
  selector: 'his-report',
  imports: [CommonModule, Button, Message],
  templateUrl: './report.html',
  styleUrl: './report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Report {
  readonly #patientManager = inject(PatientManager);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly sortAsc = signal(false);
  readonly dischargedReports = signal<DischargedAdmissionReport[]>([]);

  readonly visibleRows = computed(() => {
    const onlyDismissed = this.dischargedReports().filter((row) => row.stato === 'DIM');
    const direction = this.sortAsc() ? 1 : -1;

    return [...onlyDismissed].sort((a, b) => {
      const dateA = new Date(a.dataOraDimissione).getTime();
      const dateB = new Date(b.dataOraDimissione).getTime();
      return (dateA - dateB) * direction;
    });
  });

  constructor() {
    this.fetchDischargedAdmissions();
  }

  fetchDischargedAdmissions() {
    this.loading.set(true);
    this.error.set('');

    this.#patientManager.getDischargedAdmissions().subscribe({
      next: (res) => {
        this.dischargedReports.set(res.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Impossibile recuperare il report dimessi ultime 24h.');
        console.error('Errore report dimessi', err);
      },
    });
  }

  toggleSortByDischargeTime() {
    this.sortAsc.set(!this.sortAsc());
  }
}
