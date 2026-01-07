import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

interface Video {
  id: string;
  titulo: string;
  duracion: string;
  thumbnail: string;
  videoUrl: string;
}

interface CursoData {
  id: string;
  titulo: string;
  descripcion: string;
  teoria: Video;
  practicas: Video[];
}

@Component({
  selector: 'app-curso',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './curso.component.html',
  styleUrl: './curso.component.css'
})
export class CursoComponent implements OnInit {
  cursoId: string = '';
  curso: CursoData | null = null;
  selectedVideo: Video | null = null;

  // Sistema de autenticación
  isAuthenticated: boolean = false;
  showWelcome: boolean = false;
  loginError: string = '';
  username: string = '';
  password: string = '';

  // Credenciales de prueba
  private validUsername = 'prueba';
  private validPassword = 'prueba123';

  // Base de datos de cursos
  private cursosDB: { [key: string]: CursoData } = {
    'mullet': {
      id: 'mullet',
      titulo: 'CORTES MULLET',
      descripcion: 'Aprende todos los estilos de mullet modernos, desde el clásico hasta las variaciones más actuales.',
      teoria: {
        id: 'mullet-teoria',
        titulo: 'Fundamentos del Mullet',
        duracion: '45:00',
        thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'mullet-p1', titulo: 'Mullet Clásico', duracion: '15:30', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'mullet-p2', titulo: 'Mullet Moderno', duracion: '18:45', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'mullet-p3', titulo: 'Mullet con Fade', duracion: '20:00', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'mullet-p4', titulo: 'Mullet Texturizado', duracion: '16:20', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    },
    'fade': {
      id: 'fade',
      titulo: 'FADES PROFESIONALES',
      descripcion: 'Domina las técnicas de degradado: low fade, mid fade, high fade y skin fade.',
      teoria: {
        id: 'fade-teoria',
        titulo: 'Teoría del Degradado Perfecto',
        duracion: '50:00',
        thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'fade-p1', titulo: 'Low Fade', duracion: '18:00', thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'fade-p2', titulo: 'Mid Fade', duracion: '17:30', thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'fade-p3', titulo: 'High Fade', duracion: '19:00', thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'fade-p4', titulo: 'Skin Fade', duracion: '22:00', thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    },
    'barba': {
      id: 'barba',
      titulo: 'DISEÑO DE BARBA',
      descripcion: 'Técnicas profesionales de perfilado, diseño y mantenimiento de barba.',
      teoria: {
        id: 'barba-teoria',
        titulo: 'Anatomía y Técnicas de Barba',
        duracion: '40:00',
        thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'barba-p1', titulo: 'Perfilado Básico', duracion: '12:00', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'barba-p2', titulo: 'Barba Degradada', duracion: '15:00', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'barba-p3', titulo: 'Diseño de Líneas', duracion: '14:30', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'barba-p4', titulo: 'Barba Full', duracion: '18:00', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    },
    'clasicos': {
      id: 'clasicos',
      titulo: 'CORTES CLÁSICOS',
      descripcion: 'Los estilos atemporales que todo barbero profesional debe dominar.',
      teoria: {
        id: 'clasicos-teoria',
        titulo: 'Historia y Técnica de Cortes Clásicos',
        duracion: '55:00',
        thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'clasicos-p1', titulo: 'Pompadour', duracion: '20:00', thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'clasicos-p2', titulo: 'Slick Back', duracion: '16:00', thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'clasicos-p3', titulo: 'Side Part', duracion: '18:00', thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'clasicos-p4', titulo: 'Crew Cut', duracion: '14:00', thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    },
    'disenos': {
      id: 'disenos',
      titulo: 'DISEÑOS & LÍNEAS',
      descripcion: 'El arte del cabello: líneas precisas, figuras y diseños creativos.',
      teoria: {
        id: 'disenos-teoria',
        titulo: 'Fundamentos del Hair Art',
        duracion: '35:00',
        thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'disenos-p1', titulo: 'Líneas Básicas', duracion: '12:00', thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'disenos-p2', titulo: 'Líneas Curvas', duracion: '15:00', thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'disenos-p3', titulo: 'Figuras Geométricas', duracion: '20:00', thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'disenos-p4', titulo: 'Diseños Avanzados', duracion: '25:00', thumbnail: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    }
  };

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.cursoId = params['id'];
      this.curso = this.cursosDB[this.cursoId] || null;
      this.isAuthenticated = false;
      this.showWelcome = false;
      this.loginError = '';
      this.username = '';
      this.password = '';
    });
  }

  login() {
    if (this.username === this.validUsername && this.password === this.validPassword) {
      this.loginError = '';
      this.showWelcome = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.isAuthenticated = true;
        this.showWelcome = false;
        if (this.curso) {
          this.selectedVideo = this.curso.teoria;
        }
        this.cdr.detectChanges();
      }, 3000);
    } else {
      this.loginError = 'Usuario o contraseña incorrectos. Intenta de nuevo.';
    }
  }

  selectVideo(video: Video) {
    this.selectedVideo = video;
    const player = document.querySelector('.video-player');
    if (player) {
      player.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  isSelected(video: Video): boolean {
    return this.selectedVideo?.id === video.id;
  }

  logout() {
    this.isAuthenticated = false;
    this.showWelcome = false;
    this.username = '';
    this.password = '';
    this.selectedVideo = null;
  }
}
