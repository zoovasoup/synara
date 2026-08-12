"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Button } from "@gemastik/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gemastik/ui/components/card";
import { Badge } from "@gemastik/ui/components/badge";
import { toast } from "sonner";
import {
	SendIcon,
	Loader2,
	AlertCircle,
	CheckCircle2,
	MessageSquareQuote,
	Activity,
} from "lucide-react";

export default function SocraticTestPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [draftMessage, setDraftMessage] = React.useState("");

	// ID Node Socratic Flask lo
	const nodeId = "0ZDPF48f_0c40YWB4jVzv";

	const socraticMutation = useMutation(
		trpc.validation.submitSocratic.mutationOptions(),
	);

	const handleTest = async (e: React.FormEvent) => {
		e.preventDefault();
		const msg = draftMessage.trim();
		if (!msg || socraticMutation.isPending) return;

		try {
			await socraticMutation.mutateAsync({
				nodeId: nodeId,
				message: msg,
				attemptId: crypto.randomUUID(),
				activeStudySeconds: 0,
				backtrackDelta: 0,
				effortScore: 5,
			});
			toast.success("Response validated!");
			// Refresh data roadmap kalau perlu biar status 'isCompleted' keliatan berubah
			queryClient.invalidateQueries();
			setDraftMessage("");
		} catch (err: any) {
			console.error("Mutation Error:", err);
			toast.error(err.message || "Query failed. Cek terminal console!");
		}
	};

	const result = socraticMutation.data;

	return (
		<div className="container max-w-3xl py-12 space-y-8">
			<div className="flex items-center gap-3 border-b pb-4">
				<div className="p-2 bg-primary/10 rounded-lg">
					<Activity className="text-primary size-6" />
				</div>
				<div>
					<h1 className="text-2xl font-bold">Gradio Socratic Debugger</h1>
					<p className="text-sm text-muted-foreground">
						Testing: Demystifying Web Backends & Flask's Purpose
					</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-[1fr_320px]">
				{/* INPUT SECTION */}
				<div className="space-y-4">
					<Card className="shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<MessageSquareQuote className="size-4" />
								Chat Simulation
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleTest} className="space-y-4">
								<textarea
									value={draftMessage}
									onChange={(e) => setDraftMessage(e.target.value)}
									placeholder="Explain why Flask is a microframework..."
									className="min-h-[150px] w-full resize-none rounded-md border bg-muted/30 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
								/>
								<Button
									type="submit"
									className="w-full"
									disabled={!draftMessage.trim() || socraticMutation.isPending}
								>
									{socraticMutation.isPending ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<SendIcon className="mr-2 h-4 w-4" />
									)}
									Evaluate Pemahaman
								</Button>
							</form>
						</CardContent>
					</Card>

					{/* ERROR DISPLAY */}
					{socraticMutation.error && (
						<div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-3">
							<AlertCircle className="size-5 shrink-0" />
							<div>
								<p className="font-bold">Database Error</p>
								<p className="font-mono text-xs mt-1">
									{socraticMutation.error.message}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* METRICS SECTION */}
				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm uppercase text-muted-foreground font-bold tracking-wider">
								Real-time Metrics
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">
									Competency Score
								</p>
								<div className="flex items-end gap-2">
									<span className="text-3xl font-black">
										{result?.competency_score ?? "--"}
									</span>
									<span className="text-muted-foreground text-sm mb-1">
										/ 100
									</span>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 border-t pt-4">
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground">
										Stumbles
									</p>
									<p className="text-lg font-semibold">
										{result?.stumble_count ?? 0}
									</p>
								</div>
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground">
										Sentiment
									</p>
									<p className="text-lg font-semibold">
										{result?.sentiment_score ?? 0}
									</p>
								</div>
							</div>

							{result && (
								<div
									className={`mt-4 p-3 rounded-md border text-center font-bold text-xs ${result.competency_score >= 80 ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border"}`}
								>
									{result.competency_score >= 80 ? "COMPLETED" : "IN PROGRESS"}
								</div>
							)}
						</CardContent>
					</Card>

					{result?.recalibrationRequired && (
						<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 animate-pulse">
							<div className="flex items-center gap-2 mb-1">
								<AlertCircle className="size-4" />
								<span className="text-xs font-bold">SYSTEM ALERT</span>
							</div>
							<p className="text-[11px] leading-relaxed">
								User is stuck or frustrated. Needs manual recalibration.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* AI FEEDBACK AREA */}
			{result && (
				<Card className="border-l-4 border-l-primary bg-primary/5">
					<CardContent className="py-4">
						<h4 className="text-xs font-bold text-primary uppercase mb-2">
							AI Feedback Summary
						</h4>
						<p className="text-sm leading-relaxed italic text-foreground/80">
							"{result.ai_response}"
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
