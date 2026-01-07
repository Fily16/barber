import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  videosCount: number;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent {
  cursos: Curso[] = [
    {
      id: 'mullet',
      titulo: 'CORTES MULLET',
      descripcion: 'Domina todos los estilos de mullet modernos',
      imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600',
      videosCount: 5
    },
    {
      id: 'fade',
      titulo: 'FADES PROFESIONALES',
      descripcion: 'Low, mid y high fade perfectos',
      imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
      videosCount: 5
    },
    {
      id: 'barba',
      titulo: 'DISEÑO DE BARBA',
      descripcion: 'Técnicas de perfilado y diseño',
      imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600',
      videosCount: 5
    },
    {
      id: 'clasicos',
      titulo: 'CORTES CLÁSICOS',
      descripcion: 'Estilos atemporales que nunca pasan de moda',
      imagen: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600',
      videosCount: 5
    },
    {
      id: 'disenos',
      titulo: 'DISEÑOS & LÍNEAS',
      descripcion: 'Arte en cabello: líneas, figuras y más',
      imagen: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600',
      videosCount: 5
    }
  ];
}
