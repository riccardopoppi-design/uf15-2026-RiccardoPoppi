import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Button } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { DarkmodeSelector } from '../darkmode-selector/darkmode-selector.component';
import { Divider } from 'primeng/divider';
import { environment } from '../../../environments/environment';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'his-header',
  imports: [Button, RouterLink, DarkmodeSelector, Divider, TagModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  reparto = environment.reparto;
  struttura = environment.struttura;

  /**
   * vx.y.z - 20260413 P
   * vx.y.z P
   */

  type = window.env?.type;
  version = window.env?.version;
}
