import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ring-page" [ngClass]="{'loader-small': size === 'small'}">
      <div class="ring-container">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring-text">loading</div>
      </div>
    </div>
  `,
  styles: [`
    .ring-page {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ring-container {
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    .ring-text {
      color: rgb(82, 79, 79);
      font-weight: 500;
      letter-spacing: 1px;
    }

    .ring {
      width: 190px;
      height: 190px;
      border: 1px solid transparent;
      border-radius: 50%;
      position: absolute;
    }

    /* Support for small loader size if used in tables */
    .loader-small .ring {
      width: 60px;
      height: 60px;
    }
    .loader-small .ring:nth-child(n) {
      border-bottom-width: 3px !important;
    }
    .loader-small .ring-text {
      font-size: 10px;
      display: none; /* Usually hide text for small loaders */
    }

    .ring:nth-child(1) {
      border-bottom: 8px solid #27c1bb; /* Primary Teal */
      animation: rotate1 2s linear infinite;
    }

    @keyframes rotate1 {
      from { transform: rotateX(50deg) rotateZ(110deg); }
      to { transform: rotateX(50deg) rotateZ(470deg); }
    }

    .ring:nth-child(2) {
      border-bottom: 8px solid #0f172a; /* Sidebar Dark Slate */
      animation: rotate2 2s linear infinite;
    }

    @keyframes rotate2 {
      from { transform: rotateX(20deg) rotateY(50deg) rotateZ(20deg); }
      to { transform: rotateX(20deg) rotateY(50deg) rotateZ(380deg); }
    }

    .ring:nth-child(3) {
      border-bottom: 8px solid #63d5d1; /* Light Teal */
      animation: rotate3 2s linear infinite;
    }

    @keyframes rotate3 {
      from { transform: rotateX(40deg) rotateY(130deg) rotateZ(450deg); }
      to { transform: rotateX(40deg) rotateY(130deg) rotateZ(90deg); }
    }

    .ring:nth-child(4) {
      border-bottom: 8px solid #1a8581; /* Dark Teal */
      animation: rotate4 2s linear infinite;
    }

    @keyframes rotate4 {
      from { transform: rotateX(70deg) rotateZ(270deg); }
      to { transform: rotateX(70deg) rotateZ(630deg); }
    }
  `]
})
export class LoaderComponent {
  @Input() size: 'normal' | 'small' = 'normal';
}
