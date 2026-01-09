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

  // Sección abierta
  openSection: string = '';

  // Modal de video
  showVideoModal: boolean = false;

  // Credenciales de prueba
  private validUsername = 'prueba';
  private validPassword = 'prueba123';

  // Base de datos de cursos
  private cursosDB: { [key: string]: CursoData } = {
    'basic-training': {
      id: 'basic-training',
      titulo: 'BASIC TRAINING',
      descripcion: 'Fundamentos esenciales para dominar el arte de la barbería profesional.',
      teoria: {
        id: 'basic-teoria',
        titulo: 'Fundamentos de la Barbería',
        duracion: '45:00',
        thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      practicas: [
        { id: 'basic-p1', titulo: 'Técnicas Básicas', duracion: '15:30', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'basic-p2', titulo: 'Manejo de Herramientas', duracion: '18:45', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'basic-p3', titulo: 'Corte con Máquina', duracion: '20:00', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        { id: 'basic-p4', titulo: 'Acabados Profesionales', duracion: '16:20', thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
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
      this.openSection = '';
      this.showVideoModal = false;
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
        this.cdr.detectChanges();
      }, 2500);
    } else {
      this.loginError = 'Credenciales incorrectas';
    }
  }

  toggleSection(section: string) {
    this.openSection = this.openSection === section ? '' : section;
  }

  playVideo(video: Video) {
    this.selectedVideo = video;
    this.showVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showVideoModal = false;
    this.selectedVideo = null;
    document.body.style.overflow = 'auto';
  }

  logout() {
    this.isAuthenticated = false;
    this.showWelcome = false;
    this.username = '';
    this.password = '';
    this.selectedVideo = null;
    this.openSection = '';
    this.showVideoModal = false;
  }
}
