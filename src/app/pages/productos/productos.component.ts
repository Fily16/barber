import { Component, OnInit } from '@angular/core';
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

  constructor(private courseService: CourseService) {}

  ngOnInit() {
    this.loadCoverVideo();
  }

  private loadCoverVideo(): void {
    this.courseService.getCourseCover('basic-training').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const videoId = response.data.videoUrl;
          this.coverVideoUrl = `https://iframe.mediadelivery.net/embed/590927/${videoId}?autoplay=true&loop=true&muted=true&preload=true&responsive=true&controls=false`;
          this.coverLoaded = true;
        }
      },
      error: () => {
        this.coverLoaded = false;
      }
    });
  }
}
