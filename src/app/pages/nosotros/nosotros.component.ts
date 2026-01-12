import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.css'
})
export class NosotrosComponent implements OnInit {
  visibleSections: boolean[] = [false, false, false, false, false, false];
  currentImagePosition: string = 'left';
  showImage: boolean = false;

  ngOnInit() {
    this.checkVisibility();
    this.updateImagePosition();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.checkVisibility();
    this.updateImagePosition();
  }

  checkVisibility() {
    const blocks = document.querySelectorAll('.row-content, .final-section, .cta');
    blocks.forEach((block, index) => {
      const rect = block.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight * 0.75) {
        this.visibleSections[index] = true;
      }
    });
  }

  updateImagePosition() {
    const rows = Array.from(document.querySelectorAll('.story-row'));
    const windowHeight = window.innerHeight;
    const centerY = windowHeight * 0.4;

    // Obtener los límites: primer y último story-row
    const firstRow = rows[0] as HTMLElement;
    const lastRow = rows[rows.length - 1] as HTMLElement;

    if (!firstRow || !lastRow) return;

    const firstRowRect = firstRow.getBoundingClientRect();
    const lastRowRect = lastRow.getBoundingClientRect();

    // Verificar si estamos ANTES del primer row (arriba) - OCULTAR IMAGEN
    if (firstRowRect.top > centerY) {
      this.showImage = false;
      return;
    }

    // Verificar si estamos DESPUÉS del último row (abajo) - OCULTAR IMAGEN
    if (lastRowRect.bottom < centerY) {
      this.showImage = false;
      return;
    }

    // Estamos dentro del rango - MOSTRAR IMAGEN
    this.showImage = true;

    // Solo actualizar la posición si estamos dentro del rango
    let closestRow: HTMLElement | null = null;
    let closestDistance = Infinity;

    for (const row of rows) {
      const htmlRow = row as HTMLElement;
      const rect = htmlRow.getBoundingClientRect();
      const rowCenter = rect.top + rect.height / 2;
      const distance = Math.abs(rowCenter - centerY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestRow = htmlRow;
      }
    }

    if (closestRow) {
      const position = closestRow.getAttribute('data-position');
      if (position) {
        this.currentImagePosition = position;
      }
    }
  }
}
