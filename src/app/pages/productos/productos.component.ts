import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { CourseService } from '../../core/services';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [RouterLink, CommonModule, SafeUrlPipe],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  coverVideoUrl: string | null = null;
  coverLoaded: boolean = false;

  constructor(private courseService: CourseService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCoverVideo();
  }

  private loadCoverVideo(): void {
    console.log('[COVER] Loading cover video...');
    this.courseService.getCourseCover('basic-training').subscribe({
      next: (response) => {
        console.log('[COVER] Response received:', response);
        console.log('[COVER] success:', response.success, 'data:', response.data);
        if (response.success && response.data) {
          const videoId = response.data.videoUrl;
          console.log('[COVER] videoId:', videoId);
          this.coverVideoUrl = `https://iframe.mediadelivery.net/embed/590927/${videoId}?autoplay=true&loop=true&muted=true&preload=true&responsive=true&controls=false`;
          this.coverLoaded = true;
          this.cdr.detectChanges();
          console.log('[COVER] coverLoaded set to true, URL:', this.coverVideoUrl);
        }
      },
      error: (err) => {
        console.error('[COVER] Error loading cover:', err);
        this.coverLoaded = false;
      }
    });
  }
}
