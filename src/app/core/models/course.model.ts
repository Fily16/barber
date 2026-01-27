export type VideoType = 'THEORY' | 'PRACTICE';
export type PlanType = 'UNLIMITED' | 'TEMPORAL';

export interface VideoResponse {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  type: VideoType;
  orderIndex: number;
}

export interface CourseResponse {
  id: number;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  active: boolean;
  orderIndex: number;
  totalVideos: number;
  theoryVideos: VideoResponse[];
  practiceVideos: VideoResponse[];
}

export interface UserCourseResponse {
  id: number;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  planType: PlanType;
  expiresAt: string | null;
  active: boolean;
  accessValid: boolean;
  assignedAt: string;
}
