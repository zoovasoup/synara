"use client";

import * as React from "react";

import type { UseQueryResult } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
	LessonSurface,
	type ChatMessage,
	type CourseNode,
	type LessonContent,
} from "@/components/course-workspace-sections";
import { useActiveStudyAttempt } from "@/hooks/use-active-study-attempt";
import {
	consumeCurrentNodeBacktrack,
	getValidationNavigationIntent,
	markCurrentLessonExit,
} from "@/lib/roadmap-navigation";
import {
	runRecalibrationOrchestration,
	type RecalibrationResult,
} from "@/lib/recalibration-orchestration";
import { useTRPC } from "@/utils/trpc";
import { Button, buttonVariants } from "@gemastik/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gemastik/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@gemastik/ui/components/field";
import { Input } from "@gemastik/ui/components/input";
import { ScrollArea } from "@gemastik/ui/components/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gemastik/ui/components/sheet";
import { Skeleton } from "@gemastik/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@gemastik/ui/components/tabs";
import { cn } from "@gemastik/ui/lib/utils";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	CircleCheckBigIcon,
	LoaderCircleIcon,
	RefreshCwIcon,
	SendIcon,
} from "lucide-react";
import { toast } from "sonner";

type CourseDetail = {
	id: string;
	goalDescription: string;
	currentStatus:
		| "active"
		| "completed"
		| "recalibrating"
		| "needs_recalibration"
		| null;
	nodes: CourseNode[];
};

type SocraticSession = {
	id: string;
	chatHistory: ChatMessage[];
	competencyScore: number | null;
	stumbleCount: number;
	sentimentScore: number;
};

function getValidationPrompt(nodeTitle: string) {
	return `Explain ${nodeTitle} in your own words, describe how you would apply it, or answer the Validator's follow-up questions.`;
}

function MessageThread({
	messages,
	emptyMessage,
	pendingMessage,
	assistantLabel,
}: {
	messages: ChatMessage[];
	emptyMessage: string;
	pendingMessage: string | null;
	assistantLabel: string;
}) {
	return (
		<div className="flex flex-col gap-4" aria-live="polite">
			{messages.length > 0 ? (
				messages.map((message, index) => (
					<div
						key={`${message.role}-${index}`}
						className={cn(
							"flex flex-col gap-1",
							message.role === "user" ? "items-end" : "items-start",
						)}
					>
						<span className="text-xs font-medium text-muted-foreground">
							{message.role === "user" ? "You" : assistantLabel}
						</span>
						<div
							className={cn(
								"max-w-[92%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-6",
								message.role === "user"
									? "bg-primary/12 text-foreground"
									: "bg-muted/55 text-foreground",
							)}
						>
							{message.content}
						</div>
					</div>
				))
			) : emptyMessage ? (
				<p className="px-1 py-6 text-sm leading-6 text-muted-foreground">
					{emptyMessage}
				</p>
			) : null}
			{pendingMessage ? (
				<div className="flex justify-start" role="status">
					<div className="flex max-w-[92%] items-center gap-2 rounded-lg bg-muted/55 px-3.5 py-2.5 text-sm text-muted-foreground">
						<LoaderCircleIcon
							className="size-4 animate-spin"
							aria-hidden="true"
						/>
						{pendingMessage}
					</div>
				</div>
			) : null}
		</div>
	);
}

