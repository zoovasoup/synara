import { CourseRoadmap } from '@/components/course-roadmap'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <CourseRoadmap courseId={id} />
}
