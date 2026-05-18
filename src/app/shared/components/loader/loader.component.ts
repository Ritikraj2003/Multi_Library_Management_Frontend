import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader" [ngClass]="{'loader-small': size === 'small'}">
      <div class="dot dot-1"></div>
      <div class="dot dot-2"></div>
      <div class="dot dot-3"></div>
      <div class="dot dot-4"></div>
      <div class="dot dot-5"></div>
    </div>
  `,
  styles: [`
    .loader {
      display: inline-flex;
      justify-content: center;
      align-items: center;
    }

    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 8px;
      border-radius: 50%;
      animation: dot-pulse2 1.5s ease-in-out infinite;
    }

    .loader-small .dot {
      width: 6px;
      height: 6px;
      margin-right: 4px;
    }

    .dot-1 {
      background-color: #4285f4;
      animation-delay: 0s;
    }

    .dot-2 {
      background-color: #34a853;
      animation-delay: 0.3s;
    }

    .dot-3 {
      background-color: #fbbc05;
      animation-delay: 0.6s;
    }

    .dot-4 {
      background-color: #ea4335;
      animation-delay: 0.9s;
    }

    .dot-5 {
      background-color: #4285f4;
      animation-delay: 1.2s;
    }

    @keyframes dot-pulse2 {
      0% {
        transform: scale(0.5);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.2);
        opacity: 1;
      }
      100% {
        transform: scale(0.5);
        opacity: 0.5;
      }
    }
  `]
})
export class LoaderComponent {
  @Input() size: 'normal' | 'small' = 'normal';
}