export function NodeLearningWorkspace({
	courseId,
	nodeId,
}: {
	courseId: string;
	nodeId: string;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [draftTutorMessage, setDraftTutorMessage] = React.useState("");
	const [draftValidationMessage, setDraftValidationMessage] =
		React.useState("");
	const [mentalEffort, setMentalEffort] = React.useState(5);
	const [supportMode, setSupportMode] = React.useState<
		"tutor" | "validation" | null
	>(null);
	const [completionConfirmed, setCompletionConfirmed] = React.useState(false);
	const [recalibrationError, setRecalibrationError] = React.useState<
		string | null
	>(null);
	const recalibrationInFlight =
		React.useRef<Promise<RecalibrationResult> | null>(null);
	const automaticRecalibrationStarted = React.useRef(false);
	const consumedBacktrackNodeId = React.useRef<string | null>(null);
	const roadmapHref = `/dashboard/courses/${courseId}` as Route;

	const courseQuery = useQuery(
		trpc.learning.getById.queryOptions({ id: courseId }),
	) as UseQueryResult<CourseDetail, Error>;
	const selectedNode =
		courseQuery.data?.nodes.find((node) => node.id === nodeId) ?? null;
	const currentNode =
		courseQuery.data?.nodes.find(
			(node) => node.progressionState === "current",
		) ?? null;
	const roadmapStatus = courseQuery.data?.currentStatus ?? "active";
	const nodeIsAccessible = Boolean(
		selectedNode && selectedNode.progressionState !== "locked",
	);

	const lessonContentQuery = useQuery(
		trpc.learning.getNodeContent.queryOptions({ roadmapId: courseId, nodeId }),
	) as UseQueryResult<{ nodeId: string; lessonContent: LessonContent }, Error>;
	const tutorSessionQuery = useQuery({
		...trpc.learning.getTutorSession.queryOptions(
			nodeIsAccessible ? { nodeId } : skipToken,
		),
		enabled: nodeIsAccessible,
	}) as UseQueryResult<ChatMessage[], Error>;
	const socraticSessionQuery = useQuery({
		...trpc.validation.getSocraticSession.queryOptions(
			nodeIsAccessible ? { nodeId } : skipToken,
		),
		enabled: nodeIsAccessible,
	}) as UseQueryResult<SocraticSession | null, Error>;

	const tutorChat = useMutation(trpc.learning.askTutor.mutationOptions());
	const validationChat = useMutation(
		trpc.validation.submitSocratic.mutationOptions(),
	);
	const recalibration = useMutation(
		trpc.learning.recalibrate.mutationOptions(),
	);
	const { clearAttempt, completeAttempt, getSnapshot, recordBacktrack } =
		useActiveStudyAttempt({
			nodeId:
				selectedNode?.progressionState === "current" ? selectedNode.id : null,
			persistenceKey: `synara:study-attempt:${courseId}`,
			isTracking: Boolean(
				selectedNode?.progressionState === "current" &&
				lessonContentQuery.isSuccess &&
				!validationChat.isPending &&
				roadmapStatus === "active" &&
				!recalibration.isPending &&
				!recalibrationError,
			),
		});

	React.useEffect(() => {
		setMentalEffort(5);
		setCompletionConfirmed(false);
	}, [nodeId]);

	React.useEffect(() => {
		if (
			!selectedNode ||
			selectedNode.progressionState !== "current" ||
			!lessonContentQuery.isSuccess ||
			consumedBacktrackNodeId.current === selectedNode.id
		) {
			return;
		}

		consumedBacktrackNodeId.current = selectedNode.id;
		if (
			consumeCurrentNodeBacktrack({
				storage: window.sessionStorage,
				courseId,
				currentNodeId: selectedNode.id,
			})
		) {
			recordBacktrack();
		}
	}, [courseId, lessonContentQuery.isSuccess, recordBacktrack, selectedNode]);

	const refreshCourseData = React.useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.learning.getById.queryKey({ id: courseId }),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.learning.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.learning.getDashboard.queryKey(),
			}),
		]);
	}, [courseId, queryClient, trpc]);

	const adjustLearningPath = React.useCallback(async () => {
		setRecalibrationError(null);

		try {
			const result = await runRecalibrationOrchestration({
				inFlight: recalibrationInFlight,
				recalibrate: async () =>
					await recalibration.mutateAsync({ roadmapId: courseId }),
				refresh: refreshCourseData,
				onComplete: () => {
					clearAttempt();
					setSupportMode(null);
					router.push(roadmapHref);
				},
			});

			toast.success("Your learning path was adjusted.", {
				description: "Review the updated roadmap to continue.",
			});
			return result;
		} catch {
			const message = "We couldn't adjust the learning path yet. Try again.";
			setRecalibrationError(message);
			await refreshCourseData().catch(() => undefined);
			toast.error(message);
			return null;
		}
	}, [
		clearAttempt,
		courseId,
		recalibration,
		refreshCourseData,
		roadmapHref,
		router,
	]);

	React.useEffect(() => {
		if (roadmapStatus === "active") {
			automaticRecalibrationStarted.current = false;
			return;
		}

		if (
			roadmapStatus === "needs_recalibration" &&
			!recalibrationError &&
			!automaticRecalibrationStarted.current
		) {
			automaticRecalibrationStarted.current = true;
			void adjustLearningPath();
		}
	}, [adjustLearningPath, recalibrationError, roadmapStatus]);

	const handleBackToRoadmap = () => {
		if (selectedNode?.progressionState !== "current") return;
		markCurrentLessonExit({
			storage: window.sessionStorage,
			courseId,
			currentNodeId: selectedNode.id,
			currentOrderIndex: selectedNode.orderIndex,
		});
	};

	const currentNodeWritesPaused = Boolean(
		selectedNode?.progressionState === "current" &&
		(recalibration.isPending || roadmapStatus === "recalibrating"),
	);

	const handleSendTutorMessage = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		if (!selectedNode || tutorChat.isPending || currentNodeWritesPaused) return;

		const message = draftTutorMessage.trim();
		if (!message) return;

		setDraftTutorMessage("");
		try {
			const result = await tutorChat.mutateAsync({
				roadmapId: courseId,
				nodeId,
				message,
			});
			queryClient.setQueryData(
				trpc.learning.getTutorSession.queryKey({ nodeId }),
				result.chatHistory,
			);
		} catch {
			toast.error("Unable to get a Tutor response. Try again.");
			setDraftTutorMessage(message);
		}
	};

	const handleSendValidationMessage = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		if (
			!selectedNode ||
			validationChat.isPending ||
			recalibration.isPending ||
			recalibrationError ||
			roadmapStatus !== "active"
		)
			return;

		const message = draftValidationMessage.trim();
		if (!message) return;

		setDraftValidationMessage("");
		const attempt = getSnapshot();

		try {
			const result = await validationChat.mutateAsync({
				nodeId,
				message,
				effortScore: mentalEffort,
				...attempt,
			});

			completeAttempt();
			setMentalEffort(5);
			await queryClient.invalidateQueries({
				queryKey: trpc.validation.getSocraticSession.queryKey({ nodeId }),
			});

			const navigationIntent = getValidationNavigationIntent({
				competencyScore: result.competency_score,
				recalibrationRequired: result.recalibrationRequired,
			});

			if (navigationIntent === "roadmap_after_recalibration") {
				toast.message(
					"This step is taking more effort than expected. We're adjusting your learning path.",
				);
				await adjustLearningPath();
				return;
			}

			await refreshCourseData();
			if (result.competency_score >= 80) {
				clearAttempt();
				setCompletionConfirmed(true);
				setSupportMode(null);
				toast.success("Step completed", {
					description: "Return to the roadmap to see what is available next.",
				});
			} else {
				toast.message("Review this concept once more", {
					description:
						"Use the feedback, revisit the lesson, and explain the idea again when ready.",
				});
			}
		} catch {
			toast.error("Unable to validate this step. Try again.");
			setDraftValidationMessage(message);
		}
	};

	if (courseQuery.isPending || lessonContentQuery.isPending) {
		return (
			<div className="flex min-h-0 flex-1 overflow-y-auto">
				<AuthenticatedPageContainer className="flex flex-col gap-4 py-4">
					<p className="text-sm font-medium" role="status">
						Preparing this lesson…
					</p>
					<Skeleton className="min-h-72 w-full  flex-1" />
				</AuthenticatedPageContainer>
			</div>
		);
	}

	if (courseQuery.isError || !selectedNode || lessonContentQuery.isError) {
		return (
			<div className="flex min-h-0 flex-1 overflow-y-auto">
				<AuthenticatedPageContainer className="flex flex-col gap-4 py-5">
					<Link
						href={roadmapHref}
						className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeftIcon className="size-4" aria-hidden="true" />
						Back to roadmap
					</Link>
					<Card className="border-destructive/40">
						<CardHeader>
							<CardTitle>This step is not available</CardTitle>
							<CardDescription>
								It may be locked, missing, or outside this course. Return to the
								roadmap to choose an accessible step.
							</CardDescription>
						</CardHeader>
					</Card>
				</AuthenticatedPageContainer>
			</div>
		);
	}

	const tutorMessages = tutorSessionQuery.data ?? [];
	const validationMessages = socraticSessionQuery.data?.chatHistory ?? [];
	const latestCompetency = socraticSessionQuery.data?.competencyScore ?? null;
	const adaptiveState =
		recalibration.isPending ||
		roadmapStatus === "recalibrating" ||
		(roadmapStatus === "needs_recalibration" && !recalibrationError)
			? "pending"
			: recalibrationError
				? "error"
				: null;

	return (
		<div className="flex min-h-0 flex-1 overflow-y-auto">
			<AuthenticatedPageContainer className="flex flex-col gap-4 py-4 lg:py-5">
				<div className="flex w-full  shrink-0 items-center gap-3">
					<Link
						href={roadmapHref}
						onClick={handleBackToRoadmap}
						className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<ArrowLeftIcon className="size-4" aria-hidden="true" />
						Back to roadmap
					</Link>
				</div>

				{completionConfirmed ? (
					<div
						className="flex w-full  flex-col gap-3 rounded-lg bg-success/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						role="status"
						aria-live="polite"
					>
						<div>
							<p className="text-sm font-semibold">Step completed</p>
							<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
								You are ready for the next step.
							</p>
						</div>
						<Link
							href={roadmapHref}
							className={cn(
								buttonVariants({ variant: "outline" }),
								"w-full sm:w-auto",
							)}
						>
							Back to roadmap
						</Link>
					</div>
				) : null}

				{adaptiveState ? (
					<div
						className="flex w-full  items-start justify-between gap-3 rounded-lg bg-attention/10 px-4 py-3"
						role={adaptiveState === "error" ? "alert" : "status"}
						aria-live="polite"
					>
						<div className="flex items-start gap-3">
							{adaptiveState === "pending" ? (
								<LoaderCircleIcon
									className="mt-0.5 size-4 animate-spin text-primary"
									aria-hidden="true"
								/>
							) : null}
							<div>
								<p className="text-sm font-medium">
									{adaptiveState === "pending"
										? "Adjusting your learning path…"
										: "We couldn't adjust the learning path yet."}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{adaptiveState === "pending"
										? "Mastery controls are paused while a more guided route is prepared."
										: "Try the adjustment again when you are ready."}
								</p>
							</div>
						</div>
						{adaptiveState === "error" ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => void adjustLearningPath()}
								disabled={recalibration.isPending}
							>
								<RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
								Try again
							</Button>
						) : null}
					</div>
				) : null}

				<div className="flex w-full  flex-none">
					<LessonSurface
						selectedNode={selectedNode}
						nodeCount={courseQuery.data.nodes.length}
						lessonContent={lessonContentQuery.data.lessonContent}
						isPending={false}
						errorMessage={null}
						onOpenTutor={() => setSupportMode("tutor")}
						onOpenValidation={() => setSupportMode("validation")}
						validationDisabled={
							roadmapStatus !== "active" ||
							recalibration.isPending ||
							Boolean(recalibrationError)
						}
					/>
				</div>
			</AuthenticatedPageContainer>

			<Sheet
				open={supportMode !== null}
				onOpenChange={(open) => !open && setSupportMode(null)}
			>
				<SheetContent
					side="right"
					className="w-full overscroll-contain p-0 sm:max-w-lg"
				>
					<SheetHeader className="shrink-0 border-b border-border/70 px-5 py-5 pr-14 sm:px-6">
						<SheetTitle className="text-lg font-semibold tracking-tight">
							{supportMode === "validation"
								? "Check your understanding"
								: "Tutor"}
						</SheetTitle>
						<SheetDescription>
							{supportMode === "validation"
								? "Explain the idea in your own words when you are ready to continue."
								: "Help me understand this step."}
						</SheetDescription>
					</SheetHeader>
					<Tabs
						value={supportMode ?? "tutor"}
						onValueChange={(value) =>
							setSupportMode(value as "tutor" | "validation")
						}
						className="flex min-h-0 flex-1 flex-col gap-0"
					>
						<TabsList variant="line" className="mx-5 mt-3 w-fit gap-3 sm:mx-6">
							<TabsTrigger value="tutor">Tutor</TabsTrigger>
							<TabsTrigger value="validation">Validation</TabsTrigger>
						</TabsList>

						{adaptiveState ? (
							<div
								className="mx-5 mt-3 rounded-md bg-attention/10 p-3 sm:mx-6"
								role={adaptiveState === "error" ? "alert" : "status"}
								aria-live="polite"
							>
								<p className="text-sm font-medium">
									{adaptiveState === "pending"
										? "Adjusting your learning path…"
										: "We couldn't adjust the learning path yet."}
								</p>
							</div>
						) : null}

						<TabsContent
							value="tutor"
							className="flex min-h-0 flex-1 flex-col pt-4"
						>
							<ScrollArea className="min-h-0 flex-1">
								<div className="px-5 pb-4 pr-7 sm:px-6 sm:pr-8">
									{tutorSessionQuery.isError ? (
										<p
											role="alert"
											className="rounded-md border border-destructive/40 p-3 text-sm leading-6 text-muted-foreground"
										>
											Tutor history could not be loaded. Try again shortly.
										</p>
									) : tutorSessionQuery.isPending ? (
										<div className="flex flex-col gap-2" role="status">
											<p className="text-xs text-muted-foreground">
												Loading your Tutor history…
											</p>
											<Skeleton className="h-16 w-full" />
										</div>
									) : (
										<MessageThread
											messages={tutorMessages}
											emptyMessage={`Ask a question about ${selectedNode.title}.`}
											pendingMessage={
												tutorChat.isPending
													? "Thinking through your question…"
													: null
											}
											assistantLabel="Tutor"
										/>
									)}
								</div>
							</ScrollArea>
							<form
								onSubmit={handleSendTutorMessage}
								className="mt-auto flex flex-col gap-3 border-t border-border/70 bg-popover p-5 sm:p-6"
							>
								<label htmlFor="tutor-message" className="text-sm font-medium">
									Your question
								</label>
								<textarea
									id="tutor-message"
									name="tutor-message"
									autoComplete="off"
									value={draftTutorMessage}
									onChange={(event) => setDraftTutorMessage(event.target.value)}
									placeholder={`Ask about ${selectedNode.title}…`}
									disabled={tutorChat.isPending || currentNodeWritesPaused}
									className="min-h-24 w-full resize-y rounded-lg border bg-muted/25 px-3.5 py-3 text-sm leading-6 outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
								/>
								<div className="flex justify-end">
									<Button
										type="submit"
										disabled={
											!draftTutorMessage.trim() ||
											tutorChat.isPending ||
											currentNodeWritesPaused
										}
									>
										<SendIcon data-icon="inline-start" aria-hidden="true" />
										Send question
									</Button>
								</div>
							</form>
						</TabsContent>

						<TabsContent
							value="validation"
							className="flex min-h-0 flex-1 flex-col pt-4"
						>
							<ScrollArea className="min-h-0 flex-1">
								<div className="flex flex-col gap-5 px-5 pb-4 pr-7 sm:px-6 sm:pr-8">
									<p className="border-l-2 border-primary/45 pl-4 text-sm leading-6 text-foreground">
										{getValidationPrompt(selectedNode.title)}
									</p>
									{latestCompetency !== null ? (
										<div
											className={cn(
												"rounded-lg p-4",
												latestCompetency >= 80
													? "bg-success/10"
													: "bg-attention/10",
											)}
											aria-live="polite"
										>
											<p className="text-sm font-medium">
												{latestCompetency >= 80
													? "Ready to continue"
													: "Review this concept once more"}
											</p>
											<p className="mt-1.5 text-xs text-muted-foreground">
												Understanding estimate: {Math.round(latestCompetency)} /
												100
											</p>
										</div>
									) : null}
									{socraticSessionQuery.isError ? (
										<p
											role="alert"
											className="rounded-md bg-destructive/10 p-3 text-sm leading-6 text-muted-foreground"
										>
											Validation history could not be loaded. Try opening this
											step again.
										</p>
									) : socraticSessionQuery.isPending ? (
										<Skeleton className="h-16 w-full" />
									) : (
										<MessageThread
											messages={validationMessages}
											emptyMessage=""
											pendingMessage={
												validationChat.isPending
													? "Considering your explanation…"
													: null
											}
											assistantLabel="Validator"
										/>
									)}
								</div>
							</ScrollArea>

							{selectedNode.isCompleted ? (
								<div className="mt-auto border-t border-border/70 p-5 sm:p-6">
									<p className="text-sm font-medium">This step is complete.</p>
									<p className="mt-1 text-sm leading-6 text-muted-foreground">
										Review the lesson or ask the Tutor whenever you need another
										explanation.
									</p>
								</div>
							) : (
								<form
									onSubmit={handleSendValidationMessage}
									className="mt-auto flex flex-col gap-4 border-t border-border/70 bg-popover p-5 sm:p-6"
								>
									<label
										htmlFor="validation-message"
										className="text-sm font-medium"
									>
										Your explanation
									</label>
									<textarea
										id="validation-message"
										name="validation-message"
										autoComplete="off"
										value={draftValidationMessage}
										onChange={(event) =>
											setDraftValidationMessage(event.target.value)
										}
										placeholder="Explain your understanding in your own words…"
										disabled={
											validationChat.isPending ||
											recalibration.isPending ||
											Boolean(recalibrationError) ||
											roadmapStatus !== "active"
										}
										className="min-h-28 w-full resize-y rounded-lg border bg-muted/25 px-3.5 py-3 text-sm leading-6 outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
									/>
									<FieldGroup className="gap-3">
										<Field>
											<div className="flex items-center justify-between gap-3">
												<FieldLabel htmlFor="mental-effort">
													Mental effort
												</FieldLabel>
												<span className="font-mono text-xs tabular-nums text-muted-foreground">
													{mentalEffort} / 9
												</span>
											</div>
											<FieldDescription>
												How mentally demanding did this step feel?
											</FieldDescription>
											<Input
												id="mental-effort"
												name="mental-effort"
												type="range"
												min={1}
												max={9}
												step={1}
												value={mentalEffort}
												onChange={(event) =>
													setMentalEffort(Number(event.target.value))
												}
												disabled={
													validationChat.isPending ||
													recalibration.isPending ||
													Boolean(recalibrationError) ||
													roadmapStatus !== "active"
												}
												aria-valuetext={`${mentalEffort} out of 9`}
												className="h-5 cursor-pointer appearance-auto border-0 bg-transparent px-0 py-0 accent-primary shadow-none"
											/>
											<FieldDescription className="flex justify-between gap-3">
												<span>Low</span>
												<span>High</span>
											</FieldDescription>
										</Field>
									</FieldGroup>
									<Button
										type="submit"
										size="lg"
										disabled={
											!draftValidationMessage.trim() ||
											validationChat.isPending ||
											recalibration.isPending ||
											Boolean(recalibrationError) ||
											roadmapStatus !== "active"
										}
									>
										<CircleCheckBigIcon
											data-icon="inline-start"
											aria-hidden="true"
										/>
										Validate understanding
									</Button>
								</form>
							)}
						</TabsContent>
					</Tabs>
				</SheetContent>
			</Sheet>
		</div>
	);
}
