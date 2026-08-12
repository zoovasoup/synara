import { NodeLearningWorkspace } from '@/components/node-learning-workspace'

export default async function CourseNodePage({
  params,
}: {
  params: Promise<{ id: string; nodeId: string }>
}) {
  const { id, nodeId } = await params

  return <NodeLearningWorkspace courseId={id} nodeId={nodeId} />
}
