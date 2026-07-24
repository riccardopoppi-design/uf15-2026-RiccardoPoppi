import { Component, inject, input, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Button } from 'primeng/button';
import { Paziente } from '../../core/Pazienti/Pazienti.model';
import { Router } from '@angular/router';

@Component({
  selector: 'his-card-pz',
  imports: [CardModule, Button],
  templateUrl: './card-pz.html',
  styleUrl: './card-pz.scss',
})
export class CardPz {
  paziente = input.required<Paziente>();
  borderTop = input.required<boolean>();
  dischargeRequested = output<number>();
  readonly #router = inject(Router);

  public navigateToSchedaPaziente() {
    this.#router.navigate([`/modifica-pz/${this.paziente().id}`]);
  }

  public requestDischarge() {
    this.dischargeRequested.emit(Number(this.paziente().id));
  }

  setBorder() {
    return this.borderTop() ? 'border-t-8' : 'border-b-8';
  }

  setColoreDiStato() {
    switch (this.paziente().codiceColore) {
      case 'ROSSO':
        return 'border-red-600';
      case 'ARANCIONE':
        return 'border-orange-400';
      case 'AZZURRO':
        return 'border-blue-600';
      case 'VERDE':
        return 'border-green-600';
      case 'BIANCO':
        return 'border-gray-600';
      default:
        return '';
    }
  }
}
