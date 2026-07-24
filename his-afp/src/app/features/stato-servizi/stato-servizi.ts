import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatoAPI } from '../../ui/stato-api/stato-api';

@Component({
  selector: 'his-stato-servizi',
  imports: [CommonModule, StatoAPI],
  templateUrl: './stato-servizi.html',
  styleUrl: './stato-servizi.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatoServizi {
  protected readonly title = 'Stato Servizi';
}
